/**
 * Manual protocol types for InstantPay API surface (Injected Wallet API)
 *
 * These are stable, hand-written TypeScript types that complement
 * the auto-generated types from JSON Schemas.
 */

import type { InstantPayEvent, PayButtonParams, PaymentRequest, Handshake, Asset } from './schema-types.generated';

// Semver string, e.g. "1.0.0"
export type InstantPaySemver = `${number}.${number}.${number}`;

// dApp metadata provided during handshake
export interface AppMeta {
  name: string;
  url?: string;
  iconUrl?: string;
}

// Normative provider capabilities
export interface ProviderCapabilities {
  /** Supports programmatic flow without a button */
  requestPayment: boolean;
  /** Supports querying the status of an active operation */
  getActive: boolean;
  /** Instant Pay capability (if omitted — Instant Pay is unavailable) */
  instant?: {
    /** Per-asset limits in the same units as PaymentRequest.amount. Empty array equals unavailable. */
    limits: Array<{ asset: Asset; limit: string }>;
  };
}

// Handshake type is generated from JSON Schemas and imported above.

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
export interface InstantPayAPI extends InstantPayProvider {
  readonly protocolVersion: InstantPaySemver;
  handshake(app: AppMeta, require?: { minProtocol?: InstantPaySemver }): Handshake;
}

/**
 * Provider interface used by SDK adapters (e.g., TonConnect provider)
 * so adapters depend only on Protocol types, not on SDK internals.
 */
export interface InstantPayProvider {
  setPayButton: (params: PayButtonParams) => void;
  hidePayButton: () => void;
  requestPayment: (request: PaymentRequest) => Promise<RequestPaymentResult>;
  getActive: () => { request: PaymentRequest } | null;
  events: InstantPayEventEmitter;
}

