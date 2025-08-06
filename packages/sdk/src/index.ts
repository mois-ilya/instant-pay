/**
 * InstantPay SDK
 * 
 * Main SDK package for dApp and wallet developers to integrate with
 * the InstantPay 1.0 protocol.
 */

// Core SDK exports
export { InstantPay } from './instant-pay';
export { InstantPayEmitter } from './events';

// Type exports from protocol
export type {
  Config as InstantPayConfig,
  SetPayButtonParams,
  Event as IPEvent
} from '@tonkeeper/instantpay-protocol';

// Type exports from SDK
export type { InstantPayAPI } from './instant-pay';
export type { InstantPayEmitterInterface } from './events';

// Error exports
export {
  InstantPayInvalidParamsError,
  InstantPayLimitExceededError,
  InstantPayConcurrentOperationError
} from './errors';

// Validation exports
export { validateSetPayButtonParams } from './validation';
