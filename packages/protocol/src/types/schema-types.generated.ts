/* Generated from JSON Schemas in schemas/ — do not edit */

/**
 * Transferable asset used by InstantPay: native TON or a Jetton token. Includes display symbol and decimals for amount formatting.
 */
export type Asset =
  | {
      /**
       * Asset type discriminator: native TON coin.
       */
      type: 'ton';
      /**
       * Short ticker symbol for the asset (e.g., 'TON').
       */
      symbol: string;
      /**
       * Number of fractional decimal places used for TON amounts (fixed to 9).
       */
      decimals: 9;
    }
  | {
      /**
       * Asset type discriminator: Jetton token.
       */
      type: 'jetton';
      /**
       * Jetton master contract address (workchain-friendly string).
       */
      master: string;
      /**
       * Short ticker symbol for the token (e.g., 'USDT').
       */
      symbol: string;
      /**
       * Number of fractional decimal places used for the token amounts.
       */
      decimals: number;
    };
/**
 * Union of events emitted by the wallet to the dApp during the InstantPay lifecycle.
 */
export type InstantPayEvent =
  | {
      /**
       * Payment UI became visible to the user.
       */
      type: 'show';
      request: PaymentRequest;
    }
  | {
      /**
       * User clicked the Pay button.
       */
      type: 'click';
      request: PaymentRequest;
    }
  | {
      /**
       * Payment was sent; BOC is provided.
       */
      type: 'sent';
      request: PaymentRequest;
      /**
       * Bag of Cells (serialized transaction).
       */
      boc: string;
    }
  | {
      /**
       * Payment flow was cancelled.
       */
      type: 'cancelled';
      request: PaymentRequest;
      /**
       * Optional cancellation reason.
       */
      reason?: 'user' | 'app' | 'wallet' | 'replaced' | 'expired' | 'unsupported_env';
    };

export interface SchemasIndex {
  Asset?: Asset;
  PaymentRequest?: PaymentRequest;
  InstantPayEvent?: InstantPayEvent;
  Handshake?: Handshake;
  PayButtonParams?: PayButtonParams;
}
/**
 * dApp's request to perform a payment via InstantPay.
 */
export interface PaymentRequest {
  /**
   * Payment amount as a decimal string with up to 18 fractional digits.
   */
  amount: string;
  /**
   * Recipient address (workchain-friendly string).
   */
  recipient: string;
  /**
   * Unique payment identifier provided by the dApp.
   */
  invoiceId: string;
  asset: Asset;
  /**
   * Optional ADNL address used for network-level features.
   */
  adnlAddress?: string;
  /**
   * Optional UNIX timestamp (seconds) after which the request expires.
   */
  expiresAt?: number;
}
/**
 * Provider capabilities configuration for InstantPay.
 */
export interface Handshake {
  /**
   * Semantic protocol version supported by the provider (e.g., '1.0.0').
   */
  protocolVersion: string;
  /**
   * Normative provider capabilities (always present, even if empty).
   */
  capabilities: {
    /**
     * Supports programmatic payment flow without a button.
     */
    requestPayment: boolean;
    /**
     * Supports querying the status of an active operation.
     */
    getActive: boolean;
    /**
     * Instant Pay capability; if absent, Instant Pay is unavailable.
     */
    instant?: {
      /**
       * Per-asset limits in the same units as PaymentRequest.amount. Empty array means instant is effectively unavailable.
       */
      limits: {
        asset: Asset;
        /**
         * Per-operation amount limit in the same units as PaymentRequest.amount.
         */
        limit: string;
      }[];
    };
  };
}
/**
 * Parameters for rendering a wallet-controlled Pay Button in the dApp UI.
 */
export interface PayButtonParams {
  request: PaymentRequest;
  /**
   * Short imperative label for the button.
   */
  label: 'buy' | 'unlock' | 'use' | 'get' | 'open' | 'start' | 'retry' | 'show' | 'play' | 'try';
  /**
   * Hint for the wallet to enable InstantPay flow when possible.
   */
  instantPay?: boolean;
}
