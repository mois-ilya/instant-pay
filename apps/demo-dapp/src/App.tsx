import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { InstantPay as InstantPay } from '@tonkeeper/instantpay-sdk';
import { initMockWallet, isMockWalletActive } from 'mock-wallet';
import { WalletStatus } from './components/WalletStatus';
import { EventLogs } from './components/EventLogs';
import { DemoScenarios } from './components/DemoScenarios';
import { TransactionTracking } from './components/TransactionTracking';
import { CodeExamples } from './components/CodeExamples';
import { defaultScenarios } from './scenarios';
import { TonConnectUI } from '@tonconnect/ui';
import { createTonConnectProvider, createDeeplinkProvider, JettonPacks } from '@tonkeeper/instantpay-providers';

export type WalletType = 'real' | 'mock' | 'none';
export type ProviderMode = 'mock' | 'tonconnect' | 'deeplink';

// Helper to get stored provider mode with migration from legacy key
const getStoredMode = (): ProviderMode => {
    const stored = localStorage.getItem('providerMode');
    if (stored && ['mock', 'tonconnect', 'deeplink'].includes(stored)) {
        return stored as ProviderMode;
    }
    // Migration from legacy mockWalletEnabled
    const legacyMock = localStorage.getItem('mockWalletEnabled');
    if (legacyMock === 'true') {
        localStorage.setItem('providerMode', 'mock');
        localStorage.removeItem('mockWalletEnabled');
        return 'mock';
    }
    localStorage.removeItem('mockWalletEnabled');
    return 'tonconnect';
};

export const App: Component = () => {
    const [walletType, setWalletType] = createSignal<WalletType>('none');
    const [instantPay, setInstantPay] = createSignal<InstantPay | null>(null);
    const [trackingBoc, setTrackingBoc] = createSignal<string | null>(null);
    const [providerMode] = createSignal<ProviderMode>(getStoredMode());

    const handleModeChange = (newMode: ProviderMode) => {
        localStorage.setItem('providerMode', newMode);
        window.location.reload();
    };

    onMount(() => {
        const mode = providerMode();

        // Only inject mock wallet if in mock mode
        if (mode === 'mock') {
            initMockWallet();
        }

        // Ensure a mount point exists for TonConnect provider button
        let btnMount = document.querySelector('#instant-pay-button');
        if (!btnMount) {
            const host = document.querySelector('#fallback')?.parentElement || document.body;
            const div = document.createElement('div');
            div.id = 'instant-pay-button';
            div.className = 'mb-3';
            host?.prepend(div);
        }

        // TonConnect UI instance (needed for tonconnect and mock modes)
        const tonconnect = new TonConnectUI({ manifestUrl: `https://tkmessages.mois.pro/tonconnect-manifest.json`, buttonRootId: 'tonconnect-button' });

        // Create fallback provider based on mode
        const fallbackProvider = mode === 'deeplink'
            ? createDeeplinkProvider()
            : createTonConnectProvider(tonconnect, {
                mount: '#instant-pay-button',
                className: 'w-full text-center bg-button-primary hover:bg-button-primary-hover text-button-primary-fg disabled:bg-button-primary-disabled px-4 py-3 rounded-lg font-semibold text-sm transition-colors'
            }, [{
                asset: {
                    type: 'jetton',
                    master: 'EQBR-4-x7dik6UIHSf_IE6y2i7LdPrt3dLtoilA8sObIquW8',
                    symbol: 'POSASYVAET',
                    decimals: 9
                },
                walletCodeBase64: 'te6ccgECEQEAAyMAART/APSkE/S88sgLAQIBYgIDAgLMBAUAG6D2BdqJofQB9IH0gahhAgHUBgcCASAICQDDCDHAJJfBOAB0NMDAXGwlRNfA/AM4PpA+kAx+gAxcdch+gAx+gAwc6m0AALTH4IQD4p+pVIgupUxNFnwCeCCEBeNRRlSILqWMUREA/AK4DWCEFlfB7y6k1nwC+BfBIQP8vCAAET6RDBwuvLhTYAIBIAoLAIPUAQa5D2omh9AH0gfSBqGAJpj8EIC8aijKkQXUEIPe7L7wndCVj5cWLpn5j9ABgJ0CgR5CgCfQEsZ4sA54tmZPaqQB8VA9M/+gD6QCHwAe1E0PoA+kD6QNQwUTahUirHBfLiwSjC//LiwlQ0QnBUIBNUFAPIUAT6AljPFgHPFszJIsjLARL0APQAywDJIPkAcHTIywLKB8v/ydAE+kD0BDH6ACDXScIA8uLEd4AYyMsFUAjPFnD6AhfLaxPMgMAgEgDQ4AnoIQF41FGcjLHxnLP1AH+gIizxZQBs8WJfoCUAPPFslQBcwjkXKRceJQCKgToIIJycOAoBS88uLFBMmAQPsAECPIUAT6AljPFgHPFszJ7VQC9ztRND6APpA+kDUMAjTP/oAUVGgBfpA+kBTW8cFVHNtcFQgE1QUA8hQBPoCWM8WAc8WzMkiyMsBEvQA9ADLAMn5AHB0yMsCygfL/8nQUA3HBRyx8uLDCvoAUaihggiYloBmtgihggiYloCgGKEnlxBJEDg3XwTjDSXXCwGAPEADXO1E0PoA+kD6QNQwB9M/+gD6QDBRUaFSSccF8uLBJ8L/8uLCBYIJMS0AoBa88uLDghB73ZfeyMsfFcs/UAP6AiLPFgHPFslxgBjIywUkzxZw+gLLaszJgED7AEATyFAE+gJYzxYBzxbMye1UgAHBSeaAYoYIQc2LQnMjLH1Iwyz9Y+gJQB88WUAfPFslxgBDIywUkzxZQBvoCFctqFMzJcfsAECQQIwB8wwAjwgCwjiGCENUydttwgBDIywVQCM8WUAT6AhbLahLLHxLLP8ly+wCTNWwh4gPIUAT6AljPFgHPFszJ7VQ=',
                packData: JettonPacks.standardV1
            }]);

        // Defer SDK init so children can subscribe first
        const initAfterMount = () => {
            const ip = new InstantPay(fallbackProvider);
            setInstantPay(ip);

            // Set wallet type based on injection status
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
        <div class="font-sans bg-surface-page text-ink-primary min-h-screen">
            {/* Full-width status bar */}
            <div class="w-full"> 
                <WalletStatus
                    walletType={walletType()}
                    handshake={instantPay()?.handshake}
                    currentMode={providerMode()}
                    onModeChange={handleModeChange}
                />
            </div>

            <div class="max-w-6xl mx-auto p-0 md:p-5">
                {/* Header */}
                    <header class="text-center mb-6 p-5 bg-surface-content rounded-none md:rounded-xl shadow-sm border border-surface-tint">
                    <h1 class="text-3xl font-bold text-ink-primary mb-2">
                        InstantPay Demo dApp
                    </h1>
                    <p class="text-ink-secondary">
                        Demonstration of all InstantPay protocol features
                    </p>
                </header>

                {/* Fallback button (appears when no wallet is injected) */}
                <div class="mb-5 px-4 md:px-0">
                    <a
                        id="fallback"
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hidden block w-full text-center bg-button-primary hover:bg-button-primary-hover text-button-primary-fg disabled:bg-button-primary-disabled px-4 py-3 rounded-lg font-semibold text-sm transition-colors"
                    >
                        Open in Tonkeeper
                    </a>
                    {/* Mount point for provider button */}
                    <div id="instant-pay-button"/>
                </div>

                {/* Transaction Tracking */}
                <TransactionTracking boc={trackingBoc()} />

                {/* Scenarios and Logs: scenarios first, then logs on mobile; side-by-side on desktop */}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:min-h-[60vh]">
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
                    <div class="bg-surface-content rounded-none md:rounded-xl p-5 shadow-sm lg:col-span-2 border border-surface-tint">
                        <div class="p-4 bg-surface-tint border border-separator-common rounded-lg">
                            <h4 class="text-base font-semibold text-ink-primary mb-3">How to Use</h4>
                            <ol class="text-sm text-ink-secondary space-y-1 list-decimal ml-4">
                                <li>Click "Run Scenario" to test different InstantPay features</li>
                                <li>Watch the Event Logs panel for real-time feedback</li>
                                <li>Try interacting with the Pay button when it appears</li>
                                <li>After sending a transaction, watch the Transaction Tracking panel</li>
                                <li>Use "Hide Pay Button" to clear the current transaction</li>
                            </ol>
                        </div>
                    </div>

                    {/* Code Examples */}
                    <CodeExamples />
                </div>
            </div>
        </div>
    );
};
