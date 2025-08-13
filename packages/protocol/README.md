# @tonkeeper/instantpay-protocol

InstantPay protocol package: JSON Schemas and TypeScript types for the wallet-dApp interaction.

## Structure

- `schemas/*.schema.json`
  - Source of truth for data structures that must be validated in any runtime (wallet core, backend, etc.).
  - Includes:
    - `payment-request.schema.json`
    - `pay-button-params.schema.json`
    - `events.schema.json` (references `handshake.schema.json`)
    - `handshake.schema.json`
- `src/types/schema-types.generated.ts`
  - Auto-generated TypeScript types from the JSON Schemas above.
  - Do not edit manually.
- `src/types/injected-api.ts`
  - Hand-written TypeScript interfaces for the injected wallet API surface: `InstantPayAPI`, `Handshake`, etc.
  - Mirrors the protocol specification; used by web (dApp) and wallet UI layers.
- `src/index.ts`
  - Re-exports both generated schema types and injected API interfaces.

## Why split generated vs manual

- JSON Schemas define cross-runtime contracts (validation without TS), ensuring wallets/backends in any language can enforce the same structure.
- The injected API is a developer-friendly TypeScript surface for web integrations (what a wallet injects into `window.tonkeeper.instantPay`). It is not suitable for JSON Schema because it includes functions and complex unions not meant for runtime validation.

## Usage

Install via workspace or npm and import from the package root.

```ts
// Schema-based data models (validated with Ajv or any JSON Schema validator)
import type { PayButtonParams, PaymentRequest, InstantPayEvent } from '@tonkeeper/instantpay-protocol';

// Injected API surface (to implement in wallet, or to type in dApp)
import type { InstantPayAPI, Handshake } from '@tonkeeper/instantpay-protocol';
```

## Codegen

- Types are generated from JSON Schemas into `src/types/schema-types.generated.ts`.
- Generation runs automatically in the package build.

Manual run:

```bash
pnpm --filter @tonkeeper/instantpay-protocol run generate-types
```

## Contributing changes

- For fields validated inside wallet/backends, add/modify the corresponding `*.schema.json` and regenerate types.
- For the injected API surface shape, edit `src/types/injected-api.ts`.
- Keep the JSON Schemas minimal and runtime-friendly; avoid describing functions or UI-only concepts there.

## Versioning

- `Handshake.protocolVersion` is a semver string declared in `injected-api.ts`.
- Schema changes should be compatible with current protocol version or bumped accordingly.