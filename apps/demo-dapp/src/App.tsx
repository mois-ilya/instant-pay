import { Component, createSignal, onMount } from 'solid-js';
import { InstantPayAPI, IPEvent } from '@tonkeeper/instantpay-sdk';
// import { initMockWallet } from 'mock-wallet';
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
  const [instantPay, setInstantPay] = createSignal<InstantPayAPI | null>(null);
  const [events, setEvents] = createSignal<IPEvent[]>([]);

  // Initialize wallet detection and mock injection
  onMount(() => {
    checkAndInitWallet();
  });

  const checkAndInitWallet = () => {
    // Check if real wallet is present
    if (window.tonkeeper?.instantPay) {
      setWalletType('real');
      setInstantPay(window.tonkeeper.instantPay);
      setupEventListeners(window.tonkeeper.instantPay);
      return;
    }

    // Initialize mock wallet if no real wallet present
    // const mockWallet = initMockWallet();
    // if (mockWallet) {
    //   setWalletType('mock');
    //   setInstantPay(mockWallet);
    //   setupEventListeners(mockWallet);
    // } else {
    //   setWalletType('none');
    // }
  };

  const setupEventListeners = (api: InstantPayAPI) => {
    // Listen to all InstantPay events
    const eventTypes: IPEvent['type'][] = ['click', 'sent', 'cancelled'];
    
    eventTypes.forEach((eventType) => {
      api.events.on(eventType, (event) => {
        console.log('InstantPay event:', event);
        // Add event to the beginning of the array (newest first)
        setEvents(prev => [event, ...prev]);
      });
    });
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div class="max-w-6xl mx-auto p-5 font-sans">
      {/* Header */}
      <header class="text-center mb-10 p-5 bg-white rounded-xl shadow-sm">
        <h1 class="text-3xl font-bold text-slate-800 mb-2">InstantPay Demo dApp</h1>
        <p class="text-slate-600">Demonstration of all InstantPay protocol features</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Wallet Status */}
        <WalletStatus 
          walletType={walletType()} 
          config={instantPay()?.config}
        />

        {/* Event Logs */}
        <EventLogs 
          events={events()} 
          onClear={clearEvents}
        />
      </div>

      {/* Demo Scenarios */}
      <DemoScenarios 
        instantPay={instantPay()}
        walletType={walletType()}
      />
    </div>
  );
};