# InstantPay 1.0 SDK & Samples

**Version 0.1 — 31 July 2025**

---

## 1 · Goal

Create an open‑source repository that demonstrates how a dApp and a wallet interact via **InstantPay 1.0**. The repository must:

1. Publish an **npm package** `instantpay-sdk` that implements the typed API `window.tonkeeper.instantPay`.
2. Provide a **demo dApp** that showcases every InstantPay capability and serves as a test bed and learning playground.
3. Deliver a **mock wallet** that illustrates the wallet‑side InstantPay integration and auto‑attaches when no real wallet is present.
4. Keep **business logic** and **UI** clearly separated so the code remains easy to grasp for dApp developers, wallet authors, and SDK maintainers.

---

## 2 · Scope

| Included                                           | Not included          |
| -------------------------------------------------- | --------------------- |
| Mock wallet (serves as a reference implementation) | Seed‑phrase storage   |
| Demo dApp covering the full feature set            | Full e‑commerce flows |
| `instantpay-sdk` package (types, validation)      | Jetton issuance       |
| CI: linting, tests, build                          | Marketing website     |

---

## 3 · Architecture

```text
repo/
 ├─ packages/
 │   ├─ protocol/           # JSON Schemas & TS‑type generator
 │   ├─ sdk/                # sdk: validation, events, types
 │   ├─ wallet-mock/        # mock wallet built with Solid
 │   └─ dapp-demo/          # demo dApp built with Solid
 ├─ docs/
 └─ .github/
```

| Package             | Purpose                                                | Tech stack                            |
| ------------------- | ------------------------------------------------------ | ------------------------------------- |
| **protocol**        | JSON Schema definitions + TS‑type generation           | JSON Schema, ts-json-schema-generator |
| **sdk**             | Types, validation, events (relies on `protocol` types) | TypeScript                            |
| **wallet-mock**     | Mock wallet (Solid UI)                                 | TypeScript, SolidJS, Vite             |
| **dapp-demo**       | UI demo that exercises every scenario                  | TypeScript, SolidJS, Vite             |

---

## 4 · User Stories

| ID           | Persona / Role                  | User Story                                                                                                                                           | Acceptance Criteria                                                                                                                                                                                                                                 |
| ------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SDK**      | dApp / wallet developer         | *As a developer, I want to install the package **\`\`** so I instantly get a typed **`window.tonkeeper.instantPay`** API.*                           | – `npm i @tonkeeper/instantpay-sdk` finishes with no peer warnings.– All TypeScript types generated from `protocol` are available in the IDE.                                                                                                       |
| **DEMO**     | Beginner dApp developer         | *As a newcomer, I want to run the demo dApp and walk through all protocol scenarios (success, cancel, limit, jetton) to understand the integration.* | – `npm install` and `npm start` spin up a local server with zero extra steps.– The page shows **Event Logs** – a reactive list of InstantPay events.– UI displays the **connection status**: “Real Wallet”, “Mock Wallet”, or “No Wallet”.          |
| **MOCK**     | Wallet developer                | *As a wallet developer, I want to study the mock implementation so I can build InstantPay support on the wallet side.*                               | – The object `window.tonkeeper.instantPay` is fully implemented, covering all scenarios (confirmation, cancel, limit error, concurrent error, jetton).– The mock UI bears a “Mock Wallet” badge and offers controls to confirm/cancel transactions. |
| **FALLBACK** | User without a wallet installed | *As a user with no wallet installed, I still want to try the dApp to see how it would work.*                                                         | – If `window.tonkeeper?.instantPay` is missing, the demo dApp automatically injects the mock wallet.– If a real wallet is present, the mock does **not** activate.– UI clearly indicates which mode is active.                                      |

---

## 5 · Engineering Principles

1. **Modern stack only.** Use up‑to‑date tooling: Node LTS‑1, TypeScript ≥ 5.x, Vite ≥ 5, Solid ≥ 1.8. Any dependency untouched for 12 months must be justified in the PR.
2. **Simplicity by default.** Add new abstractions or external libraries only when they bring clear value (readability, testability, performance). Over‑engineering is treated as a review defect.
3. **Single source of truth.** Every API change starts with editing the JSON Schema in `protocol/`; CI ensures generated types stay in sync.
