/**
 * InstantPay SDK per InstantPay 1.0 spec (Button‑First)
 * - Uses injected API when available
 * - Provides deep-link fallback when not injected
 */

import { InstantPayEmitter } from './events';
import type { InstantPayEventEmitter } from './events';
import type { PayButtonParams, PaymentRequest } from '@tonkeeper/instantpay-protocol';
import { validatePayButtonParams } from './validation';
import { InstantPayInvalidParamsError } from './errors';
import { beginCell } from '@ton/core';
import { Buffer } from 'buffer';

// Ensure global Buffer is available in browsers for dependencies that expect it
// without explicit import (e.g., some parts of @ton/core or userland code)
// Safe no-op in Node where Buffer already exists
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}));
if (!g.Buffer) {
  g.Buffer = Buffer;
}

// Types defined by the protocol (not exported from protocol package)
export type InstantPaySemver = `${number}.${number}.${number}`;

export interface AppMeta {
  name: string;
  url?: string;
  iconUrl?: string;
}

export interface Handshake {
  protocolVersion: InstantPaySemver;
  wallet: { name: string };
  capabilities: WalletCapabilities;
}

// Optional wallet capability description (non-normative, demo/useful extension)
export interface WalletCapabilities {
  instant: Array<{
    asset: { type: 'ton' } | { type: 'jetton'; master: string };
    limit: string;
  }>;
}

export type CancelReason = 'user' | 'app' | 'wallet' | 'replaced' | 'expired' | 'unsupported_env';

export type RequestPaymentResult =
  | { status: 'sent'; boc: string }
  | { status: 'cancelled'; reason?: CancelReason };

// Use emitter interface from events.ts to keep consistent typing

export interface InstantPayAPI {
  readonly protocolVersion: InstantPaySemver;
  handshake(app: AppMeta, require?: { minProtocol?: InstantPaySemver }): Handshake;
  setPayButton(params: PayButtonParams): void;
  hidePayButton(): void;
  requestPayment?(request: PaymentRequest, opts?: { signal?: AbortSignal }): Promise<RequestPaymentResult>;
  getActive(): { invoiceId: string } | null;
  events: InstantPayEventEmitter;
}

// Global window typing
declare global {
  interface Window {
    tonkeeper?: { instantPay?: InstantPayAPI };
  }
}

export interface FallbackContext {
  payButtonParams: PayButtonParams;
  deeplinkUrl: string;
  deeplinkScheme: 'ton' | 'https';
  openDeeplink: () => void;
  invoiceBocBase64: string;
}

export interface InstantPayInitOptions {
  onFallbackShow?: (ctx: FallbackContext) => void;
  onFallbackHide?: () => void;
}

export class InstantPaySDK {
  public readonly events: InstantPayEmitter;
  private api?: InstantPayAPI;
  private hs?: Handshake;
  private onFallbackShow?: (ctx: FallbackContext) => void;
  private onFallbackHide?: () => void;

  constructor(opts?: InstantPayInitOptions) {
    this.events = new InstantPayEmitter();
    this.onFallbackShow = opts?.onFallbackShow;
    this.onFallbackHide = opts?.onFallbackHide;

    const instantPayAPI = window?.tonkeeper?.instantPay;
    if (!instantPayAPI) { return; }

    this.api = instantPayAPI;

    // Synchronous handshake per spec
    this.hs = instantPayAPI.handshake({ name: this._detectAppName(), url: location.origin });

    // Forward wallet events to SDK emitter
    (['ready', 'show', 'click', 'sent', 'cancelled', 'handoff'] as const).forEach((type) => {
        instantPayAPI.events.on(type, (e) => this.events.emit(e));
    });

    // Emit consolidated ready
    this.events.emit({ type: 'ready', handshake: this.hs });
  }

  get isInjected(): boolean { return !!this.api; }
  get handshake(): Handshake | undefined { return this.hs; }

  // Capabilities are provided in handshake

  setPayButton(params: PayButtonParams): void {
    // Inject path: delegate validation to wallet implementation
    if (this.api) {
      this.api.setPayButton(params);
      return;
    }

    // Fallback path: build deep link and provide to callback
    // Validate on fallback since no wallet is present to validate
    const validation = validatePayButtonParams(params);
    if (!validation.valid) {
      throw new InstantPayInvalidParamsError(validation.error ?? 'INVALID_PARAMS');
    }
    const { url, scheme, bin } = this._buildDeepLink(params.request);
    const openDeeplink = () => {
      // mirror wallet semantics: emit click before handoff
      this.events.emit({ type: 'click', invoiceId: params.request.invoiceId });
      window.location.href = url;
      this.events.emit({ type: 'handoff', invoiceId: params.request.invoiceId, url, scheme });
    };

    // hide previous custom UI (if any) before showing a new one
    try { this.onFallbackHide?.(); } catch { /* noop */ }

    // emit 'show' when fallback UI becomes available
    this.events.emit({ type: 'show', invoiceId: params.request.invoiceId });

    this.onFallbackShow?.({
      payButtonParams: params,
      deeplinkUrl: url,
      deeplinkScheme: scheme,
      openDeeplink,
      invoiceBocBase64: bin
    });
  }

  hidePayButton(): void {
    // Hide custom UI first
    try { this.onFallbackHide?.(); } catch { /* noop */ }
    this.api?.hidePayButton();
  }

  async requestPayment(request: PaymentRequest, opts?: { signal?: AbortSignal }): Promise<RequestPaymentResult> {
    if (!this.api?.requestPayment) throw new Error('NOT_SUPPORTED');
    return this.api.requestPayment(request, opts);
  }

  private _buildDeepLink(request: PaymentRequest): { url: string; scheme: 'ton' | 'https'; bin: string } {
    const isMobile = this._isMobile();
    const scheme: 'ton' | 'https' = isMobile ? 'ton' : 'https';
    const base = scheme === 'ton' ? 'ton://' : 'https://app.tonkeeper.com/';

    const params = new URLSearchParams();

    const noneAdnl = request.adnlAddress
        ? beginCell()
            .storeUint(1, 8)
            .storeBuffer(Buffer.from(request.adnlAddress, "hex"))
        : beginCell().storeUint(0, 8);
    
    const uuidBuffer = Buffer.from(request.invoiceId.split('-').join(''), 'hex');
    
    const invoicePayload = beginCell()
        .storeUint(0x7aa23eb5, 32) // INVOICE_OP_CODE (operation identifier)
        .storeBuffer(uuidBuffer)
        .storeBuilder(noneAdnl)
        .endCell();

    const bin = invoicePayload.toBoc().toString("base64");

    if (request.asset.type === 'jetton') params.set('jetton', request.asset.master);
    params.set('amount', request.amount);
    params.set('bin', bin);
    if (request.expiresAt) params.set('exp', String(request.expiresAt));

    const url = `${base}transfer/${request.recipient}?${params.toString()}`;
    return { url, scheme, bin };
  }

  private _isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || '';
    return /android|iphone|ipad|ipod/i.test(ua);
  }

  private _detectAppName(): string {
    if (typeof document !== 'undefined' && document.title) return document.title;
    try { return new URL(location.href).host; } catch { return 'InstantPay dApp'; }
  }
}
