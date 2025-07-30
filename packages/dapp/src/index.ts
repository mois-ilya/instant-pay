import { DAppManager } from './dapp-manager';

// Global reference for UI controls
declare global {
  interface Window {
    dappManager: DAppManager;
  }
}

class DAppInitializer {
  private manager: DAppManager | null = null;

  async init(): Promise<void> {
    console.log('[dApp] Initializing InstantPay dApp...');
    
    try {
      // Initialize the dApp manager
      this.manager = new DAppManager();
      
      // Make it globally available for UI controls
      window.dappManager = this.manager;
      
      // Setup additional UI handlers
      this.setupUIHandlers();
      
      console.log('[dApp] dApp initialized successfully');
      
    } catch (error) {
      console.error('[dApp] Failed to initialize:', error);
      const message = error instanceof Error ? error.message : String(error);
      this.showErrorMessage('Failed to initialize dApp: ' + message);
    }
  }

  private setupUIHandlers(): void {
    // Handle form submissions with Enter key
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        const form = e.target.closest('.test-scenario');
        if (form) {
          const button = form.querySelector('button');
          if (button && !button.disabled) {
            button.click();
          }
        }
      }
    });
    
    // Add copy functionality to addresses
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('copyable')) {
        this.copyToClipboard(target.textContent || '');
      }
    });
    
    // Handle window beforeunload
    window.addEventListener('beforeunload', () => {
      if (this.manager) {
        this.manager.destroy();
      }
    });
    
    // Add some helpful keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'l':
            e.preventDefault();
            if (this.manager) {
              this.manager.clearLogs();
            }
            break;
          case 'r':
            e.preventDefault();
            if (this.manager) {
              this.manager.refreshWalletStatus();
            }
            break;
          case 'h':
            e.preventDefault();
            if (this.manager) {
              this.manager.hidePayButton();
            }
            break;
        }
      }
    });
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showToast('Copied to clipboard!');
    });
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      z-index: 10000;
      animation: fadeInOut 2s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  }

  private showErrorMessage(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.innerHTML = `
      <strong>Error:</strong> ${message}<br>
      <small>Check the browser console for more details.</small>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(errorDiv, container.firstChild);
    }
  }
}

// Add some helpful styles for toast notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
    85% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  }
  
  .copyable {
    cursor: pointer;
  }
  
  .copyable:hover {
    background: rgba(0, 122, 255, 0.1);
    border-radius: 3px;
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
function initDApp() {
  const initializer = new DAppInitializer();
  initializer.init();
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDApp);
} else {
  initDApp();
}

// Export for potential external use
export { DAppManager, DAppInitializer };
export default initDApp;