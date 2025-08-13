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
  requestPayment(request: PaymentRequest, opts?: { signal?: AbortSignal }): Promise<RequestPaymentResult>;
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
  openDeeplink: (opts?: { noNavigate?: boolean }) => void;
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
  private activeFallback: PayButtonParams | null = null;

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
    if (this.api) { this._setInjectedPayButton(params); return; }
    this._setFallbackPayButton(params);
  }

  hidePayButton(): void {
    // Hide custom UI first
    if (this.activeFallback) {
      const prevId = this.activeFallback.request.invoiceId;
      try { this.onFallbackHide?.(); } catch { /* noop */ }
      this.events.emit({ type: 'cancelled', invoiceId: prevId, reason: 'app' });
      this.activeFallback = null;
    } else {
      try { this.onFallbackHide?.(); } catch { /* noop */ }
    }
    this.api?.hidePayButton();
  }

  private _setInjectedPayButton(params: PayButtonParams): void {
    // Delegate validation and UI to the injected wallet implementation
    this.api!.setPayButton(params);
  }

  private _setFallbackPayButton(params: PayButtonParams): void {
    // Handle replacement semantics prior to validation/show
    if (this.activeFallback) {
      const prevId = this.activeFallback.request.invoiceId;
      if (prevId !== params.request.invoiceId) {
        this._cancelActiveFallback('replaced');
      }
    }

    // Validate since no wallet is present
    const validation = validatePayButtonParams(params);
    if (!validation.valid) {
      if (this.activeFallback) {
        this._cancelActiveFallback('app');
      }
      throw new InstantPayInvalidParamsError(validation.error ?? 'INVALID_PARAMS');
    }

    const { url, scheme, bin } = this._buildDeepLink(params.request);
    let handoffStarted = false;

    const openDeeplink = (opts?: { noNavigate?: boolean }) => {
      if (handoffStarted) return;
      handoffStarted = true;
      // Emit click before handoff; check expiry first
      const nowSec = Math.floor(Date.now() / 1000);
      if (params.request.expiresAt && params.request.expiresAt <= nowSec) {
        this._cancelActiveFallback('expired');
        return;
      }
      this.events.emit({ type: 'click', invoiceId: params.request.invoiceId });

      // Force HTTPS deeplink for compatibility; emit handoff, then try new tab
      const openUrl = scheme === 'https' ? url : url.replace(/^ton:\/\//, 'https://app.tonkeeper.com/');
      this.events.emit({ type: 'handoff', invoiceId: params.request.invoiceId, url: openUrl, scheme: 'https' });
      if (!opts?.noNavigate) {
        const win = window.open(openUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          // Defer same-tab navigation enough for event handlers/UI to render
          const navigate = () => { window.location.href = openUrl; };
          try {
            if (typeof requestAnimationFrame === 'function') {
              requestAnimationFrame(() => { setTimeout(navigate, 0); });
            } else {
              setTimeout(navigate, 32);
            }
          } catch {
            setTimeout(navigate, 32);
          }
        }
      }
      // Hide fallback UI after handoff
      try { this.onFallbackHide?.(); } catch { /* noop */ }
      this.activeFallback = null;
    };

    // Emit show and present fallback UI
    this.events.emit({ type: 'show', invoiceId: params.request.invoiceId });
    this.onFallbackShow?.({
      payButtonParams: params,
      deeplinkUrl: url,
      deeplinkScheme: scheme,
      openDeeplink,
      invoiceBocBase64: bin
    });
    this.activeFallback = params;
  }

  private _cancelActiveFallback(reason: CancelReason): void {
    if (!this.activeFallback) return;
    const invoiceId = this.activeFallback.request.invoiceId;
    try { this.onFallbackHide?.(); } catch { /* noop */ }
    this.events.emit({ type: 'cancelled', invoiceId, reason });
    this.activeFallback = null;
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
    // TODO: use decimals from asset
    const assetDecimals = request.asset.type === 'ton' ? 1e9 : 1e6;
    const nanoAmount = Number(request.amount) * assetDecimals;
    params.set('amount', nanoAmount.toString());
    params.set('bin', bin);
    // if (request.expiresAt) params.set('exp', String(request.expiresAt));

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
