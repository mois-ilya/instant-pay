# @tonkeeper/instantpay-sdk

InstantPay SDK for dApp developers. Wraps the wallet-injected `window.tonkeeper.instantPay` API and provides a robust fallback mode.

## Installation

```bash
pnpm add @tonkeeper/instantpay-sdk
```

## Usage

```ts
import { InstantPaySDK } from '@tonkeeper/instantpay-sdk';

const sdk = new InstantPaySDK();
 
```

## Fallback behaviour via fallbackApi

When the wallet is not injected, you can provide a `fallbackApi` that conforms to the `InstantPayAPI` surface (minus `handshake`). The SDK will delegate calls and pipe events 1:1, matching the lifecycle of an injected wallet: `show → click → sent|cancelled`. No extra SDK-specific events are emitted in this mode.

```ts
import { InstantPaySDK, InstantPayEmitter, type PayButtonParams } from '@tonkeeper/instantpay-sdk';

const fallbackApi = {
  setPayButton(params: PayButtonParams) {
    // render your own button and emit events
    emitter.emit({ type: 'show', request: params.request });
  },
  hidePayButton() {
    // hide your UI
  },
  events: new InstantPayEmitter()
};

const sdk = new InstantPaySDK({ fallbackApi });
```

Required at runtime:

- `typeof fallbackApi.setPayButton === 'function'`
- `typeof fallbackApi.hidePayButton === 'function'`
- `fallbackApi.events` supports `on/off/once` per protocol

If these are missing, the SDK throws `Error('Invalid fallbackApi: missing required InstantPayAPI methods/events')`.

Notes:

- In `fallbackApi` mode the SDK does not emit `ready` and does not keep internal fallback state.
- Errors and cancellation reasons coming from `fallbackApi` are passed through unchanged.

## Legacy callbacks (deprecated)

The SDK previously exposed `onFallbackShow/onFallbackHide` to implement a deeplink-based fallback. These are still supported for backward compatibility, but are deprecated in favour of `fallbackApi`.

```ts
const sdk = new InstantPaySDK({
  // DEPRECATED: prefer `fallbackApi`
  onFallbackShow(ctx) {
    // show your UI and call ctx.openDeeplink() on user action
  },
  onFallbackHide() {
    // hide your UI
  }
});
```

## Events

The SDK re-emits wallet protocol events via `sdk.events`:

- `show`
- `click`
- `sent`
- `cancelled`

## Types

All protocol types are re-exported by the SDK, so you can import from `@tonkeeper/instantpay-sdk` directly.

