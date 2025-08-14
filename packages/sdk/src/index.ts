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
export type { SDKEvent } from './events';

// Re-export all protocol types so users can import everything from SDK
export * from '@tonkeeper/instantpay-protocol';
export type { InstantPayInitOptions } from './instant-pay';

// Note: InstantPayEventEmitter type comes from protocol re-exports

// Error exports
export { InstantPayInvalidParamsError } from './errors';

// Validation exports
export { validatePayButtonParams } from './validation';
