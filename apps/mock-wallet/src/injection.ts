/**
 * Mock Wallet Auto-Injection
 * 
 * Automatically injects mock wallet when no real Tonkeeper wallet is present.
 * This allows testing InstantPay functionality without a real wallet extension.
 */

import { MockWallet } from './mock-wallet';
import type { InstantPayAPI } from '@tonkeeper/instantpay-sdk';

declare global {
    interface Window {
        tonkeeper?: {
            instantPay?: InstantPayAPI;
        };
    }
}

/**
 * Initialize mock wallet if no real wallet is present
 * @returns MockWallet instance if injected, null otherwise
 */
export function initMockWallet(): void {
    // Create mock wallet instance
    const mockWallet = new MockWallet();
    
    // Inject into global scope
    if (!window.tonkeeper) {
        window.tonkeeper = {};
    }
    
    window.tonkeeper.instantPay = mockWallet;
    
    console.log('[MockWallet] Mock wallet injected successfully');
}

/**
 * Check if mock wallet is currently active
 */
export function isMockWalletActive(): boolean {
    return window.tonkeeper?.instantPay instanceof MockWallet;
}

/**
 * Force inject mock wallet (even if real wallet exists)
 * Useful for testing scenarios
 */
export function forceMockWallet(): InstantPayAPI {
    const mockWallet = new MockWallet();
    
    if (!window.tonkeeper) {
        window.tonkeeper = {};
    }
    
    window.tonkeeper.instantPay = mockWallet;
    
    console.log('[MockWallet] Mock wallet force-injected');
    return mockWallet;
}

/**
 * Remove mock wallet from global scope
 */
export function removeMockWallet(): void {
    if (isMockWalletActive()) {
        delete window.tonkeeper?.instantPay;
        console.log('[MockWallet] Mock wallet removed');
    }
}

/**
 * Auto-inject mock wallet on script load
 * This runs automatically when the module is imported
 */
export function autoInject(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => initMockWallet(), 100);
        });
    } else {
        // DOM is already ready
        setTimeout(() => initMockWallet(), 100);
    }
}

// Export MockWallet class for direct usage
export { MockWallet };