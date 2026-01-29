import { Component, For, createSignal } from 'solid-js';
import { CodeBlock } from './CodeBlock';

interface CodeExample {
  id: string;
  title: string;
  description: string;
  code: string;
}

const CODE_EXAMPLES: CodeExample[] = [
  {
    id: 'initialization',
    title: 'Initialization',
    description: 'Initialize the SDK with a fallback provider for environments without an injected wallet',
    code: `import { InstantPay } from '@tonkeeper/instantpay-sdk';
import { createTonConnectProvider } from '@tonkeeper/instantpay-providers';
import { TonConnectUI } from '@tonconnect/ui';

// 1. Setup TonConnect
const tonconnect = new TonConnectUI({
  manifestUrl: 'https://example.com/tonconnect-manifest.json'
});

// 2. Create fallback provider
const provider = createTonConnectProvider(tonconnect, {
  mount: '#pay-button'
});

// 3. Initialize SDK
const instantPay = new InstantPay(provider);

// 4. Check wallet status
if (instantPay.isInjected) {
  console.log('Wallet detected!');
  console.log('Capabilities:', instantPay.capabilities);
} else {
  console.log('Using TonConnect fallback');
}`
  },
  {
    id: 'payment-button',
    title: 'Payment Button',
    description: 'Display a payment button for TON or Jetton tokens',
    code: `// TON Payment
instantPay.setPayButton({
  request: {
    amount: '0.1',
    recipient: 'UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL',
    invoiceId: crypto.randomUUID(),
    asset: { type: 'ton', symbol: 'TON', decimals: 9 }
  },
  label: 'buy',
  instantPay: true
});

// Jetton Payment (USDT)
instantPay.setPayButton({
  request: {
    amount: '10',
    recipient: 'UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL',
    invoiceId: crypto.randomUUID(),
    asset: {
      type: 'jetton',
      master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      symbol: 'USDT',
      decimals: 6
    }
  },
  label: 'unlock',
  instantPay: true
});`
  },
  {
    id: 'events',
    title: 'Event Handling',
    description: 'Subscribe to payment events and handle transaction lifecycle',
    code: `// Subscribe to events
const unsubSent = instantPay.events.on('sent', (event) => {
  console.log('Payment successful!');
  console.log('Transaction BOC:', event.boc);

  // Clean up after successful payment
  instantPay.hidePayButton();
});

const unsubCancelled = instantPay.events.on('cancelled', () => {
  console.log('User cancelled the payment');
});

const unsubVoided = instantPay.events.on('voided', () => {
  console.log('Payment voided (expired or replaced)');
});

// Clean up listeners when component unmounts
onCleanup(() => {
  unsubSent();
  unsubCancelled();
  unsubVoided();
});`
  },
  {
    id: 'headless',
    title: 'Headless Payment',
    description: 'Request payment programmatically without displaying a button',
    code: `const result = await instantPay.requestPayment({
  amount: '0.5',
  recipient: 'UQCae11h9N5znylEPRjmuLYGvIwnxkcCw4zVW4BJjVASi5eL',
  invoiceId: crypto.randomUUID(),
  asset: { type: 'ton', symbol: 'TON', decimals: 9 }
});

switch (result.type) {
  case 'sent':
    console.log('Success! BOC:', result.boc);
    // Submit BOC to your backend for verification
    break;

  case 'cancelled':
    console.log('User declined the payment');
    break;

  case 'voided':
    console.log('Request expired or was replaced');
    break;
}`
  }
];

export const CodeExamples: Component = () => {
  const [activeTab, setActiveTab] = createSignal(CODE_EXAMPLES[0].id);
  const activeExample = () => CODE_EXAMPLES.find(e => e.id === activeTab());

  return (
    <div class="bg-surface-content rounded-none md:rounded-xl p-5 shadow-sm lg:col-span-2 border border-surface-tint">
      <h3 class="text-xl font-semibold text-ink-primary mb-4">Code Examples</h3>

      {/* Tab Navigation */}
      <div class="flex flex-wrap gap-2 mb-4 pb-3 border-b border-separator-common">
        <For each={CODE_EXAMPLES}>
          {(example) => (
            <button
              onClick={() => setActiveTab(example.id)}
              class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab() === example.id
                  ? 'bg-brand-blue text-white'
                  : 'bg-surface-tint text-ink-secondary hover:text-ink-primary hover:bg-surface-attention'
              }`}
            >
              {example.title}
            </button>
          )}
        </For>
      </div>

      {/* Active Example */}
      <div class="space-y-3">
        <p class="text-sm text-ink-secondary">{activeExample()?.description}</p>
        <CodeBlock
          code={activeExample()?.code || ''}
          title={`${activeExample()?.title}.ts`}
        />
      </div>
    </div>
  );
};
