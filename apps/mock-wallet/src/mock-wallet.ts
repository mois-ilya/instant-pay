/**
 * Mock Wallet Implementation
 * 
 * Mock implementation of InstantPay API for testing and development.
 * Shows a UI overlay for payment confirmation/cancellation.
 */

import type {
    Config as InstantPayConfig,
    SetPayButtonParams
} from '@tonkeeper/instantpay-protocol';
import { InstantPayEmitter, InstantPayAPI } from '@tonkeeper/instantpay-sdk';
import { validateSetPayButtonParams } from '@tonkeeper/instantpay-sdk';
import {
    InstantPayInvalidParamsError,
    InstantPayLimitExceededError,
    InstantPayConcurrentOperationError
} from '@tonkeeper/instantpay-sdk';

/**
 * Mock wallet configuration for testing
 */
const MOCK_CONFIG: InstantPayConfig = {
    network: 'testnet',
    tonLimit: '1.0',
    jettons: [
        {
            symbol: 'USDT',
            address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
            decimals: 6,
            limit: '1000'
        },
        {
            symbol: 'USDC',
            address: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1SYRlLN20wH',
            decimals: 6,
            limit: '1000'
        }
    ],
    labels: ['buy', 'unlock', 'use', 'get', 'open', 'start', 'retry', 'show', 'play', 'try']
};



/**
 * Mock Wallet Class
 * Implements InstantPay API with simple pay button for mobile dApp browsers
 */
export class MockWallet implements InstantPayAPI {
    public readonly config: InstantPayConfig;
    public readonly events: InstantPayEmitter;

    private _activeParams: SetPayButtonParams | null = null;
    private _overlayElement: HTMLElement | null = null;
    private _paymentInProgress: boolean = false;

    constructor(config: InstantPayConfig = MOCK_CONFIG) {
        this.config = config;
        this.events = new InstantPayEmitter();
        
        // Inject styles
        this._injectStyles();
    }

    /**
     * Render or update the Pay button overlay
     */
    setPayButton(params: SetPayButtonParams): void {
        // Validate parameters
        const validation = validateSetPayButtonParams(params, this.config);
        if (!validation.valid) {
            throw new InstantPayInvalidParamsError(
                validation.error || 'Invalid parameters'
            );
        }

        // Check for concurrent operations - only if payment is in progress (clicked but not sent)
        if (this._paymentInProgress && this._activeParams && this._activeParams.invoiceId !== params.invoiceId) {
            throw new InstantPayConcurrentOperationError(
                'Another payment operation is already in progress',
                this._activeParams.invoiceId
            );
        }

        // Check payment limits
        const limitCheck = this._checkPaymentLimits(params);
        if (!limitCheck.valid) {
            // If there's an active button, hide it first
            if (this._activeParams) {
                this._hideOverlay();
                this._activeParams = null;
                this._paymentInProgress = false;
            }
            
            throw new InstantPayLimitExceededError(
                limitCheck.error!,
                params.invoiceId,
                limitCheck.limit!
            );
        }

        // Store active params and show overlay
        this._activeParams = params;
        this._paymentInProgress = false; // Reset payment progress state
        this._showPayButtonOverlay(params);
    }

    /**
     * Hide the pay button overlay
     */
    hidePayButton(): void {
        if (this._activeParams) {
            const invoiceId = this._activeParams.invoiceId;
            this._activeParams = null;
            this._paymentInProgress = false;
            this._hideOverlay();

            // Emit cancelled event
            this.events.emit({
                type: 'cancelled',
                invoiceId
            });
        }
    }

    /**
     * Get current active invoice ID
     */
    get activeInvoiceId(): string | null {
        return this._activeParams?.invoiceId || null;
    }

    /**
     * Check if payment amount exceeds limits
     */
    private _checkPaymentLimits(params: SetPayButtonParams): {
        valid: boolean;
        error?: string;
        limit?: string;
    } {
        const amount = parseFloat(params.amount);

        if (params.jetton) {
            // Check jetton limits
            const jetton = this.config.jettons.find(
                (j) => j.address === params.jetton
            );
            if (!jetton) {
                return {
                    valid: false,
                    error: 'Unsupported jetton',
                    limit: '0',
                };
            }

            const limit = parseFloat(jetton.limit);
            if (amount > limit) {
                return {
                    valid: false,
                    error: `Amount ${params.amount} exceeds jetton limit`,
                    limit: jetton.limit,
                };
            }
        } else {
            // Check TON limits
            const limit = parseFloat(this.config.tonLimit);
            if (amount > limit) {
                return {
                    valid: false,
                    error: `Amount ${params.amount} exceeds TON limit`,
                    limit: this.config.tonLimit,
                };
            }
        }

        return { valid: true };
    }

    /**
     * Show the simplified pay button for mobile dApp browsers
     */
    private _showPayButtonOverlay(params: SetPayButtonParams): void {
        // Remove existing overlay
        this._hideOverlay();

        // Create minimal pay button
        this._overlayElement = document.createElement('div');
        this._overlayElement.className = 'mock-wallet-pay-button';
        this._overlayElement.innerHTML = this._createSimpleButtonHTML(params);
        
        // Add to body and adjust page layout
        document.body.appendChild(this._overlayElement);
        document.body.classList.add('mock-wallet-active');

        // Add event listeners
        this._attachButtonEvents(params);

        console.log('[MockWallet] Simple pay button shown for invoice:', params.invoiceId);
    }

    /**
     * Hide the overlay
     */
    private _hideOverlay(): void {
        if (this._overlayElement) {
            this._overlayElement.remove();
            this._overlayElement = null;
            document.body.classList.remove('mock-wallet-active');
        }
    }

    /**
     * Create simple button HTML for mobile dApp browsers
     */
    private _createSimpleButtonHTML(params: SetPayButtonParams): string {
        const currency = params.jetton 
            ? this.config.jettons.find(j => j.address === params.jetton)?.symbol || 'TOKEN'
            : 'TON';
            
        return `
            <div class="mock-wallet-simple-container">
                <button class="mock-wallet-simple-btn" data-action="pay">
                    ${params.label.charAt(0).toUpperCase() + params.label.slice(1)} ${params.amount} ${currency}
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners to simple pay button
     */
    private _attachButtonEvents(params: SetPayButtonParams): void {
        if (!this._overlayElement) return;

        // Handle button click
        this._overlayElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const action = target.getAttribute('data-action');

            if (action === 'pay') {
                // Mark payment as in progress
                this._paymentInProgress = true;
                
                // Emit click event
                this.events.emit({
                    type: 'click',
                    invoiceId: params.invoiceId
                });
                
                // Auto-confirm payment for simplified mobile experience
                this._handleConfirm(params);
            }
        });
    }

    /**
     * Handle payment confirmation
     */
    private _handleConfirm(params: SetPayButtonParams): void {
        this._activeParams = null;
        this._paymentInProgress = false; // Reset payment progress
        this._hideOverlay();

        // Generate mock BOC (transaction hash)
        const mockBoc = this._generateMockBoc();

        // Emit sent event
        this.events.emit({
            type: 'sent',
            invoiceId: params.invoiceId,
            boc: mockBoc
        });

        console.log('[MockWallet] Payment confirmed for invoice:', params.invoiceId);
    }



    /**
     * Generate mock BOC for testing
     */
    private _generateMockBoc(): string {
        // Generate a realistic-looking mock BOC
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = 'te6ccgECBAEAAgAAAgE';
        for (let i = 0; i < 200; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result + '==';
    }

    /**
     * Inject CSS styles for the simplified pay button
     */
    private _injectStyles(): void {
        const styleId = 'mock-wallet-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .mock-wallet-pay-button {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-top: 1px solid rgba(0, 0, 0, 0.1);
                padding: env(safe-area-inset-bottom, 0px) 0 0 0;
            }
            
            .mock-wallet-simple-container {
                padding: 12px 16px;
            }
            
            .mock-wallet-simple-btn {
                background: #007AFF;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 16px 20px;
                font-size: 17px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                transition: all 0.2s ease;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                box-shadow: none;
                text-align: center;
                letter-spacing: -0.02em;
            }
            
            .mock-wallet-simple-btn:hover {
                background: #0056b3;
            }
            
            .mock-wallet-simple-btn:active {
                background: #004494;
                transform: scale(0.98);
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .mock-wallet-pay-button {
                    background: rgba(28, 28, 30, 0.95);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .mock-wallet-simple-btn {
                    background: #0A84FF;
                }
                
                .mock-wallet-simple-btn:hover {
                    background: #0066CC;
                }
                
                .mock-wallet-simple-btn:active {
                    background: #004499;
                }
            }
            
            /* Animation for appearance */
            @keyframes mock-wallet-button-slide-up {
                from { 
                    opacity: 0;
                    transform: translateY(100%);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .mock-wallet-pay-button {
                animation: mock-wallet-button-slide-up 0.3s ease-out;
            }
            
            /* Ensure content doesn't get hidden behind the button */
            body.mock-wallet-active {
                padding-bottom: 88px;
            }
        `;
        
        document.head.appendChild(style);
    }
}