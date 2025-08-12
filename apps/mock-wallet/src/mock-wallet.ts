/**
 * Mock Wallet Implementation (InstantPay 1.0)
 */

import { InstantPayEmitter } from '@tonkeeper/instantpay-sdk';
import type { InstantPayAPI, Handshake } from '@tonkeeper/instantpay-sdk';
import type { PayButtonParams, PaymentRequest } from '@tonkeeper/instantpay-protocol';
import { validatePayButtonParams } from '@tonkeeper/instantpay-sdk';
import { InstantPayInvalidParamsError } from '@tonkeeper/instantpay-sdk';

// v1 mock has no extended runtime config



/**
 * Mock Wallet Class
 * Implements InstantPay API with simple pay button for mobile dApp browsers
 */
export class MockWallet implements InstantPayAPI {
    public readonly protocolVersion = '1.0.0' as const;
    public readonly events: InstantPayEmitter;

    private _current: PayButtonParams | null = null;
    private _clicked = false;
    private _overlayElement: HTMLElement | null = null;

    constructor() {
        this.events = new InstantPayEmitter();
        this._injectStyles();
    }

    handshake(_app: { name: string; url?: string; iconUrl?: string }, require?: { minProtocol?: `${number}.${number}.${number}` }): Handshake {
        if (require?.minProtocol && this._compareSemver(this.protocolVersion, require.minProtocol) < 0) {
            throw new Error('INCOMPATIBLE_VERSION');
        }
        return {
            protocolVersion: this.protocolVersion,
            wallet: { name: 'MockWallet' },
        };
    }

    setPayButton(params: PayButtonParams): void {
        const v = validatePayButtonParams(params);
        if (!v.valid) throw new InstantPayInvalidParamsError(v.error);
        if (this._clicked) throw new Error('ACTIVE_OPERATION');

        // Replacement semantics before click
        if (this._current && this._current.request.invoiceId !== params.request.invoiceId) {
            this.events.emit({ type: 'cancelled', invoiceId: this._current.request.invoiceId, reason: 'replaced' });
        }

        this._current = params;
        this._showPayButtonOverlay(params);
        // Emit 'show' when button is rendered
        this.events.emit({ type: 'show', invoiceId: params.request.invoiceId } as any);
    }

    /**
     * Hide the pay button overlay
     */
    hidePayButton(): void {
        if (this._current) {
            const invoiceId = this._current.request.invoiceId;
            this._current = null;
            this._clicked = false;
            this._hideOverlay();
            this.events.emit({ type: 'cancelled', invoiceId, reason: 'app' });
        } else {
            // Idempotent: still hide overlay if any
            this._hideOverlay();
        }
    }

    getActive(): { invoiceId: string } | null {
        return this._current ? { invoiceId: this._current.request.invoiceId } : null;
    }

    cancel(invoiceId?: string): void {
        if (this._clicked) throw new Error('ACTIVE_OPERATION');
        if (!this._current) return;
        if (!invoiceId || invoiceId === this._current.request.invoiceId) {
            const id = this._current.request.invoiceId;
            this._current = null;
            this._hideOverlay();
            this.events.emit({ type: 'cancelled', invoiceId: id, reason: 'app' });
        }
    }

    async requestPayment(_req: PaymentRequest): Promise<{ status: 'sent'; boc: string } | { status: 'cancelled'; reason?: 'user' | 'app' | 'wallet' | 'replaced' | 'expired' | 'unsupported_env' }> {
        // For mock, immediately send
        return { status: 'sent', boc: this._generateMockBoc() };
    }

    // activeInvoiceId accessor removed in v1 mock

    /**
     * Check if payment amount exceeds limits
     */
    // limits not used in v1 spec

    /**
     * Show the simplified pay button for mobile dApp browsers
     */
    private _showPayButtonOverlay(params: PayButtonParams): void {
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

        console.log('[MockWallet] Simple pay button shown for invoice:', params.request.invoiceId);
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
    private _createSimpleButtonHTML(params: PayButtonParams): string {
        const currency = params.request.asset.type === 'jetton' ? 'TOKEN' : 'TON';
            
        return `
            <div class="mock-wallet-simple-container">
                <button class="mock-wallet-simple-btn" data-action="pay">
                    ${params.label.charAt(0).toUpperCase() + params.label.slice(1)} ${params.request.amount} ${currency}
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners to simple pay button
     */
    private _attachButtonEvents(params: PayButtonParams): void {
        if (!this._overlayElement) return;

        // Handle button click (use closest to support inner spans)
        this._overlayElement.addEventListener('click', (e) => {
            const raw = e.target as Element | null;
            const el = raw && 'closest' in raw ? (raw.closest('[data-action]') as HTMLElement | null) : null;
            const action = el?.getAttribute('data-action');

            if (action === 'pay') {
                // Mark clicked
                this._clicked = true;
                
                // Emit click event
                this.events.emit({
                    type: 'click',
                    invoiceId: params.request.invoiceId
                });
                
                // Check expiry
                const nowSec = Math.floor(Date.now()/1000);
                if (params.request.expiresAt && params.request.expiresAt <= nowSec) {
                    this._hideOverlay();
                    this._current = null;
                    this._clicked = false;
                    this.events.emit({ type: 'cancelled', invoiceId: params.request.invoiceId, reason: 'expired' });
                    return;
                }

                // Auto-confirm payment for mock
                this._handleConfirm(params);
            }
        });
    }

    /**
     * Handle payment confirmation
     */
    private _handleConfirm(params: PayButtonParams): void {
        this._current = null;
        this._clicked = false;
        this._hideOverlay();

        // Generate mock BOC (transaction hash)
        const mockBoc = this._generateMockBoc();

        // Emit sent event
        this.events.emit({
            type: 'sent',
            invoiceId: params.request.invoiceId,
            boc: mockBoc
        });

        console.log('[MockWallet] Payment confirmed for invoice:', params.request.invoiceId);
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

    /**
     * Compare two semver strings a and b.
     * Returns -1 if a<b, 0 if a==b, 1 if a>b
     */
    private _compareSemver(a: `${number}.${number}.${number}`, b: `${number}.${number}.${number}`): number {
        const pa = a.split('.').map((x) => parseInt(x, 10));
        const pb = b.split('.').map((x) => parseInt(x, 10));
        for (let i = 0; i < 3; i++) {
            if (pa[i] < pb[i]) return -1;
            if (pa[i] > pb[i]) return 1;
        }
        return 0;
    }
}