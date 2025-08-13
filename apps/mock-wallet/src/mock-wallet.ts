/**
 * Mock Wallet Implementation (InstantPay 1.0)
 */

import { InstantPayEmitter } from '@tonkeeper/instantpay-sdk';
import type { InstantPayAPI, Handshake } from '@tonkeeper/instantpay-sdk';
import type { PayButtonParams, PaymentRequest } from '@tonkeeper/instantpay-protocol';
import { validatePayButtonParams } from '@tonkeeper/instantpay-sdk';
import { InstantPayInvalidParamsError } from '@tonkeeper/instantpay-sdk';
import type { InstantPayEvent } from '@tonkeeper/instantpay-protocol';

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
    private _confirmElement: HTMLElement | null = null;

    constructor() {
        this.events = new InstantPayEmitter();
        this._injectStyles();
    }

    /** Demo capabilities for instant payments (mock only) */
    private _capabilities = {
        instant: [
            { asset: { type: 'ton' } as const, limit: '10' },
            { asset: { type: 'jetton' as const, master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' }, limit: '1000' }
        ]
    };

    handshake(_app: { name: string; url?: string; iconUrl?: string }, require?: { minProtocol?: `${number}.${number}.${number}` }): Handshake {
        if (require?.minProtocol && this._compareSemver(this.protocolVersion, require.minProtocol) < 0) {
            throw new Error('INCOMPATIBLE_VERSION');
        }
        return {
            protocolVersion: this.protocolVersion,
            wallet: { name: 'MockWallet' },
            capabilities: this._capabilities,
        };
    }

    setPayButton(params: PayButtonParams): void {
        const v = validatePayButtonParams(params);
        if (!v.valid) {
            // Hide current button if visible and emit cancelled for the active invoice
            const activeId = this._current?.request.invoiceId;
            this._hideOverlay();
            this._current = null;
            this._clicked = false;
            if (activeId) {
                this.events.emit({ type: 'cancelled', invoiceId: activeId, reason: 'wallet' });
            }
            throw new InstantPayInvalidParamsError(v.error);
        }
        if (this._clicked) throw new Error('ACTIVE_OPERATION');

        // Replacement semantics before click
        if (this._current && this._current.request.invoiceId !== params.request.invoiceId) {
            this.events.emit({ type: 'cancelled', invoiceId: this._current.request.invoiceId, reason: 'replaced' });
        }

        this._current = params;
        this._showPayButtonOverlay(params);
        // Emit 'show' when button is rendered
        const ev: InstantPayEvent = { type: 'show', invoiceId: params.request.invoiceId } as InstantPayEvent;
        this.events.emit(ev);
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
        if (this._confirmElement) {
            this._confirmElement.remove();
            this._confirmElement = null;
            document.body.classList.remove('mock-wallet-confirm-active');
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
                    ${(() => {
                        const map: Record<string, string> = {
                            buy: 'Buy',
                            continue: 'Continue',
                            unlock: 'Unlock',
                            use: 'Use',
                            get: 'Get',
                            open: 'Open',
                            play: 'Play',
                            start: 'Start',
                            retry: 'Retry',
                            'play again': 'Play again',
                            play_again: 'Play again',
                            'another try': 'Another try',
                            next: 'Next',
                            try: 'Try',
                            show: 'Show'
                        };
                        const code = String(params.label);
                        const prefix = map[code] ?? (code.charAt(0).toUpperCase() + code.slice(1));
                        return `${prefix} for ${params.request.amount} ${currency}`;
                    })()}
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

            // Decide whether instant-confirm is supported by capabilities
            if (this._isInstantSupported(params)) {
              // Auto-confirm payment for mock
              this._handleConfirm(params);
            } else {
              // Show in-page confirmation modal and wait for explicit approval
              this._showConfirmationModal(params);
            }
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
   * Check whether instant payment is supported per capabilities and params
   */
  private _isInstantSupported(params: PayButtonParams): boolean {
    // Require params.instantPay flag
    if (!params.instantPay) return false;
    const { asset, amount } = params.request;
    const caps = this._capabilities.instant;
    let capLimitStr: string | null = null;
    for (const c of caps) {
      if (asset.type === 'ton' && c.asset.type === 'ton') { capLimitStr = c.limit; break; }
      if (asset.type === 'jetton' && c.asset.type === 'jetton' && c.asset.master === asset.master) { capLimitStr = c.limit; break; }
    }
    if (!capLimitStr) return false;
    const limit = Number(capLimitStr);
    const value = Number(amount);
    if (!isFinite(limit) || !isFinite(value)) return false;
    return value <= limit;
  }

  /**
   * Show in-page confirmation modal for unsupported instant payments
   */
  private _showConfirmationModal(params: PayButtonParams): void {
    const { request } = params;
    if (this._confirmElement) {
      try { this._confirmElement.remove(); } catch { /* noop */ }
      this._confirmElement = null;
    }
    const currency = request.asset.type === 'jetton' ? 'TOKEN' : 'TON';
    const container = document.createElement('div');
    container.className = 'mock-wallet-confirm-backdrop';
    container.innerHTML = `
      <div class="mock-wallet-confirm-modal" role="dialog" aria-modal="true">
        <div class="mock-wallet-confirm-title">Confirm Payment</div>
        <div class="mock-wallet-confirm-content">
          <div class="row"><span>Amount</span><strong>${request.amount} ${currency}</strong></div>
          <div class="row"><span>Recipient</span><code>${request.recipient}</code></div>
          <div class="row"><span>Invoice ID</span><code>${request.invoiceId}</code></div>
          ${request.asset.type === 'jetton' ? `<div class="row"><span>Jetton</span><code>${request.asset.master}</code></div>` : ''}
        </div>
        <div class="mock-wallet-confirm-actions">
          <button data-action="approve" class="approve">Approve</button>
          <button data-action="cancel" class="cancel">Cancel</button>
        </div>
        <div class="mock-wallet-confirm-note">This payment exceeds instant limit or requires confirmation.</div>
      </div>`;
    document.body.appendChild(container);
    document.body.classList.add('mock-wallet-confirm-active');
    this._confirmElement = container;

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target && 'closest' in target ? (target.closest('[data-action]') as HTMLElement | null) : null;
      const action = btn?.getAttribute('data-action');
      if (!action) return;
      if (action === 'approve') {
        this._confirmElement?.remove();
        this._confirmElement = null;
        document.body.classList.remove('mock-wallet-confirm-active');
        this._handleConfirm(params);
      } else if (action === 'cancel') {
        this._current = null;
        this._clicked = false;
        this._hideOverlay();
        this.events.emit({ type: 'cancelled', invoiceId: request.invoiceId, reason: 'user' });
      }
    };
    container.addEventListener('click', onClick);
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
            /* Confirmation modal */
            .mock-wallet-confirm-backdrop { position: fixed; inset: 0; z-index: 1000000; background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
            .mock-wallet-confirm-modal { background:#fff; color:#0f172a; border-radius:12px; width:min(620px,94vw); box-shadow:0 10px 30px rgba(0,0,0,0.2); padding:16px; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .mock-wallet-confirm-title { font-size:16px; font-weight:700; margin-bottom:12px; }
            .mock-wallet-confirm-content { display:grid; gap:8px; margin-bottom:12px; }
            .mock-wallet-confirm-content .row { display:grid; grid-template-columns: auto 1fr; align-items:start; column-gap:8px; }
            .mock-wallet-confirm-content .row span { color:#475569; font-size:13px; }
            .mock-wallet-confirm-content code { background:#f1f5f9; padding:2px 4px; border-radius:4px; display:block; max-width:100%; overflow-wrap:anywhere; word-break:break-word; white-space:normal; }
            .mock-wallet-confirm-actions { display:flex; gap:8px; margin-top:8px; }
            .mock-wallet-confirm-actions .approve { background:#10b981; color:#fff; border:0; border-radius:8px; padding:10px 14px; font-weight:600; cursor:pointer; }
            .mock-wallet-confirm-actions .cancel { background:#e2e8f0; color:#0f172a; border:0; border-radius:8px; padding:10px 14px; font-weight:600; cursor:pointer; }
            .mock-wallet-confirm-note { color:#64748b; font-size:12px; margin-top:8px; }
            @media (max-width: 480px) {
              .mock-wallet-confirm-modal { width:96vw; padding:14px; }
              .mock-wallet-confirm-title { font-size:15px; }
              .mock-wallet-confirm-content code { font-size:12px; }
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
                .mock-wallet-confirm-modal { background:#1e293b; color:#e2e8f0; }
                .mock-wallet-confirm-content code { background:#0f172a; color:#e2e8f0; }
                .mock-wallet-confirm-actions .cancel { background:#334155; color:#e2e8f0; }
                
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