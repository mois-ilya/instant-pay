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
 * Implements full InstantPay API with UI overlay
 */
export class MockWallet implements InstantPayAPI {
    public readonly config: InstantPayConfig;
    public readonly events: InstantPayEmitter;

    private _activeParams: SetPayButtonParams | null = null;
    private _overlayElement: HTMLElement | null = null;

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

        // Check for concurrent operations
        if (this._activeParams && this._activeParams.invoiceId !== params.invoiceId) {
            throw new InstantPayConcurrentOperationError(
                'Another payment operation is already active',
                this._activeParams.invoiceId
            );
        }

        // Check payment limits
        const limitCheck = this._checkPaymentLimits(params);
        if (!limitCheck.valid) {
            throw new InstantPayLimitExceededError(
                limitCheck.error!,
                params.invoiceId,
                limitCheck.limit!
            );
        }

        // Store active params and show overlay
        this._activeParams = params;
        this._showPayButtonOverlay(params);
    }

    /**
     * Hide the pay button overlay
     */
    hidePayButton(): void {
        if (this._activeParams) {
            const invoiceId = this._activeParams.invoiceId;
            this._activeParams = null;
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
     * Show the pay button overlay
     */
    private _showPayButtonOverlay(params: SetPayButtonParams): void {
        // Remove existing overlay
        this._hideOverlay();

        // Create overlay container
        this._overlayElement = document.createElement('div');
        this._overlayElement.className = 'mock-wallet-overlay';
        this._overlayElement.innerHTML = this._createOverlayHTML(params);
        
        // Add to body
        document.body.appendChild(this._overlayElement);

        // Add event listeners
        this._attachOverlayEvents(params);

        console.log('[MockWallet] Pay button overlay shown for invoice:', params.invoiceId);
    }

    /**
     * Hide the overlay
     */
    private _hideOverlay(): void {
        if (this._overlayElement) {
            this._overlayElement.remove();
            this._overlayElement = null;
        }
    }

    /**
     * Create overlay HTML
     */
    private _createOverlayHTML(params: SetPayButtonParams): string {
        const currency = params.jetton 
            ? this.config.jettons.find(j => j.address === params.jetton)?.symbol || 'TOKEN'
            : 'TON';
            
        return `
            <div class="mock-wallet-backdrop">
                <div class="mock-wallet-modal">
                    <div class="mock-wallet-header">
                        <div class="mock-wallet-badge">Mock Wallet</div>
                        <button class="mock-wallet-close" data-action="close">×</button>
                    </div>
                    
                    <div class="mock-wallet-content">
                        <h3>Confirm Payment</h3>
                        <div class="mock-wallet-amount">
                            ${params.amount} ${currency}
                        </div>
                        <div class="mock-wallet-details">
                            <div><strong>Action:</strong> ${params.label}</div>
                            <div><strong>Recipient:</strong> ${params.recipient.slice(0, 8)}...${params.recipient.slice(-6)}</div>
                            <div><strong>Network:</strong> ${this.config.network}</div>
                            <div><strong>Invoice ID:</strong> ${params.invoiceId}</div>
                        </div>
                    </div>
                    
                    <div class="mock-wallet-actions">
                        <button class="mock-wallet-btn mock-wallet-btn-cancel" data-action="cancel">
                            Cancel
                        </button>
                        <button class="mock-wallet-btn mock-wallet-btn-confirm" data-action="confirm">
                            ${params.label.charAt(0).toUpperCase() + params.label.slice(1)} Now
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to overlay
     */
    private _attachOverlayEvents(params: SetPayButtonParams): void {
        if (!this._overlayElement) return;

        // Emit click event when overlay is shown
        this.events.emit({
            type: 'click',
            invoiceId: params.invoiceId
        });

        // Handle button clicks
        this._overlayElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const action = target.getAttribute('data-action');

            if (action === 'confirm') {
                this._handleConfirm(params);
            } else if (action === 'cancel' || action === 'close') {
                this._handleCancel(params);
            }
        });

        // Handle ESC key
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this._handleCancel(params);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Handle payment confirmation
     */
    private _handleConfirm(params: SetPayButtonParams): void {
        this._activeParams = null;
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
     * Handle payment cancellation
     */
    private _handleCancel(params: SetPayButtonParams): void {
        this._activeParams = null;
        this._hideOverlay();

        // Emit cancelled event
        this.events.emit({
            type: 'cancelled',
            invoiceId: params.invoiceId
        });

        console.log('[MockWallet] Payment cancelled for invoice:', params.invoiceId);
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
     * Inject CSS styles for the overlay
     */
    private _injectStyles(): void {
        const styleId = 'mock-wallet-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .mock-wallet-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .mock-wallet-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                animation: mock-wallet-fade-in 0.2s ease;
            }
            
            .mock-wallet-modal {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                max-height: 90vh;
                overflow: hidden;
                animation: mock-wallet-slide-in 0.3s ease;
            }
            
            .mock-wallet-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e9ecef;
                background: #f8f9fa;
            }
            
            .mock-wallet-badge {
                background: #ff8c00;
                color: white;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .mock-wallet-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }
            
            .mock-wallet-close:hover {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .mock-wallet-content {
                padding: 24px 20px;
                text-align: center;
            }
            
            .mock-wallet-content h3 {
                margin: 0 0 16px 0;
                color: #2c3e50;
                font-size: 18px;
            }
            
            .mock-wallet-amount {
                font-size: 32px;
                font-weight: bold;
                color: #0088cc;
                margin-bottom: 20px;
                font-family: monospace;
            }
            
            .mock-wallet-details {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 16px;
                text-align: left;
                font-size: 14px;
                line-height: 1.5;
                color: #495057;
            }
            
            .mock-wallet-details > div {
                margin-bottom: 8px;
            }
            
            .mock-wallet-details > div:last-child {
                margin-bottom: 0;
            }
            
            .mock-wallet-actions {
                display: flex;
                gap: 12px;
                padding: 20px;
                border-top: 1px solid #e9ecef;
            }
            
            .mock-wallet-btn {
                flex: 1;
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
                text-transform: capitalize;
            }
            
            .mock-wallet-btn-cancel {
                background: #6c757d;
                color: white;
            }
            
            .mock-wallet-btn-cancel:hover {
                background: #5a6268;
            }
            
            .mock-wallet-btn-confirm {
                background: #28a745;
                color: white;
            }
            
            .mock-wallet-btn-confirm:hover {
                background: #218838;
            }
            
            @keyframes mock-wallet-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes mock-wallet-slide-in {
                from { 
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}