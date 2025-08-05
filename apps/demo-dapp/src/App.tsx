import { Component, createSignal, onMount } from 'solid-js';
import { InstantPayAPI, IPEvent } from '@tonkeeper/instantpay-sdk';
// import { initMockWallet } from 'mock-wallet'; // TODO: Implement mock wallet
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

    // TODO: Implement mock wallet injection
    // const mockWallet = initMockWallet();
    // if (mockWallet) {
    //   setWalletType('mock');
    //   setInstantPay(mockWallet);
    //   setupEventListeners(mockWallet);
    // } else {
    //   setWalletType('none');
    // }
    
    // For now, just set to 'none' if no real wallet
    setWalletType('none');
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
    <div style={{
      'max-width': '1200px',
      'margin': '0 auto',
      'padding': '20px',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      {/* Header */}
      <header style={{
        'text-align': 'center',
        'margin-bottom': '40px',
        'padding': '20px',
        'background': 'white',
        'border-radius': '12px',
        'box-shadow': '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 'margin': '0 0 10px 0', 'color': '#2c3e50' }}>
          InstantPay Demo dApp
        </h1>
        <p style={{ 'margin': '0', 'color': '#7f8c8d', 'font-size': '16px' }}>
          Demonstration of all InstantPay protocol features
        </p>
      </header>

      <div style={{
        'display': 'grid',
        'grid-template-columns': '1fr 1fr',
        'gap': '20px',
        'margin-bottom': '20px'
      }}>
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