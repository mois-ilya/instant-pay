import { Component, Show, For } from 'solid-js';
import { InstantPayConfig } from '@tonkeeper/instantpay-sdk';
import { WalletType } from '../App';

interface WalletStatusProps {
  walletType: WalletType;
  config?: InstantPayConfig;
}

export const WalletStatus: Component<WalletStatusProps> = (props) => {
  const getBadgeClass = () => {
    switch (props.walletType) {
      case 'real':
        return 'inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold mb-4';
      case 'mock':
        return 'inline-block px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-bold mb-4';
      case 'none':
        return 'inline-block px-4 py-2 bg-red-100 text-red-600 rounded-full text-sm font-bold mb-4';
    }
  };

  const getBadgeText = () => {
    switch (props.walletType) {
      case 'real': return 'Real Wallet';
      case 'mock': return 'Mock Wallet';
      case 'none': return 'No Wallet';
    }
  };

  return (
    <div class="bg-white rounded-xl p-5 shadow-sm">
      <h3 class="text-xl font-semibold text-slate-800 mb-4">Wallet Connection Status</h3>
      
      {/* Status Badge */}
      <div class={getBadgeClass()}>
        {getBadgeText()}
      </div>

      <button class="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-md text-sm px-2 py-2 me-2 ml-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onClick={() => {
        localStorage.setItem('mockWalletEnabled', props.walletType === 'mock' ? 'false' : 'true');
        window.location.reload();
      }}>
        Toggle Mock Wallet
      </button>

      <Show when={props.config}>
        <div class="mt-4">
          <h4 class="text-lg font-medium text-slate-700 mb-3">Configuration</h4>
          
          <div class="text-sm text-slate-600 space-y-2">
            <div>
              <strong>Network:</strong> {props.config!.network}
            </div>
            <div>
              <strong>TON Limit:</strong> {props.config!.tonLimit} TON
            </div>
            <div>
              <strong>Jettons:</strong> {props.config!.jettons.length} supported
            </div>
            <div>
              <strong>Pay Labels:</strong> {props.config!.labels.join(', ')}
            </div>
          </div>

          <Show when={props.config!.jettons.length > 0}>
            <details class="mt-4">
              <summary class="cursor-pointer text-blue-600 font-semibold text-sm hover:text-blue-800">
                View Supported Jettons ({props.config!.jettons.length})
              </summary>
              <div class="mt-3 p-3 bg-slate-50 rounded-lg space-y-2">
                <For each={props.config!.jettons}>
                  {(jetton) => (
                    <div class="bg-white p-2 rounded border border-slate-200">
                      <div class="font-semibold text-sm">{jetton.symbol}</div>
                      <div class="text-xs text-slate-500 mt-1">
                        Limit: {jetton.limit} | Decimals: {jetton.decimals}
                      </div>
                      <div class="text-xs text-slate-500 font-mono mt-1 break-all">
                        {jetton.address}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </details>
          </Show>
        </div>
      </Show>

      <Show when={props.walletType === 'none'}>
        <div class="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 text-red-800 text-sm">
          <strong>No wallet detected.</strong> Install Tonkeeper extension or use the mock wallet for testing.
        </div>
      </Show>
    </div>
  );
};