import { Component, createMemo, createSignal, onMount } from 'solid-js';
import { InstantPay, InstantPayAPI } from '@tonkeeper/instantpay-sdk';
import { initMockWallet } from 'mock-wallet';
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
        setWalletType(isMockWalletEnabled() ? 'mock' : 'real');

        const _instantPay = new InstantPay();
        setInstantPay(_instantPay);
    });

    return (
        <div class="max-w-6xl mx-auto p-5 font-sans">
            {/* Header */}
            <header class="text-center mb-10 p-5 bg-white rounded-xl shadow-sm">
                <h1 class="text-3xl font-bold text-slate-800 mb-2">
                    InstantPay Demo dApp
                </h1>
                <p class="text-slate-600">
                    Demonstration of all InstantPay protocol features
                </p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                {/* Wallet Status */}
                <WalletStatus
                    walletType={walletType()}
                    config={instantPay()?.config}
                />

                {/* Event Logs */}
                <EventLogs instantPay={instantPay()} />
            </div>

            {/* Demo Scenarios */}
            <DemoScenarios
                instantPay={instantPay()}
                walletType={walletType()}
            />
        </div>
    );
};
