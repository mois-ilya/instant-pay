# @tonkeeper/instantpay-tonconnect

TonConnect-based fallback provider for `@tonkeeper/instantpay-sdk`.

Usage example:

```ts
import { InstantPaySDK } from '@tonkeeper/instantpay-sdk';
import { TonConnectUI } from '@tonconnect/ui';
import { createTonConnectProvider } from '@tonkeeper/instantpay-tonconnect';

const tonconnect = new TonConnectUI({ manifestUrl: 'https://your.app/tonconnect-manifest.json' });
const sdk = new InstantPaySDK({ fallbackApi: createTonConnectProvider(tonconnect) });
```

