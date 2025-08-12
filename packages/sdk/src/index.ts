/**
 * InstantPay SDK
 * 
 * Main SDK package for dApp developers to integrate with
 * the InstantPay 1.0 protocol through wallet extensions.
 */

// Core SDK exports
export { InstantPaySDK } from './instant-pay';
// Backward-compatible alias for demo until migrated
export { InstantPaySDK as InstantPay } from './instant-pay';
export { InstantPayEmitter } from './events';

// Type exports from protocol
export type {
  PayButtonParams,
  PaymentRequest,
  InstantPayEvent
} from '@tonkeeper/instantpay-protocol';
export type { Handshake, InstantPayAPI, InstantPayInitOptions, FallbackContext } from './instant-pay';

// Type exports from SDK
export type { InstantPayEventEmitter } from './events';

// Error exports
export { InstantPayInvalidParamsError } from './errors';

// Validation exports
export { validatePayButtonParams } from './validation';
