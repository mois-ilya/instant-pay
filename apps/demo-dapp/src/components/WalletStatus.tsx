import { Component, Show, createSignal, createMemo, For } from 'solid-js';
import type { Handshake } from '@tonkeeper/instantpay-sdk';
import { WalletType } from '../App';

interface WalletStatusProps {
  walletType: WalletType;
  handshake?: Handshake;
}

export const WalletStatus: Component<WalletStatusProps> = (props) => {
  const [detailsOpen, setDetailsOpen] = createSignal(false);

  type Capability = {
    asset: ({ type: 'ton'; symbol: string; decimals: number } | { type: 'jetton'; master: string; symbol: string; decimals: number });
    limit: string;
  };

  const capabilities = createMemo(() => props.handshake?.capabilities ?? null);

  const statusStyle = () => {
    switch (props.walletType) {
      case 'real':
        return 'bg-green-600';
      case 'mock':
        return 'bg-amber-600';
      case 'none':
        return 'bg-red-600';
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
                Fallback (deep link) will be used
              </span>
            </Show>
            <button
              class="text-xs px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors"
              onClick={() => setDetailsOpen(true)}
            >
              Details
            </button>
            <button
              class="text-xs px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors"
              onClick={() => {
                localStorage.setItem('mockWalletEnabled', props.walletType === 'mock' ? 'false' : 'true');
                window.location.reload();
              }}
            >
              Toggle Mock Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Modal with extended info */}
      <Show when={detailsOpen()}>
        <div class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/40" onClick={() => setDetailsOpen(false)}></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[92vw] max-w-lg">
            <div class="px-4 py-3 border-b">
              <h3 class="font-semibold text-slate-800">Wallet Details</h3>
            </div>
            <div class="p-4 text-sm text-slate-700 space-y-2">
              <div><strong>Status:</strong> {statusText()}</div>
              <Show when={props.handshake}>
                <div><strong>Protocol:</strong> {props.handshake!.protocolVersion}</div>
              </Show>
              <Show when={!props.handshake}>
                <div>No handshake available yet.</div>
              </Show>
              <div class="pt-2">
                <h4 class="font-semibold mb-2">Instant assets</h4>
                <Show when={capabilities()?.instant?.limits.length} fallback={<div class="text-slate-500">Not provided by wallet</div>}>
                  <ul class="space-y-1">
                    <For each={capabilities()!.instant!.limits}>
                      {(c: Capability) => (
                        <li class="flex items-center justify-between text-slate-700">
                          <span>
                            {c.asset.symbol} {c.asset.type === 'jetton' ? `(${c.asset.master.slice(0, 8)}…${c.asset.master.slice(-8)})` : ''}
                          </span>
                          <span class="text-slate-500 text-xs">≤ {c.limit} per tx</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            </div>
            <div class="px-4 py-3 border-t flex justify-end">
              <button class="px-4 py-1.5 rounded-md bg-slate-800 text-white text-sm" onClick={() => setDetailsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};