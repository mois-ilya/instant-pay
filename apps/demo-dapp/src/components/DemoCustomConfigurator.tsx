import { Component, For, createEffect, createSignal } from 'solid-js';
import type { PayButtonParams, PaymentRequest } from '@tonkeeper/instantpay-sdk';

export interface DemoCustomPrefill {
  amount?: string;
  asset?: PaymentRequest['asset'];
  recipient?: string;
  label?: PayButtonParams['label'];
  instant?: boolean;
  expiresMinutes?: string;
  invoiceId?: string;
}

interface DemoCustomConfiguratorProps {
  allowedLabels: Array<PayButtonParams['label']>;
  defaultRecipient?: string;
  prefill?: DemoCustomPrefill;
  assets: PaymentRequest['asset'][];
  onSubmit: (params: PayButtonParams) => void;
}

export const DemoCustomConfigurator: Component<DemoCustomConfiguratorProps> = (props) => {
  const [amount, setAmount] = createSignal<string>('0.1');
  const [selectedAssetKey, setSelectedAssetKey] = createSignal<string>('ton');
  const [recipient, setRecipient] = createSignal<string>(props.defaultRecipient ?? '');
  const [label, setLabel] = createSignal<PayButtonParams['label']>('buy');
  const [instant, setInstant] = createSignal<boolean>(true);
  const [expiresMinutes, setExpiresMinutes] = createSignal<string>('');
  const [invoiceId, setInvoiceId] = createSignal<string>(crypto.randomUUID());

  createEffect(() => {
    const p = props.prefill;
    if (!p) return;
    if (p.amount !== undefined) setAmount(p.amount);
    // asset specifics come from provided assets list
    const key = p.asset?.type === 'jetton' ? `jetton:${p.asset.master}` : 'ton';
    setSelectedAssetKey(key);
    if (p.recipient !== undefined) setRecipient(p.recipient);
    if (p.label !== undefined) setLabel(p.label);
    if (p.instant !== undefined) setInstant(p.instant);
    if (p.expiresMinutes !== undefined) setExpiresMinutes(p.expiresMinutes);
    if (p.invoiceId !== undefined) setInvoiceId(p.invoiceId);
  });

  // Asset selection (from provided list only)
  const onSelectAsset = (key: string) => {
    setSelectedAssetKey(key);
  };

  const handleSubmit = () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = expiresMinutes().trim() ? (nowSec + Math.max(1, Math.floor(Number(expiresMinutes()) * 60))) : undefined;
    const resolveAsset = (): PaymentRequest['asset'] => {
      const list = props.assets;
      const found = list.find(a => (a.type === 'ton' ? 'ton' : `jetton:${a.master}`) === selectedAssetKey());
      if (found) return found;
      return { type: 'ton', symbol: 'TON', decimals: 9 };
    };
    const request: PayButtonParams['request'] = {
      amount: amount(),
      recipient: recipient(),
      invoiceId: invoiceId(),
      asset: resolveAsset(),
      ...(exp ? { expiresAt: exp } : {})
    };
    const params: PayButtonParams = { request, label: label(), instantPay: instant() };
    props.onSubmit(params);
  };

  return (
    <div id="custom-config" class="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold text-slate-800">Custom Payment</h4>
      </div>
      <div class="grid grid-cols-12 gap-2">
        <div class="col-span-12 md:col-span-6">
          <label class="block text-[11px] text-slate-600 mb-1">Amount</label>
          <input value={amount()} onInput={(e) => setAmount(e.currentTarget.value)} class="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="0.1" />
        </div>
        <div class="col-span-12 md:col-span-6">
          <label class="block text-[11px] text-slate-600 mb-1">Asset</label>
          <select value={selectedAssetKey()} onChange={(e) => onSelectAsset(e.currentTarget.value)} class="w-full rounded border border-slate-300 px-2 py-1 text-sm">
            <For each={props.assets}>
              {(a) => {
                const key = a.type === 'ton' ? 'ton' : `jetton:${a.master}`;
                const label = a.type === 'ton' ? `${a.symbol}` : `${a.symbol} (${a.master.slice(0,6)}…${a.master.slice(-6)})`;
                return <option value={key}>{label}</option>;
              }}
            </For>
          </select>
        </div>
        {/* Jetton Master field removed */}
        <div class="col-span-12">
          <label class="block text-[11px] text-slate-600 mb-1">Recipient</label>
          <input value={recipient()} onInput={(e) => setRecipient(e.currentTarget.value)} class="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="UQ…" />
        </div>
        <div class="col-span-12 md:col-span-4">
          <label class="block text-[11px] text-slate-600 mb-1">Label</label>
          <select value={label()} onChange={(e) => setLabel(e.currentTarget.value as PayButtonParams['label'])} class="w-full rounded border border-slate-300 px-2 py-1 text-sm">
            <For each={props.allowedLabels}>{(l) => <option value={l}>{l}</option>}</For>
          </select>
        </div>
        <div class="col-span-12 md:col-span-4">
          <label class="block text-[11px] text-slate-600 mb-1">Instant Pay</label>
          <select value={String(instant())} onChange={(e) => setInstant(e.currentTarget.value === 'true')} class="w-full rounded border border-slate-300 px-2 py-1 text-sm">
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <div class="col-span-12 md:col-span-4">
          <label class="block text-[11px] text-slate-600 mb-1">Expires in (minutes)</label>
          <input value={expiresMinutes()} onInput={(e) => setExpiresMinutes(e.currentTarget.value)} class="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="optional" />
        </div>
        <div class="col-span-12">
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-[11px] text-slate-600 mb-1">Invoice ID</label>
              <input value={invoiceId()} onInput={(e) => setInvoiceId(e.currentTarget.value)} class="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono" />
            </div>
            <button
              onClick={() => setInvoiceId(crypto.randomUUID())}
              class="h-[34px] px-2 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px]"
            >New</button>
          </div>
        </div>
      </div>
      <div class="mt-3">
        <button
          onClick={handleSubmit}
          class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
        >Set Pay Button</button>
      </div>
    </div>
  );
};

