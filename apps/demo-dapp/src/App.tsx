import { Component, createMemo, createSignal, onMount, onCleanup } from 'solid-js';
import { InstantPay as InstantPay } from '@tonkeeper/instantpay-sdk';
import { initMockWallet, isMockWalletActive } from 'mock-wallet';
import { WalletStatus } from './components/WalletStatus';
import { EventLogs } from './components/EventLogs';
import { DemoScenarios } from './components/DemoScenarios';
import { TransactionTracking } from './components/TransactionTracking';
import { defaultScenarios } from './scenarios';
import { TonConnectUI } from '@tonconnect/ui';
import { createTonConnectProvider } from '@tonkeeper/instantpay-providers';

export type WalletType = 'real' | 'mock' | 'none';

export const App: Component = () => {
    const [walletType, setWalletType] = createSignal<WalletType>('none');
    const [instantPay, setInstantPay] = createSignal<InstantPay | null>(null);
    const [trackingBoc, setTrackingBoc] = createSignal<string | null>(null);
    

    const isMockWalletEnabled = createMemo(
        () => localStorage.getItem('mockWalletEnabled') === 'true'
    );

    onMount(() => {
        if (isMockWalletEnabled()) {
            initMockWallet();
        }

        // Ensure a mount point exists for TonConnect provider button
        let btnMount = document.querySelector('#tonconnect-pay-button');
        if (!btnMount) {
            const host = document.querySelector('#fallback')?.parentElement || document.body;
            const div = document.createElement('div');
            div.id = 'tonconnect-pay-button';
            div.className = 'mb-3';
            host?.prepend(div);
        }

        // TonConnect UI instance
        const tonconnect = new TonConnectUI({ manifestUrl: `https://tkmessages.mois.pro/tonconnect-manifest.json`, buttonRootId: 'tonconnect-button' });

        // Minimal resolver — can be replaced by backend/offline resolver
        const resolveJettonWalletAddress = async (master: string, owner: string): Promise<string> => {
            const url = new URL('https://tonapi.io/v2/jettons/wallets');
            url.searchParams.set('jetton', master);
            url.searchParams.set('owner', owner);
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Failed to resolve jetton wallet');
            const data = await res.json() as { wallet?: { address?: string }, wallets?: Array<{ address?: string }>, address?: string };
            const candidate = data.wallet?.address || data.address || (Array.isArray(data.wallets) ? data.wallets[0]?.address : undefined) || '';
            return candidate;
        };

        const fallbackProvider = createTonConnectProvider(tonconnect, resolveJettonWalletAddress, {
            mount: '#tonconnect-pay-button',
            className: 'w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-colors'
        });

        // Defer SDK init so children can subscribe first
        const initAfterMount = () => {
            const ip = new InstantPay(fallbackProvider);
            setInstantPay(ip);
            // Set initial wallet type based on synchronous injection status
            setWalletType(ip.isInjected ? (isMockWalletActive() ? 'mock' : 'real') : 'none');
            
            // Listen for 'sent' events to start transaction tracking
            const unsubSent = ip.events.on('sent', (event) => {
                if (event.boc) {
                    setTrackingBoc(event.boc);
                }
            });
            
            // Listen for 'cancelled' and 'voided' events to reset tracking
            const unsubCancelled = ip.events.on('cancelled', () => {
                setTrackingBoc(null);
            });
            const unsubVoided = ip.events.on('voided', () => {
                setTrackingBoc(null);
            });
            
            onCleanup(() => {
                unsubSent();
                unsubCancelled();
                unsubVoided();
            });
        };
        const t = setTimeout(initAfterMount, 0);
        onCleanup(() => clearTimeout(t));

    });

    return (
        <div class="font-sans">
            {/* Full-width status bar */}
            <div class="w-full"> 
                <WalletStatus walletType={walletType()} handshake={instantPay()?.handshake}/>
            </div>

            <div class="max-w-6xl mx-auto p-0 md:p-5">
                {/* Header */}
                    <header class="text-center mb-6 p-5 bg-white rounded-none md:rounded-xl shadow-sm">
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
                    {/* Mount point for TonConnect provider button */}
                    <div id="tonconnect-pay-button"/>
                </div>

                {/* Transaction Tracking */}
                <TransactionTracking boc={trackingBoc()} />

                {/* Scenarios and Logs: scenarios first, then logs on mobile; side-by-side on desktop */}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 lg:min-h-[60vh]">
                    {/* Demo Scenarios */}
                    <DemoScenarios
                        instantPay={instantPay()}
                        walletType={walletType()}
                        scenarios={defaultScenarios}
                    />

                    {/* Event Logs */}
                    <div class="min-h-[360px] lg:h-auto">
                        <EventLogs instantPay={instantPay()} />
                    </div>

                    {/* Instructions */}
                    <div class="bg-white rounded-none md:rounded-xl p-5 shadow-sm lg:col-span-2">
                        <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 class="text-base font-semibold text-blue-900 mb-3">How to Use</h4>
                            <ol class="text-sm text-blue-800 space-y-1 list-decimal ml-4">
                                <li>Click "Run Scenario" to test different InstantPay features</li>
                                <li>Watch the Event Logs panel for real-time feedback</li>
                                <li>Try interacting with the Pay button when it appears</li>
                                <li>After sending a transaction, watch the Transaction Tracking panel</li>
                                <li>Use "Hide Pay Button" to clear the current transaction</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
