import { InstantPayEmitter } from '@tonkeeper/instantpay-utils';
import { InstantPayInvalidParamsError, InstantPayConcurrentOperationError } from '@tonkeeper/instantpay-sdk';
import type { InstantPayEventEmitter, PayButtonParams, PaymentRequest, RequestPaymentCompletionEvent, InstantPayProvider } from '@tonkeeper/instantpay-protocol';
import type { TonConnectUI } from '@tonconnect/ui';
import { Address, beginCell } from '@ton/core';
import { fromDecimals } from '@tonkeeper/instantpay-utils';

// --- Helpers ---
const INVOICE_OP_CODE = 0x7aa23eb5;

function parseUuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '').toLowerCase();
  if (!/^([0-9a-f]{32})$/.test(hex)) {
    throw new InstantPayInvalidParamsError('Invalid invoiceId UUID');
  }
  return Buffer.from(hex, 'hex');
}

function buildInvoicePayloadCell(request: PaymentRequest) {
  const uuidBytes = parseUuidToBytes(request.invoiceId);
  const builder = beginCell()
    .storeUint(INVOICE_OP_CODE, 32)
    .storeBuffer(uuidBytes);
  const adnlHex = request.adnlAddress?.toLowerCase();
  if (adnlHex && /^[0-9a-f]{64}$/.test(adnlHex)) {
    builder.storeUint(1, 8).storeBuffer(Buffer.from(adnlHex, 'hex'));
  } else {
    builder.storeUint(0, 8);
  }
  return builder.endCell();
}

type ProviderUIButtonRenderer = (ctx: {
  params: PayButtonParams;
  onClick: () => void;
  state: { disabled: boolean };
}) => () => void;

type ProviderUIOptions = {
  mount?: string | HTMLElement; // container selector or element
  className?: string;           // class for created button (DOM mode)
  getLabelText?: (params: PayButtonParams) => string;
  renderButton?: ProviderUIButtonRenderer; // framework render
};

export class TonConnectAdapter implements InstantPayProvider {
  public readonly events: InstantPayEventEmitter;
  private currentRequest: PaymentRequest | null = null;
  private isProcessing = false;
  private abortedByApp = false;
  private unmountUI?: () => void;
  private mountedButton?: HTMLButtonElement;

  constructor(
    private readonly tonConnectUI: TonConnectUI,
    private readonly resolveJettonWalletAddress: (master: string, owner: string) => Promise<string>,
    private readonly ui?: ProviderUIOptions
  ) {
    this.events = new InstantPayEmitter() as InstantPayEventEmitter;
  }

  private validateParams(params: PayButtonParams) {
    const req = params.request;
    try {
      Address.parse(req.recipient);
    } catch {
      throw new InstantPayInvalidParamsError('Invalid recipient address');
    }
    const amt = req.amount as string | bigint;
    if (typeof amt === 'bigint') {
      if (amt < 0n) throw new InstantPayInvalidParamsError('Amount must be non-negative');
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(amt)) {
      throw new InstantPayInvalidParamsError('Invalid payment amount');
    }
    const parts = amt.split('.');
    if (parts[1] && parts[1].length > (req.asset.decimals ?? 9)) {
      throw new InstantPayInvalidParamsError('Amount has too many decimal places for this asset');
    }
  }

  setPayButton(params: PayButtonParams): void {
    if (this.isProcessing) {
      const activeId = this.currentRequest ? this.currentRequest.invoiceId : '';
      throw new InstantPayConcurrentOperationError('Another payment is currently in progress', activeId);
    }
    this.validateParams(params);
    const req = params.request;
    if (this.currentRequest && this.currentRequest.invoiceId !== req.invoiceId) {
      (this.events as any).emit({ type: 'voided', request: this.currentRequest, reason: 'replaced' });
    }
    this.currentRequest = req;
    this.abortedByApp = false;
    (this.events as any).emit({ type: 'show', request: req });

    // UI integration (optional)
    this.mountOrUpdateButton(params);
  }

  hidePayButton(): void {
    if (!this.currentRequest) return;
    if (this.isProcessing) {
      this.abortedByApp = true;
    }
    const req = this.currentRequest;
    this.currentRequest = null;
    this.isProcessing = false;
    try { (this.tonConnectUI).closeModal?.(); } catch { void 0; }
    (this.events as any).emit({ type: 'voided', request: req, reason: 'hidden' });

    // Clean up UI
    this.cleanupUI();
  }

  async requestPayment(request: PaymentRequest): Promise<RequestPaymentCompletionEvent> {
    if (this.isProcessing) {
      const activeId = this.currentRequest ? this.currentRequest.invoiceId : '';
      throw new InstantPayConcurrentOperationError('Another payment is currently in progress', activeId);
    }
    if (!this.currentRequest || this.currentRequest.invoiceId !== request.invoiceId) {
      if (this.currentRequest && this.currentRequest.invoiceId !== request.invoiceId) {
        (this.events as any).emit({ type: 'voided', request: this.currentRequest, reason: 'replaced' });
      }
      this.validateParams({ request, label: 'buy' } as PayButtonParams);
      this.currentRequest = request;
    }
    this.abortedByApp = false;
    this.isProcessing = true;
    (this.events as any).emit({ type: 'click', request });

    const nowSec = Math.floor(Date.now() / 1000);
    if (request.expiresAt && request.expiresAt <= nowSec) {
      this.isProcessing = false;
      const stale = this.currentRequest;
      this.currentRequest = null;
      // Clean up UI
      this.cleanupUI();
      if (stale) (this.events as any).emit({ type: 'cancelled', request: stale, reason: 'expired' });
      return { type: 'cancelled', request: stale, reason: 'expired' };
    }

    try {
      if (!(this.tonConnectUI).connected) {
        await (this.tonConnectUI).openModal();
        const connected = await new Promise<boolean>((resolve) => {
          const offStatus = (this.tonConnectUI).onStatusChange?.(() => {
            if ((this.tonConnectUI).connected) {
              offStatus?.(); offModal?.();
              resolve(true);
            }
          });
          const offModal = (this.tonConnectUI).onModalStateChange?.((state: unknown) => {
            const status = (typeof state === 'object' && state !== null)
              ? (state as Record<string, unknown>)['status']
              : undefined;
            if (status === 'closed') {
              offModal?.(); offStatus?.();
              if (!(this.tonConnectUI).connected) resolve(false);
            }
          });
        });
        if (!connected) {
          this.isProcessing = false;
          const req0 = this.currentRequest!;
          this.currentRequest = null;
          // Clean up UI
          this.cleanupUI();
          (this.events as any).emit({ type: 'cancelled', request: req0, reason: 'user' });
          return { type: 'cancelled', request: req0, reason: 'user' };
        }
      }

      let userAddress: string | undefined = (this.tonConnectUI).account?.address || (this.tonConnectUI).wallet?.account?.address;
      const validUntil = Math.floor(Date.now() / 1000) + 60;
      const messages: Array<{ address: string; amount: string; payload?: string; stateInit?: string } > = [];

      if (request.asset.type === 'ton') {
        const amt = request.amount as string | bigint;
        const nanoAmount = (typeof amt === 'bigint' ? amt : fromDecimals(amt, request.asset.decimals)).toString();
        const invoiceCell = buildInvoicePayloadCell(request);
        const invoiceBoc = invoiceCell.toBoc().toString('base64');
        messages.push({ address: request.recipient, amount: nanoAmount, payload: invoiceBoc });
      } else if (request.asset.type === 'jetton') {
        if (!userAddress) {
          // Try to connect wallet if address not available
          await (this.tonConnectUI).openModal();
          const connected = await new Promise<boolean>((resolve) => {
            const offStatus = (this.tonConnectUI).onStatusChange?.(() => {
              if ((this.tonConnectUI).connected) {
                offStatus?.(); offModal?.();
                resolve(true);
              }
            });
            const offModal = (this.tonConnectUI).onModalStateChange?.((state: unknown) => {
              const status = (typeof state === 'object' && state !== null)
                ? (state as Record<string, unknown>)['status']
                : undefined;
              if (status === 'closed') {
                offModal?.(); offStatus?.();
                if (!(this.tonConnectUI).connected) resolve(false);
              }
            });
          });
          if (!connected) {
            this.isProcessing = false;
            const req0 = this.currentRequest!;
            this.currentRequest = null;
            (this.events as any).emit({ type: 'cancelled', request: req0, reason: 'user' });
            return { type: 'cancelled', request: req0, reason: 'user' };
          }
          // Re-check address after connection
          const newUserAddress = (this.tonConnectUI).account?.address || (this.tonConnectUI).wallet?.account?.address;
          if (!newUserAddress) {
            this.isProcessing = false;
            const req0 = this.currentRequest!;
            this.currentRequest = null;
            // Clean up UI
            this.cleanupUI();
            (this.events as any).emit({ type: 'cancelled', request: req0, reason: 'wallet' });
            return { type: 'cancelled', request: req0, reason: 'wallet' };
          }
          userAddress = newUserAddress;
        }
        const amt = request.amount as string | bigint;
        const amountUnits = (typeof amt === 'bigint' ? amt : fromDecimals(amt, request.asset.decimals)).toString();
        const jettonWalletAddr = await this.resolveJettonWalletAddress(request.asset.master, userAddress);
        const opTransfer = 0x0f8a7ea5;
        const queryId = 0;
        const amountCoins = BigInt(amountUnits);
        const destAddr = Address.parse(request.recipient);
        const ownerAddr = Address.parse(userAddress);
        const forwardToRecipient = 1n;
        const callAmount = 50_000_000n;
        const invoiceCell = buildInvoicePayloadCell(request);
        const transferCell = beginCell()
          .storeUint(opTransfer, 32)
          .storeUint(queryId, 64)
          .storeCoins(amountCoins)
          .storeAddress(destAddr)
          .storeAddress(ownerAddr)
          .storeUint(0, 1)
          .storeCoins(forwardToRecipient)
          .storeMaybeRef(invoiceCell)
          .endCell();
        const payloadBoc = transferCell.toBoc().toString('base64');
        messages.push({ address: jettonWalletAddr, amount: callAmount.toString(), payload: payloadBoc });
      } else {
        this.isProcessing = false;
        const req0 = this.currentRequest!;
        this.currentRequest = null;
        // Clean up UI
        this.cleanupUI();
        (this.events as any).emit({ type: 'cancelled', request: req0, reason: 'unsupported_env' });
        return { type: 'cancelled', request: req0, reason: 'unsupported_env' };
      }

      const txRequest = { validUntil, messages };
      const result = await (this.tonConnectUI).sendTransaction(txRequest);
      if (this.abortedByApp) {
        this.isProcessing = false;
        this.currentRequest = null;
        return { type: 'voided', request, reason: 'hidden' };
      }
      this.isProcessing = false;
      this.setButtonDisabled(false);
      const boc = (typeof result === 'string') ? result : result?.boc || '';
      (this.events as any).emit({ type: 'sent', request, boc });
      this.currentRequest = null;
      return { type: 'sent', request, boc };
    } catch (error: unknown) {
      if (this.abortedByApp) {
        this.isProcessing = false;
        this.currentRequest = null;
        return { type: 'voided', request, reason: 'hidden' };
      }
      this.isProcessing = false;
      this.setButtonDisabled(false);
      const msg = error instanceof Error ? String(error.message).toLowerCase() : '';
      const reason: 'user' | 'wallet' = msg.includes('reject') ? 'user' : 'wallet';
      // Clean up UI
      this.cleanupUI();
      (this.events as any).emit({ type: 'cancelled', request, reason });
      this.currentRequest = null;
      return { type: 'cancelled', request, reason };
    }
  }

  getActive(): { request: PaymentRequest } | null {
    return this.currentRequest ? { request: this.currentRequest } : null;
  }

  // --- UI helpers ---
  private cleanupUI(): void {
    try { this.unmountUI?.(); } finally { this.unmountUI = undefined; }
    if (this.mountedButton && this.mountedButton.parentElement) {
      this.mountedButton.onclick = null;
      this.mountedButton.remove();
    }
    this.mountedButton = undefined;
  }
  private mountOrUpdateButton(params: PayButtonParams) {
    if (!this.ui) return;
    const onClick = () => {
      const req = this.currentRequest;
      if (!req || this.isProcessing) return;
      this.setButtonDisabled(true);
      void this.requestPayment(req);
    };

    // Framework renderer preferred
    if (this.ui.renderButton) {
      // If already mounted via renderButton, unmount and re-render with new params
      this.unmountUI?.();
      this.unmountUI = this.ui.renderButton({
        params,
        onClick,
        state: { disabled: this.isProcessing }
      });
      return;
    }

    // DOM mounting by selector/element
    const mount = this.ui.mount;
    if (!mount) return;
    let container: HTMLElement | null = null;
    if (typeof mount === 'string') {
      container = document.querySelector<HTMLElement>(mount);
    } else {
      container = mount;
    }
    if (!container) return;

    // If container itself is a button, use it; otherwise create/update a button child
    let btn: HTMLButtonElement | null = null;
    if (container instanceof HTMLButtonElement) {
      btn = container;
    } else {
      btn = (container.querySelector('button[data-ip-tonconnect]') as HTMLButtonElement | null) || null;
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.ipTonconnect = '1';
        if (this.ui.className) btn.className = this.ui.className;
        container.appendChild(btn);
      }
    }

    // Generate button text like mock wallet: "Pay for 0.1 TON"
    const currency = params.request.asset.symbol ?? (params.request.asset.type === 'jetton' ? 'TOKEN' : 'TON');
    const labelMap: { [key in PayButtonParams['label']]: string } = {
      buy: 'Buy', unlock: 'Unlock', use: 'Use', get: 'Get', open: 'Open', 
      start: 'Start', retry: 'Retry', show: 'Show', play: 'Play', try: 'Try'
    };
    const prefix = labelMap[params.label] || 'Pay';
    const amount = params.request.amount;
    const decimals = params.request.asset.decimals;
    const shown = typeof amount === 'bigint' ? fromDecimals(amount, decimals) : amount;
    const buttonText = `${prefix} for ${shown} ${currency}`;

    btn.textContent = buttonText;
    btn.disabled = this.isProcessing;
    btn.onclick = onClick;
    this.mountedButton = btn;
  }

  private setButtonDisabled(disabled: boolean) {
    if (this.mountedButton) this.mountedButton.disabled = disabled;
  }
}

export function createTonConnectProvider(
  tonConnectUI: TonConnectUI,
  resolveJettonWalletAddress: (master: string, owner: string) => Promise<string>,
  ui?: ProviderUIOptions
): InstantPayProvider {
  return new TonConnectAdapter(tonConnectUI, resolveJettonWalletAddress, ui);
} 