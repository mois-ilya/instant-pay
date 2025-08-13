/**
 * Manual protocol types for InstantPay API surface
 *
 * These are stable, hand-written TypeScript types that complement
 * the auto-generated types in types/generated.ts.
 */

import type { InstantPayEvent, PayButtonParams, PaymentRequest } from './generated';

// Semver string, e.g. "1.0.0"
export type InstantPaySemver = `${number}.${number}.${number}`;

// dApp metadata provided during handshake
export interface AppMeta {
  name: string;
  url?: string;
  iconUrl?: string;
}

// Optional wallet capability description (non-normative)
export interface WalletCapabilities {
  instant: Array<{
    asset: { type: 'ton' } | { type: 'jetton'; master: string };
    /** Per-operation limit in the same units as PaymentRequest.amount */
    limit: string;
  }>;
}

// Handshake result from wallet to dApp
export interface Handshake {
  protocolVersion: InstantPaySemver;
  wallet: { name: string };
  /** Available capabilities (optional) */
  capabilities?: WalletCapabilities;
}

export type CancelReason = 'user' | 'app' | 'wallet' | 'replaced' | 'expired' | 'unsupported_env';

export type RequestPaymentResult =
  | { status: 'sent'; boc: string }
  | { status: 'cancelled'; reason?: CancelReason };

/**
 * Event emitter interface for InstantPay protocol events.
 * Implemented by wallets and by SDK wrapper.
 */
export interface InstantPayEventEmitter {
  on<E extends InstantPayEvent['type']>(
    type: E,
    fn: (event: Extract<InstantPayEvent, { type: E }>) => void
  ): () => void;

  off<E extends InstantPayEvent['type']>(
    type: E,
    fn: (event: Extract<InstantPayEvent, { type: E }>) => void
  ): void;

  once<E extends InstantPayEvent['type']>(
    type: E,
    fn: (event: Extract<InstantPayEvent, { type: E }>) => void
  ): () => void;
}

/**
 * Wallet-injected API surface available at window.tonkeeper.instantPay
 */
export interface InstantPayAPI {
  readonly protocolVersion: InstantPaySemver;
  handshake(app: AppMeta, require?: { minProtocol?: InstantPaySemver }): Handshake;
  setPayButton(params: PayButtonParams): void;
  hidePayButton(): void;
  requestPayment(
    request: PaymentRequest,
    opts?: { signal?: AbortSignal }
  ): Promise<RequestPaymentResult>;
  getActive(): { invoiceId: string } | null;
  events: InstantPayEventEmitter;
}

