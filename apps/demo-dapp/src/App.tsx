import { Component, createMemo, createSignal, onMount } from 'solid-js';
import { InstantPay as InstantPay, InstantPayAPI, InstantPayInitOptions } from '@tonkeeper/instantpay-sdk';
import { initMockWallet, isMockWalletActive } from 'mock-wallet';
import { WalletStatus } from './components/WalletStatus';
import { EventLogs } from './components/EventLogs';
import { DemoScenarios } from './components/DemoScenarios';

// Declare global type
declare global {
    interface Window {
        tonkeeper?: {
            instantPay?: InstantPayAPI;
        };
    }
}

export type WalletType = 'real' | 'mock' | 'none';

export const App: Component = () => {
    const [walletType, setWalletType] = createSignal<WalletType>('none');
    const [instantPay, setInstantPay] = createSignal<InstantPay | null>(null);

    const isMockWalletEnabled = createMemo(
        () => localStorage.getItem('mockWalletEnabled') === 'true'
    );

    onMount(() => {
        if (isMockWalletEnabled()) {
            initMockWallet();
        }

        const instantPayInitOptions: InstantPayInitOptions = {onFallbackShow: ({ openDeeplink, payButtonParams, deeplinkUrl, deeplinkScheme }) => {
            const a = document.getElementById('fallback') as HTMLAnchorElement | null;
            if (!a) return;
            const { label, request } = payButtonParams;
            const currency = request.asset.type === 'jetton' ? 'TOKEN' : 'TON';
            const cap = label.charAt(0).toUpperCase() + label.slice(1);
            a.textContent = `${cap} ${request.amount} ${currency}`;
            // prefer https deeplink in anchor; click handler keeps popup flow
            a.href = deeplinkScheme === 'https' ? deeplinkUrl : deeplinkUrl.replace(/^ton:\/\//, 'https://app.tonkeeper.com/');
            a.onclick = (e) => { e.preventDefault(); openDeeplink(); };
            a.classList.remove('hidden');
        },
        onFallbackHide: () => {
            const a = document.getElementById('fallback') as HTMLAnchorElement | null;
            if (!a) return;
            a.onclick = null;
            a.classList.add('hidden');
        }};

        const _instantPay = new InstantPay(instantPayInitOptions);
        setInstantPay(_instantPay);

        // Determine wallet type based on actual injection state
        if (_instantPay.isInjected) {
            setWalletType(isMockWalletActive() ? 'mock' : 'real');
        } else {
            setWalletType('none');
        }
    });

    return (
        <div class="font-sans">
            {/* Full-width status bar */}
            <div class="w-full"> 
                <WalletStatus walletType={walletType()} handshake={instantPay()?.handshake} />
            </div>

            <div class="max-w-6xl mx-auto p-5">
                {/* Header */}
                <header class="text-center mb-6 p-5 bg-white rounded-xl shadow-sm">
                    <h1 class="text-3xl font-bold text-slate-800 mb-2">
                        InstantPay Demo dApp
                    </h1>
                    <p class="text-slate-600">
                        Demonstration of all InstantPay protocol features
                    </p>
                </header>

                {/* Fallback button (appears when no wallet is injected) */}
                <div class="mb-5">
                    <a
                        id="fallback"
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hidden block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors"
                    >
                        Open in Tonkeeper
                    </a>
                </div>

                {/* Scenarios and Logs: scenarios first, then logs on mobile; side-by-side on desktop */}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 lg:min-h-[60vh]">
                    {/* Demo Scenarios */}
                    <DemoScenarios instantPay={instantPay()} walletType={walletType()} />

                    {/* Event Logs */}
                    <div class="min-h-[360px] lg:h-auto">
                        <EventLogs instantPay={instantPay()} />
                    </div>

                    {/* Instructions */}
                    <div class="bg-white rounded-xl p-5 shadow-sm lg:col-span-2">
                        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 class="text-base font-semibold text-blue-900 mb-3">How to Use</h4>
                            <ol class="text-sm text-blue-800 space-y-1 list-decimal ml-4">
                                <li>Click "Run Scenario" to test different InstantPay features</li>
                                <li>Watch the Event Logs panel for real-time feedback</li>
                                <li>Try interacting with the Pay button when it appears</li>
                                <li>Use "Hide Pay Button" to clear the current transaction</li>
                                <li>Use "Cycle Through Labels" to see all available button labels</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
