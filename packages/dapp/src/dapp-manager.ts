import {
  InstantPayAPI,
  SetPayButtonParams,
  InstantPayEvent,
  InstantPayInvalidParamsError,
  InstantPayLimitExceededError,
  InstantPayConcurrentOperationError
} from '@instant-pay/types';

export interface TestScenario {
  name: string;
  description: string;
  params: SetPayButtonParams;
}

export class DAppManager {
  private wallet: InstantPayAPI | null = null;
  private isUsingMockWallet: boolean = false;
  private logs: Array<{timestamp: Date, message: string, type: 'info' | 'success' | 'error' | 'event'}> = [];
  private currentInvoiceId: string | null = null;
  private eventListeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    this.log('dApp Manager initializing...', 'info');
    
    try {
      // Check for real wallet first
      await this.checkWalletAvailability();
      
      if (!this.wallet) {
        // Load mock wallet as fallback
        await this.loadMockWallet();
      }
      
      if (this.wallet) {
        this.setupEventListeners();
        this.updateUI();
        this.log('dApp initialized successfully', 'success');
      } else {
        this.log('Failed to initialize any wallet', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Initialization error: ${message}`, 'error');
    }
  }

  private async checkWalletAvailability(): Promise<void> {
    // Wait a bit for potential wallet injection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (window.tonkeeper?.instantPay) {
      this.wallet = window.tonkeeper.instantPay;
      this.isUsingMockWallet = false;
      this.log('Real Tonkeeper wallet detected', 'success');
    } else {
      this.log('No real Tonkeeper wallet found', 'info');
    }
  }

  private async loadMockWallet(): Promise<void> {
    try {
      this.log('Loading mock wallet as fallback...', 'info');
      
      // Dynamically import and initialize mock wallet
      const mockWalletScript = document.createElement('script');
      mockWalletScript.src = 'http://localhost:3001/mock-wallet.js';
      mockWalletScript.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        mockWalletScript.onload = () => {
          // Wait for mock wallet to inject API
          setTimeout(() => {
            if (window.tonkeeper?.instantPay) {
              this.wallet = window.tonkeeper.instantPay;
              this.isUsingMockWallet = true;
              this.showFallbackNotice();
              this.log('Mock wallet loaded successfully', 'success');
              resolve();
            } else {
              reject(new Error('Mock wallet failed to inject API'));
            }
          }, 500);
        };
        
        mockWalletScript.onerror = () => {
          reject(new Error('Failed to load mock wallet script'));
        };
        
        document.head.appendChild(mockWalletScript);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Failed to load mock wallet: ${message}`, 'error');
    }
  }

  private showFallbackNotice(): void {
    const notice = document.getElementById('fallback-notice');
    if (notice) {
      notice.style.display = 'block';
    }
  }

  private setupEventListeners(): void {
    if (!this.wallet) return;

    // Listen to all InstantPay events
    const onClick = this.wallet.events.on('click', (event) => {
      this.log(`Button clicked for invoice: ${event.invoiceId}`, 'event');
      this.updateActiveInvoice(event.invoiceId);
    });

    const onSent = this.wallet.events.on('sent', (event) => {
      this.log(`Payment sent! Invoice: ${event.invoiceId}, BOC: ${event.boc.substring(0, 20)}...`, 'success');
      this.currentInvoiceId = null;
      this.updateActiveInvoice(null);
    });

    const onCancelled = this.wallet.events.on('cancelled', (event) => {
      this.log(`Payment cancelled for invoice: ${event.invoiceId}`, 'info');
      this.currentInvoiceId = null;
      this.updateActiveInvoice(null);
    });

    // Store unsubscribe functions
    this.eventListeners = [onClick, onSent, onCancelled];
  }

  private updateActiveInvoice(invoiceId: string | null): void {
    this.currentInvoiceId = invoiceId;
    const element = document.getElementById('active-invoice');
    if (element) {
      element.textContent = invoiceId ? invoiceId.substring(0, 8) + '...' : 'None';
    }
  }

  private updateUI(): void {
    if (!this.wallet) return;

    // Update status
    const walletStatus = document.getElementById('wallet-status');
    if (walletStatus) {
      walletStatus.textContent = this.isUsingMockWallet ? 'Mock Wallet' : 'Real Wallet';
      walletStatus.className = 'status-value connected';
    }

    // Update config
    const networkStatus = document.getElementById('network-status');
    if (networkStatus) {
      networkStatus.textContent = this.wallet.config.network;
    }

    const tonLimit = document.getElementById('ton-limit');
    if (tonLimit) {
      tonLimit.textContent = `${this.wallet.config.instantPayLimitTon} TON`;
    }

    // Update API config display
    this.updateConfigDisplay();
  }

  private updateConfigDisplay(): void {
    const configEl = document.getElementById('api-config');
    if (!configEl || !this.wallet) return;

    const config = this.wallet.config;
    configEl.innerHTML = `
      <strong>Network:</strong> ${config.network}<br>
      <strong>TON Limit:</strong> ${config.instantPayLimitTon} TON<br>
      <strong>Jettons:</strong> ${config.jettons.length} supported<br>
      <strong>Labels:</strong> ${config.payLabels.join(', ')}<br>
      <strong>Mock Wallet:</strong> ${this.isUsingMockWallet ? 'Yes' : 'No'}
    `;
  }

  // Quick test scenarios
  runQuickTest(scenario: string): void {
    if (!this.wallet) {
      this.log('No wallet available', 'error');
      return;
    }

    try {
      let params: SetPayButtonParams;

      switch (scenario) {
        case 'basic-ton':
          params = {
            amount: '0.1',
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'buy',
            invoiceId: crypto.randomUUID()
          };
          break;

        case 'usdt-payment':
          const usdt = this.wallet.config.jettons.find(j => j.symbol === 'USDT');
          if (!usdt) {
            this.log('USDT not supported in current config', 'error');
            return;
          }
          params = {
            amount: '5',
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'use',
            invoiceId: crypto.randomUUID(),
            jetton: usdt.address
          };
          break;

        case 'limit-error':
          params = {
            amount: '100', // Exceeds typical limits
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'buy',
            invoiceId: crypto.randomUUID()
          };
          break;

        case 'concurrent-error':
          // First create a payment
          this.wallet.setPayButton({
            amount: '1',
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'buy',
            invoiceId: crypto.randomUUID()
          });
          
          // Then try to create another
          params = {
            amount: '2',
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'use',
            invoiceId: crypto.randomUUID()
          };
          break;

        default:
          this.log(`Unknown test scenario: ${scenario}`, 'error');
          return;
      }

      this.log(`Running test: ${scenario}`, 'info');
      this.wallet.setPayButton(params);
      this.log(`Test ${scenario} executed successfully`, 'success');

    } catch (error) {
      this.handleWalletError(error);
    }
  }

  createCustomPayment(): void {
    if (!this.wallet) {
      this.log('No wallet available', 'error');
      return;
    }

    try {
      const amount = (document.getElementById('custom-amount') as HTMLInputElement).value;
      const label = (document.getElementById('custom-label') as HTMLSelectElement).value;
      const recipient = (document.getElementById('custom-recipient') as HTMLInputElement).value;
      const jetton = (document.getElementById('custom-jetton') as HTMLInputElement).value;

      const params: SetPayButtonParams = {
        amount,
        recipient,
        label: label as any,
        invoiceId: crypto.randomUUID(),
        ...(jetton && { jetton })
      };

      this.log('Creating custom payment...', 'info');
      this.wallet.setPayButton(params);
      this.log('Custom payment created successfully', 'success');

    } catch (error) {
      this.handleWalletError(error);
    }
  }

  testError(errorType: string): void {
    if (!this.wallet) {
      this.log('No wallet available', 'error');
      return;
    }

    try {
      let params: SetPayButtonParams;

      switch (errorType) {
        case 'invalid-params':
          params = {
            amount: '-1', // Invalid amount
            recipient: 'invalid-address',
            label: 'invalid-label' as any,
            invoiceId: 'not-a-uuid'
          };
          break;

        case 'limit-exceeded':
          params = {
            amount: '999999', // Way over limit
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'buy',
            invoiceId: crypto.randomUUID()
          };
          break;

        case 'concurrent-operation':
          // Create first payment
          this.wallet.setPayButton({
            amount: '1',
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'buy',
            invoiceId: 'first-' + crypto.randomUUID()
          });
          
          // Immediately try to create second
          params = {
            amount: '2',
            recipient: 'EQABzNRvvvhxhiQQ6xqOXQ9LjxhUOkG6ykJFCYOOjKQY5FHY',
            label: 'use',
            invoiceId: 'second-' + crypto.randomUUID()
          };
          break;

        default:
          this.log(`Unknown error type: ${errorType}`, 'error');
          return;
      }

      this.log(`Testing ${errorType} error...`, 'info');
      this.wallet.setPayButton(params);

    } catch (error) {
      this.handleWalletError(error);
    }
  }

  private handleWalletError(error: any): void {
    if (error instanceof InstantPayInvalidParamsError) {
      this.log(`Invalid Params Error: ${error.message}`, 'error');
    } else if (error instanceof InstantPayLimitExceededError) {
      this.log(`Limit Exceeded Error: ${error.message} (Invoice: ${error.invoiceId}, Limit: ${error.limit})`, 'error');
    } else if (error instanceof InstantPayConcurrentOperationError) {
      this.log(`Concurrent Operation Error: ${error.message} (Active: ${error.activeInvoiceId})`, 'error');
    } else {
      this.log(`Unexpected error: ${error.message}`, 'error');
    }
  }

  hidePayButton(): void {
    if (!this.wallet) {
      this.log('No wallet available', 'error');
      return;
    }

    this.wallet.hidePayButton();
    this.log('Pay button hidden', 'info');
  }

  refreshWalletStatus(): void {
    this.log('Refreshing wallet status...', 'info');
    this.updateUI();
    this.log('Status refreshed', 'success');
  }

  clearLogs(): void {
    this.logs = [];
    const logsEl = document.getElementById('logs');
    if (logsEl) {
      logsEl.innerHTML = '<div class="log-entry info">[Info] Logs cleared</div>';
    }
  }

  exportLogs(): void {
    const logText = this.logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instant-pay-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.log('Logs exported', 'success');
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'event'): void {
    const logEntry = {
      timestamp: new Date(),
      message,
      type
    };
    
    this.logs.push(logEntry);
    console.log(`[dApp] ${message}`);
    
    // Update UI
    const logsEl = document.getElementById('logs');
    if (logsEl) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      entry.textContent = `[${logEntry.timestamp.toLocaleTimeString()}] ${message}`;
      logsEl.appendChild(entry);
      logsEl.scrollTop = logsEl.scrollHeight;
      
      // Keep only last 100 entries
      while (logsEl.children.length > 100) {
        logsEl.removeChild(logsEl.firstChild!);
      }
    }
  }

  // Cleanup
  destroy(): void {
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners = [];
  }
}