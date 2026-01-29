# InstantPay Protocol

A prototype of a fast payment protocol for TON. Allows dApps to accept micropayments via a native wallet button without revealing the user's address until the moment of payment.

## Concept

The wallet injects `window.tonkeeper.instantPay`. The dApp describes the payment — the wallet renders the button. Payments under the limit (~1 TON) go through without confirmation.

## API

```typescript
import { InstantPaySDK } from '@tonkeeper/instantpay-sdk';
import { createTonConnectProvider } from '@tonkeeper/instantpay-providers';

const sdk = new InstantPaySDK(createTonConnectProvider(tonconnect));

// Show pay button
sdk.setPayButton({
  request: {
    amount: '0.1',
    recipient: 'UQCae11h...',
    invoiceId: crypto.randomUUID(),
    asset: { type: 'ton' }
  },
  label: 'buy'
});

// Hide button
sdk.hidePayButton();

// Events
sdk.events.on('sent', (e) => console.log('BOC:', e.boc));
sdk.events.on('cancelled', (e) => console.log('Reason:', e.reason));
```

## Types

```typescript
interface PaymentRequest {
  amount: string;           // "0.1"
  recipient: string;        // TON address
  invoiceId: string;        // UUID
  asset: { type: 'ton' } | { type: 'jetton'; master: string };
  expiresAt?: number;       // UNIX timestamp
}

type Label = 'buy' | 'unlock' | 'use' | 'get' | 'open' | 'start' | 'retry' | 'show' | 'play' | 'try';
```

## Events

| Event | When | Data |
|-------|------|------|
| `show` | Button displayed | `request` |
| `click` | User clicked | `request` |
| `sent` | Transaction sent | `request`, `boc` |
| `voided` | Cancelled before click | `request`, `reason` |
| `cancelled` | Cancelled after click | `request`, `reason` |

## Use Cases

**In-game micropayments** — purchase items without interrupting gameplay

**Paid content** — unlock articles, videos

**Subscriptions** — plan selection with instant activation

## Structure

```
packages/
├── protocol/    # JSON Schema + types
├── sdk/         # InstantPaySDK
├── providers/   # TonConnect, Deeplink adapters
└── utils/       # Event emitter, decimals
apps/
├── demo-dapp/   # Interactive demo
└── mock-wallet/ # Test wallet
```

## Run Demo

```bash
pnpm install
pnpm dev
```

## Status

Prototype. See [PROTOCOL.md](./PROTOCOL.md) for the full specification.
