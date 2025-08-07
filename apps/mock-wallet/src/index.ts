/**
 * InstantPay Mock Wallet
 * 
 * Mock wallet implementation for testing and development of InstantPay integration.
 * Automatically injects when no real wallet is present.
 */

// Main mock wallet export
export { MockWallet } from './mock-wallet';

// Auto-injection functionality
export { 
    initMockWallet, 
    isMockWalletActive, 
    forceMockWallet, 
    removeMockWallet,
    autoInject
} from './injection';

// Types
export type { InstantPayAPI } from '@tonkeeper/instantpay-sdk';