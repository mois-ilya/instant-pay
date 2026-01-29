import { Component, Show, createSignal, createMemo, For } from 'solid-js';
import { toDecimals } from '@tonkeeper/instantpay-sdk';
import type { Handshake } from '@tonkeeper/instantpay-sdk';
import { ProviderMode, WalletType } from '../App';

interface WalletStatusProps {
  walletType: WalletType;
  handshake?: Handshake;
  currentMode: ProviderMode;
  onModeChange: (mode: ProviderMode) => void;
}

const MODE_OPTIONS = [
  { value: 'mock' as const, label: 'Mock Wallet', disabled: false },
  { value: 'tonconnect' as const, label: 'TonConnect', disabled: false },
  { value: 'deeplink' as const, label: 'Deeplink', disabled: true },
];

export const WalletStatus: Component<WalletStatusProps> = (props) => {
  const [detailsOpen, setDetailsOpen] = createSignal(false);

  type Capability = {
    asset: ({ type: 'ton'; symbol: string; decimals: number } | { type: 'jetton'; master: string; symbol: string; decimals: number });
    limit: bigint;
  };

  const capabilities = createMemo(() => props.handshake?.capabilities ?? null);

  const statusStyle = () => {
    switch (props.walletType) {
      case 'real':
        return 'bg-brand-green';
      case 'mock':
        return 'bg-brand-orange';
      case 'none':
        return 'bg-brand-red';
    }
  };

  const statusText = () => {
    switch (props.walletType) {
      case 'real': return 'Connected: Real Wallet';
      case 'mock': return 'Connected: Mock Wallet';
      case 'none': return 'No Wallet Detected';
    }
  };

  return (
    <>
      {/* Compact full-width status bar */}
      <div class={`w-full ${statusStyle()} text-white`}>
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-2.5 w-2.5 rounded-full bg-white/90"></span>
            <span class="font-semibold tracking-tight">{statusText()}</span>
            <Show when={props.handshake}>
              <span class="text-white/80 text-sm">Protocol {props.handshake!.protocolVersion}</span>
            </Show>
          </div>

          <div class="flex items-center gap-2">
            <Show when={props.walletType === 'none'}>
              <span class="text-xs bg-white/15 px-2 py-1 rounded">
                {props.currentMode === 'deeplink' ? 'Deeplink fallback' : 'TonConnect fallback'}
              </span>
            </Show>
            <Show when={props.walletType === 'none'}>
              <div id="tonconnect-button"></div>
            </Show>
            <button
              class="text-xs px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors"
              onClick={() => setDetailsOpen(true)}
            >
              Details
            </button>
            <select
              value={props.currentMode}
              onChange={(e) => {
                const newMode = e.currentTarget.value as ProviderMode;
                if (newMode !== props.currentMode) {
                  props.onModeChange(newMode);
                }
              }}
              class="text-xs px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors cursor-pointer border-0 text-white appearance-none pr-7"
              style={{
                "background-image": `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                "background-position": "right 0.35rem center",
                "background-repeat": "no-repeat",
                "background-size": "1.1em 1.1em"
              }}
            >
              <For each={MODE_OPTIONS}>
                {(opt) => (
                  <option value={opt.value} disabled={opt.disabled} class="bg-surface-content text-ink-primary">
                    {opt.label}{opt.disabled ? ' (N/A)' : ''}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>
      </div>

      {/* Modal with extended info */}
      <Show when={detailsOpen()}>
        <div class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/40" onClick={() => setDetailsOpen(false)}></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-content text-ink-primary rounded-lg shadow-xl w-[92vw] max-w-lg border border-surface-tint">
            <div class="px-4 py-3 border-b border-separator-common">
              <h3 class="font-semibold text-ink-primary">Wallet Details</h3>
            </div>
            <div class="p-4 text-sm text-ink-secondary space-y-2">
              <div><strong>Status:</strong> {statusText()}</div>
              <Show when={props.handshake}>
                <div><strong>Protocol:</strong> {props.handshake!.protocolVersion}</div>
              </Show>
              <Show when={!props.handshake}>
                <div>No handshake available yet.</div>
              </Show>
              <div class="pt-2">
                <h4 class="font-semibold mb-2">Instant assets</h4>
                <Show when={capabilities()?.instant?.limits.length} fallback={<div class="text-ink-tertiary">Not provided by wallet</div>}>
                  <ul class="space-y-1">
                    <For each={capabilities()!.instant!.limits}>
                      {(c: Capability) => (
                        <li class="flex items-center justify-between text-ink-secondary">
                          <span>
                            {c.asset.symbol} {c.asset.type === 'jetton' ? `(${c.asset.master.slice(0, 8)}…${c.asset.master.slice(-8)})` : ''}
                          </span>
                          <span class="text-ink-tertiary text-xs">≤ {toDecimals(c.limit, c.asset.decimals)} per tx</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            </div>
            <div class="px-4 py-3 border-t border-separator-common flex justify-end">
              <button class="px-4 py-1.5 rounded-md bg-button-tertiary hover:bg-button-tertiary-hover text-button-tertiary-fg text-sm" onClick={() => setDetailsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};