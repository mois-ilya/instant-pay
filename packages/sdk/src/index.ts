/**
 * InstantPay SDK
 * 
 * Main SDK package for dApp and wallet developers to integrate with
 * the InstantPay 1.0 protocol.
 */

// Core SDK exports
export { InstantPay } from './instant-pay';
export { InstantPayEmitter } from './events';

// Type exports
export type {
  InstantPayConfig,
  SetPayButtonParams,
  IPEvent,
  InstantPayAPI
} from '@tonkeeper/instantpay-protocol';

// Error exports
export {
  InstantPayInvalidParamsError,
  InstantPayLimitExceededError,
  InstantPayConcurrentOperationError
} from './errors';

// Utility exports
export * from './utils';