# @tonkeeper/instantpay-providers

InstantPay providers for different wallet connections (TonConnect, Deeplink, etc.).

## Available Providers

### TonConnect Provider

TonConnect-based provider for `@tonkeeper/instantpay-sdk`. This provider uses TonConnect UI to handle wallet connections and transactions.

Usage example:

```ts
import { InstantPaySDK } from '@tonkeeper/instantpay-sdk';
import { TonConnectUI } from '@tonconnect/ui';
import { createTonConnectProvider } from '@tonkeeper/instantpay-providers';

const tonconnect = new TonConnectUI({ manifestUrl: 'https://your.app/tonconnect-manifest.json' });
const sdk = new InstantPaySDK({ fallbackApi: createTonConnectProvider(tonconnect) });
```

### Deeplink Provider

Deeplink-based provider for mobile wallets (coming soon). This provider will handle wallet connections via deeplink URLs for mobile wallets that don't support TonConnect.

```ts
import { createDeeplinkProvider } from '@tonkeeper/instantpay-providers';

const deeplinkProvider = createDeeplinkProvider();
// TODO: Implementation in progress
```

## Package Structure

```
packages/providers/
├── src/
│   ├── index.ts              # Main exports
│   ├── tonconnect/           # TonConnect provider implementation
│   │   └── index.ts
│   └── deeplink/             # Deeplink provider (placeholder)
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Adding New Providers

To add a new provider:

1. Create a new folder in `src/` for your provider
2. Implement the `InstantPayProvider` interface
3. Export the provider from the main `index.ts`
4. Update this README with usage examples

Example provider structure:

```ts
// src/new-provider/index.ts
import type { InstantPayProvider, PayButtonParams, PaymentRequest, RequestPaymentResult } from '@tonkeeper/instantpay-protocol';
import { InstantPayEmitter } from '@tonkeeper/instantpay-utils';

export class NewProviderAdapter implements InstantPayProvider {
  public readonly events = new InstantPayEmitter();

  setPayButton(params: PayButtonParams): void {
    // Implementation
  }

  hidePayButton(): void {
    // Implementation
  }

  async requestPayment(request: PaymentRequest): Promise<RequestPaymentResult> {
    // Implementation
  }

  getActive(): { request: PaymentRequest } | null {
    // Implementation
  }
}

export function createNewProvider(): InstantPayProvider {
  return new NewProviderAdapter();
}
```

Then add to main exports:

```ts
// src/index.ts
export { createNewProvider, NewProviderAdapter } from './new-provider';
```

