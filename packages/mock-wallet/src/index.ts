import { MockWallet } from './mock-wallet';

class MockWalletManager {
  private wallet: MockWallet;
  private isInjected: boolean = false;

  constructor() {
    this.wallet = new MockWallet();
    this.setupLogging();
    this.init();
  }

  init(): void {
    // Always inject the API when this script loads
    this.injectAPI();
    
    // Update UI if we're in the wallet extension page
    if (this.isWalletExtensionPage()) {
      this.setupWalletUI();
    }
  }

  private injectAPI(): void {
    if (typeof window === 'undefined') return;
    
    // Don't override existing wallet
    if (window.tonkeeper?.instantPay && !this.isInjected) {
      console.log('[MockWallet] Real Tonkeeper wallet detected, not injecting mock');
      return;
    }

    // Inject mock API
    if (!window.tonkeeper) {
      window.tonkeeper = {};
    }
    
    window.tonkeeper.instantPay = this.wallet;
    window.mockWalletInstance = this.wallet; // For modal controls
    this.isInjected = true;
    
    console.log('[MockWallet] Mock Tonkeeper InstantPay API injected');
    this.wallet.setLogCallback((message, type) => {
      this.addLogEntry(message, type);
    });
  }

  private isWalletExtensionPage(): boolean {
    return document.title.includes('Mock Tonkeeper Wallet') ||
           document.getElementById('status') !== null;
  }

  private setupWalletUI(): void {
    this.updateStatus();
    this.updateConfig();
    
    // Update status periodically
    setInterval(() => {
      this.updateStatus();
    }, 1000);
  }

  private updateStatus(): void {
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('status-text');
    
    if (statusEl && statusTextEl) {
      const state = this.wallet.getState();
      const isActive = state.isActive;
      
      statusEl.className = `status ${isActive ? 'active' : 'inactive'}`;
      statusTextEl.textContent = isActive ? 
        (state.buttonVisible ? `Active - Button showing for ${state.currentInvoiceId}` : 'Active - Ready') :
        'Inactive';
    }
  }

  private updateConfig(): void {
    const networkEl = document.getElementById('network');
    const tonLimitEl = document.getElementById('ton-limit');
    const jettonsCountEl = document.getElementById('jettons-count');
    
    if (networkEl) networkEl.textContent = this.wallet.config.network;
    if (tonLimitEl) tonLimitEl.textContent = this.wallet.config.instantPayLimitTon;
    if (jettonsCountEl) jettonsCountEl.textContent = this.wallet.config.jettons.length.toString();
  }

  private setupLogging(): void {
    // Intercept wallet logs and display them
    this.wallet.setLogCallback((message, type) => {
      this.addLogEntry(message, type);
    });
  }

  private addLogEntry(message: string, type: 'info' | 'event' | 'error'): void {
    const logsEl = document.getElementById('logs');
    if (!logsEl) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    logsEl.appendChild(entry);
    logsEl.scrollTop = logsEl.scrollHeight;

    // Keep only last 100 entries
    while (logsEl.children.length > 100) {
      logsEl.removeChild(logsEl.firstChild!);
    }
  }

  // Public methods for UI controls
  toggleActivation(): void {
    this.wallet.toggleActivation();
    this.updateStatus();
  }

  clearLogs(): void {
    const logsEl = document.getElementById('logs');
    if (logsEl) {
      logsEl.innerHTML = '';
    }
  }

  simulateError(type: 'limit' | 'concurrent'): void {
    this.wallet.simulateError(type);
  }

  getWallet(): MockWallet {
    return this.wallet;
  }
}

// Initialize when DOM is ready
function initMockWallet() {
  const manager = new MockWalletManager();
  
  // Expose to global for UI controls
  (window as any).mockWallet = manager;
  
  return manager;
}

// Auto-initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMockWallet);
  } else {
    initMockWallet();
  }
}

export { MockWallet, MockWalletManager };
export default initMockWallet;