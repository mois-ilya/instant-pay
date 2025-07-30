/**
 * Tonkeeper InstantPay Protocol Types
 * Based on specification v1.0
 */

// Main config interface
export interface InstantPayConfig {
  network: 'mainnet' | 'testnet';
  instantPayLimitTon: string;
  jettons: {
    symbol: string;
    address: string;
    decimals: number;
    instantPayLimit: string;
  }[];
  payLabels: ('buy' | 'unlock' | 'use' | 'get' | 'open' | 'start' | 'retry' | 'show' | 'play' | 'try')[];
}

// Payment button parameters
export interface SetPayButtonParams {
  amount: string;              // decimal string (including fee)
  recipient: string;           // TON address (bounceable)
  label: InstantPayConfig['payLabels'][number];
  invoiceId: string;           // UUID - unique for transaction
  jetton?: string;             // optional: token address
  adnlAddress?: string;        // optional: merchant ADNL
}

// Event types
export type InstantPayEvent =
  | { type: 'click'; invoiceId: string }
  | { type: 'sent'; invoiceId: string; boc: string }
  | { type: 'cancelled'; invoiceId: string };

// Event emitter interface
export interface InstantPayEmitter {
  on<E extends InstantPayEvent['type']>(
    type: E, 
    fn: (e: Extract<InstantPayEvent, {type: E}>) => void
  ): () => void;
  off<E extends InstantPayEvent['type']>(
    type: E, 
    fn: (e: Extract<InstantPayEvent, {type: E}>) => void
  ): void;
}

// Main API interface
export interface InstantPayAPI {
  config: InstantPayConfig;
  setPayButton(params: SetPayButtonParams): void;
  hidePayButton(): void;
  events: InstantPayEmitter;
}

// Error classes
export class InstantPayInvalidParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstantPayInvalidParamsError';
  }
}

export class InstantPayLimitExceededError extends Error {
  invoiceId: string;
  limit: string;

  constructor(message: string, invoiceId: string, limit: string) {
    super(message);
    this.name = 'InstantPayLimitExceededError';
    this.invoiceId = invoiceId;
    this.limit = limit;
  }
}

export class InstantPayConcurrentOperationError extends Error {
  activeInvoiceId: string;

  constructor(message: string, activeInvoiceId: string) {
    super(message);
    this.name = 'InstantPayConcurrentOperationError';
    this.activeInvoiceId = activeInvoiceId;
  }
}

// Global window extension
declare global {
  interface Window {
    tonkeeper?: {
      instantPay?: InstantPayAPI;
    };
  }
}

// Mock wallet specific types
export interface MockWalletState {
  isActive: boolean;
  currentInvoiceId: string | null;
  buttonVisible: boolean;
  currentParams: SetPayButtonParams | null;
}

export interface MockTransactionResult {
  success: boolean;
  boc?: string;
  error?: string;
}