import {
  InstantPayAPI,
  InstantPayConfig,
  SetPayButtonParams,
  InstantPayInvalidParamsError,
  InstantPayLimitExceededError,
  InstantPayConcurrentOperationError,
  MockWalletState,
  MockTransactionResult
} from '@instant-pay/types';
import { MockEventEmitter } from './event-emitter';
import './styles.css';

export class MockWallet implements InstantPayAPI {
  public config: InstantPayConfig;
  public events: MockEventEmitter;
  private state: MockWalletState;
  private logCallback?: (message: string, type: 'info' | 'event' | 'error') => void;

  constructor() {
    this.events = new MockEventEmitter();
    this.state = {
      isActive: true,
      currentInvoiceId: null,
      buttonVisible: false,
      currentParams: null
    };
    
    // Default configuration - testnet with reasonable limits
    this.config = {
      network: 'testnet',
      instantPayLimitTon: '10',
      jettons: [
        {
          symbol: 'USDT',
          address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
          decimals: 6,
          instantPayLimit: '1000'
        },
        {
          symbol: 'USDC', 
          address: 'EQB-MPwrd1G6WKNkLz_VnV6WqBOTg7b0bHUgAYFgWiYkGZHQ',
          decimals: 6,
          instantPayLimit: '1000'
        }
      ],
      payLabels: ['buy', 'unlock', 'use', 'get', 'open', 'start', 'retry', 'show', 'play', 'try']
    };

    this.log('Mock Wallet initialized', 'info');
  }

  setPayButton(params: SetPayButtonParams): void {
    this.log(`setPayButton called with invoiceId: ${params.invoiceId}`, 'event');
    
    try {
      this.validateParams(params);
      this.checkLimits(params);
      this.checkConcurrentOperations(params);
      
      // Update state
      this.state.currentParams = params;
      this.state.currentInvoiceId = params.invoiceId;
      this.state.buttonVisible = true;

      // Render the button
      this.renderPayButton(params);
      
      this.log(`Pay button rendered for ${params.amount} ${params.jetton ? 'tokens' : 'TON'}`, 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Error in setPayButton: ${message}`, 'error');
      throw error;
    }
  }

  hidePayButton(): void {
    this.log('hidePayButton called', 'event');
    
    if (this.state.currentInvoiceId && this.state.buttonVisible) {
      // Cancel current invoice if it exists
      this.events.emit({
        type: 'cancelled',
        invoiceId: this.state.currentInvoiceId
      });
      this.log(`Invoice ${this.state.currentInvoiceId} cancelled`, 'event');
    }

    this.state.buttonVisible = false;
    this.state.currentInvoiceId = null;
    this.state.currentParams = null;
    
    this.removePayButton();
    this.log('Pay button hidden', 'info');
  }

  // Public methods for testing and controls
  setLogCallback(callback: (message: string, type: 'info' | 'event' | 'error') => void): void {
    this.logCallback = callback;
  }

  toggleActivation(): void {
    this.state.isActive = !this.state.isActive;
    this.log(`Wallet ${this.state.isActive ? 'activated' : 'deactivated'}`, 'info');
    
    if (!this.state.isActive && this.state.buttonVisible) {
      this.hidePayButton();
    }
  }

  simulateError(type: 'limit' | 'concurrent' | 'invalid'): void {
    const mockParams: SetPayButtonParams = {
      amount: type === 'limit' ? '100' : '1',
      recipient: 'EQABzNR--test--address',
      label: 'buy',
      invoiceId: 'test-error-' + Date.now()
    };

    try {
      if (type === 'limit') {
        this.checkLimits({ ...mockParams, amount: '100' });
      } else if (type === 'concurrent') {
        this.state.currentInvoiceId = 'existing-invoice';
        this.checkConcurrentOperations(mockParams);
      } else {
        this.validateParams({ ...mockParams, recipient: 'invalid-address' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Simulated ${type} error: ${message}`, 'error');
    }
  }

  getState(): MockWalletState {
    return { ...this.state };
  }

  // Private methods
  private validateParams(params: SetPayButtonParams): void {
    if (!params.amount || isNaN(Number(params.amount)) || Number(params.amount) <= 0) {
      throw new InstantPayInvalidParamsError('Invalid amount');
    }

    if (!params.recipient || !this.isValidTonAddress(params.recipient)) {
      throw new InstantPayInvalidParamsError('Invalid recipient address');
    }

    if (!this.config.payLabels.includes(params.label)) {
      throw new InstantPayInvalidParamsError('Invalid label');
    }

    if (!params.invoiceId || !this.isValidUUID(params.invoiceId)) {
      throw new InstantPayInvalidParamsError('Invalid invoiceId (must be UUID)');
    }

    if (params.jetton && !this.isValidTonAddress(params.jetton)) {
      throw new InstantPayInvalidParamsError('Invalid jetton address');
    }
  }

  private checkLimits(params: SetPayButtonParams): void {
    const amount = Number(params.amount);
    
    if (params.jetton) {
      const jetton = this.config.jettons.find(j => j.address === params.jetton);
      if (!jetton) {
        throw new InstantPayInvalidParamsError('Jetton not supported');
      }
      
      const limit = Number(jetton.instantPayLimit);
      if (amount > limit) {
        throw new InstantPayLimitExceededError(
          `Amount exceeds limit for ${jetton.symbol}`,
          params.invoiceId,
          jetton.instantPayLimit
        );
      }
    } else {
      const limit = Number(this.config.instantPayLimitTon);
      if (amount > limit) {
        throw new InstantPayLimitExceededError(
          'Amount exceeds TON limit',
          params.invoiceId,
          this.config.instantPayLimitTon
        );
      }
    }
  }

  private checkConcurrentOperations(params: SetPayButtonParams): void {
    if (this.state.currentInvoiceId && this.state.currentInvoiceId !== params.invoiceId) {
      throw new InstantPayConcurrentOperationError(
        'Another payment is already in progress',
        this.state.currentInvoiceId
      );
    }
  }

  private renderPayButton(params: SetPayButtonParams): void {
    this.removePayButton();

    const button = document.createElement('div');
    button.className = 'tonkeeper-instant-pay-button';
    button.id = 'tonkeeper-instant-pay-btn';
    button.textContent = `${params.label.toUpperCase()} ${params.amount} ${params.jetton ? 'tokens' : 'TON'}`;
    
    button.addEventListener('click', () => this.handleButtonClick(params));
    
    document.body.appendChild(button);
  }

  private removePayButton(): void {
    const existingButton = document.getElementById('tonkeeper-instant-pay-btn');
    if (existingButton) {
      existingButton.remove();
    }
    
    const existingOverlay = document.getElementById('tonkeeper-instant-pay-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }

  private handleButtonClick(params: SetPayButtonParams): void {
    this.log(`Pay button clicked for invoice ${params.invoiceId}`, 'event');
    
    // Emit click event
    this.events.emit({
      type: 'click',
      invoiceId: params.invoiceId
    });

    // Show payment modal
    this.showPaymentModal(params);
  }

  private showPaymentModal(params: SetPayButtonParams): void {
    const overlay = document.createElement('div');
    overlay.className = 'tonkeeper-instant-pay-overlay';
    overlay.id = 'tonkeeper-instant-pay-overlay';

    const modal = document.createElement('div');
    modal.className = 'tonkeeper-instant-pay-modal';

    const jettonInfo = params.jetton ? 
      this.config.jettons.find(j => j.address === params.jetton) : null;

    modal.innerHTML = `
      <button class="close-btn" onclick="this.closest('.tonkeeper-instant-pay-overlay').remove()">×</button>
      <h2>💎 Confirm Payment</h2>
      <div class="payment-details">
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${params.amount} ${jettonInfo?.symbol || 'TON'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">To:</span>
          <span class="detail-value">${this.formatAddress(params.recipient)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invoice ID:</span>
          <span class="detail-value">${params.invoiceId}</span>
        </div>
        ${params.jetton ? `
        <div class="detail-row">
          <span class="detail-label">Token:</span>
          <span class="detail-value">${jettonInfo?.symbol || 'Unknown'}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Total:</span>
          <span class="detail-value">${params.amount} ${jettonInfo?.symbol || 'TON'}</span>
        </div>
      </div>
      <div class="buttons">
        <button class="btn-secondary" onclick="mockWalletInstance.cancelPayment('${params.invoiceId}')">
          Cancel
        </button>
        <button class="btn-primary" onclick="mockWalletInstance.confirmPayment('${params.invoiceId}')">
          Confirm Payment
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.cancelPayment(params.invoiceId);
      }
    });
  }

  confirmPayment(invoiceId: string): void {
    this.log(`Payment confirmed for invoice ${invoiceId}`, 'event');
    
    const overlay = document.getElementById('tonkeeper-instant-pay-overlay');
    if (overlay) {
      // Show processing state
      const modal = overlay.querySelector('.tonkeeper-instant-pay-modal');
      if (modal) {
        modal.innerHTML = `
          <div class="processing">
            <div class="spinner"></div>
            <p>Processing payment...</p>
          </div>
        `;
      }
    }

    // Simulate transaction processing
    setTimeout(() => {
      const result = this.simulateTransaction();
      
      if (result.success) {
        this.events.emit({
          type: 'sent',
          invoiceId,
          boc: result.boc!
        });
        this.log(`Payment sent successfully. BOC: ${result.boc}`, 'event');
      } else {
        this.events.emit({
          type: 'cancelled',
          invoiceId
        });
        this.log(`Payment failed: ${result.error}`, 'error');
      }

      this.hidePayButton();
    }, 2000);
  }

  cancelPayment(invoiceId: string): void {
    this.log(`Payment cancelled for invoice ${invoiceId}`, 'event');
    
    this.events.emit({
      type: 'cancelled',
      invoiceId
    });

    this.hidePayButton();
  }

  private simulateTransaction(): MockTransactionResult {
    // 90% success rate for demo
    const success = Math.random() > 0.1;
    
    if (success) {
      // Generate fake BOC
      const boc = 'te6ccgEBAQEAJgAAR4A' + Math.random().toString(36).substring(2, 15) + 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      return { success: true, boc };
    } else {
      return { success: false, error: 'Network error or insufficient balance' };
    }
  }

  private isValidTonAddress(address: string): boolean {
    // Basic TON address validation
    return /^[A-Za-z0-9_-]{48}$/.test(address) || 
           /^[A-Za-z0-9+/]{48}$/.test(address) ||
           address.startsWith('EQ') || 
           address.startsWith('UQ');
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private formatAddress(address: string): string {
    if (address.length > 20) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  }

  private log(message: string, type: 'info' | 'event' | 'error'): void {
    console.log(`[MockWallet] ${message}`);
    if (this.logCallback) {
      this.logCallback(message, type);
    }
  }
}

// Global instance for modal controls
declare global {
  interface Window {
    mockWalletInstance: MockWallet;
  }
}