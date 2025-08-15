/**
 * InstantPay SDK per InstantPay 1.0 spec (Button‑First)
 * - Uses injected API when available
 * - Delegates to provided fallbackApi when not injected
 */

import { InstantPayEmitter, type SDKEvent } from './events';
import type {
	PayButtonParams,
	PaymentRequest,
	InstantPayAPI,
	Handshake,
	RequestPaymentResult
} from '@tonkeeper/instantpay-protocol';
import type { InstantPayEventEmitter } from '@tonkeeper/instantpay-protocol';
// No legacy deeplink fallback logic in SDK

// No global Buffer polyfill required here

// All protocol-level types now live in @tonkeeper/instantpay-protocol

// Global window typing
declare global {
	interface Window {
		tonkeeper?: { instantPay?: InstantPayAPI };
	}
}

export interface InstantPayInitOptions {
	/**
	 * If wallet is not injected — use this API instead
	 */
	fallbackApi?: InstantPayProvider;
}

export type InstantPayProvider = {
	setPayButton: InstantPayAPI['setPayButton'];
	hidePayButton: InstantPayAPI['hidePayButton'];
	requestPayment: InstantPayAPI['requestPayment'];
	getActive: InstantPayAPI['getActive'];
	events: InstantPayEventEmitter;
};

const FORWARDED_EVENTS = ['show', 'click', 'sent', 'cancelled'] as const;
export class InstantPaySDK {
  public readonly events: InstantPayEmitter;
  private provider?: Omit<InstantPayProvider, 'events'>;
  private hs?: Handshake;

  constructor(opts?: InstantPayInitOptions) {
    this.events = new InstantPayEmitter();

    // 1) inject: simplest path + early exit
    const injected = window?.tonkeeper?.instantPay;

    if (injected) {
      // Bind methods to preserve the correct `this` context of the injected wallet
      this.provider = {
        setPayButton: injected.setPayButton.bind(injected),
        hidePayButton: injected.hidePayButton.bind(injected),
        requestPayment: injected.requestPayment.bind(injected),
        getActive: injected.getActive.bind(injected),
      };
      this.hs = injected.handshake({ name: this._detectAppName(), url: location.origin });
      this._forwardEvents(injected.events);
      this.events.emit({ type: 'inited', injected: true, handshake: this.hs } satisfies SDKEvent);
      return;
    }

    // 2) fallbackApi: delegate and subscribe, without ready/handshake
    if (opts?.fallbackApi) {
      this.provider = opts.fallbackApi;
      this._forwardEvents(opts.fallbackApi.events);
      this.events.emit({ type: 'inited', injected: false } satisfies SDKEvent);
      return;
    }

    // 3) nothing is available: SDK remains in NOT_SUPPORTED state until methods are called
  }

  get isInjected(): boolean { return !!this.hs; }
  get capabilities(): Handshake['capabilities'] | undefined { return this.hs?.capabilities; }
  get handshake(): Handshake | undefined { return this.hs; }

  setPayButton(params: PayButtonParams): void {
    if (!this.provider) throw new Error('NOT_SUPPORTED');
    this.provider.setPayButton(params);
  }

  hidePayButton(): void {
    if (!this.provider) throw new Error('NOT_SUPPORTED');
    this.provider.hidePayButton();
  }

  async requestPayment(request: PaymentRequest): Promise<RequestPaymentResult> {
    if (!this.provider?.requestPayment) throw new Error('NOT_SUPPORTED');
    return this.provider.requestPayment(request);
  }

  private _forwardEvents(src: InstantPayEventEmitter): void {
    FORWARDED_EVENTS.forEach((type) => src.on(type, (event) => this.events.emit(event)));
  }

  private _detectAppName(): string {
    if (typeof document !== 'undefined' && document.title) return document.title;
    try { return new URL(location.href).host; } catch { return 'InstantPay dApp'; }
  }
}
