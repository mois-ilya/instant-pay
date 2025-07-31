# InstantPay 1.0 SDK & Samples

Open-source repository demonstrating how dApps and wallets interact via the **InstantPay 1.0** protocol.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start demo application
npm run demo
# or just
npm start
```

Visit `http://localhost:3000` to see the demo dApp in action.

## 📦 Packages & Apps

| Package/App                                             | Description                  | NPM                                                                                                                       |
| ------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`@tonkeeper/instantpay-sdk`](./packages/sdk)           | Main SDK for dApp developers | [![npm](https://img.shields.io/npm/v/@tonkeeper/instantpay-sdk)](https://www.npmjs.com/package/@tonkeeper/instantpay-sdk) |
| [`@tonkeeper/instantpay-protocol`](./packages/protocol) | Protocol types and schemas   | -                                                                                                                         |
| [`mock-wallet`](./apps/mock-wallet)                     | Mock wallet for testing      | -                                                                                                                         |
| [`demo-dapp`](./apps/demo-dapp)                         | Demo application             | -                                                                                                                         |

## 🔧 Development

```bash
# Build all packages

# Start demo dApp
npm run demo


# Run linting
npm run lint

# Run tests
npm run test

# Clean all builds
npm run clean
```

## 📖 Documentation

-   [Protocol Specification](./PROTOCOL.md) - Technical specification of InstantPay 1.0
-   [Project Specification](./PROJECT_SPEC.md) - Development requirements and architecture
-   [SDK Documentation](./packages/sdk/README.md) - How to integrate InstantPay in your dApp
-   [Wallet Integration](./apps/mock-wallet/README.md) - How to add InstantPay support to wallets

## 🎯 Protocol Overview

InstantPay provides a minimal browser-level interface with exactly **three** public entry points:

-   `setPayButton()` - Render or update the Pay button
-   `hidePayButton()` - Remove the button and cancel active invoice
-   `events` - Event emitter for `click → sent/cancelled` flow

## 🧪 Demo Features

The demo application showcases:

-   ✅ Simple TON payments
-   ✅ Jetton payments
-   ✅ Payment limit handling
-   ✅ Concurrent operation handling
-   ✅ Payment cancellation
-   ✅ Real-time event logging
-   ✅ Connection status indicator
-   ✅ Automatic mock wallet fallback

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Tonkeeper](https://github.com/tonkeeper)
