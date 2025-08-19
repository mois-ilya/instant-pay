// Export TonConnect provider
export { 
  createTonConnectProvider, 
  TonConnectAdapter
} from './tonconnect';

// Export jetton resolution utilities
export {
  JettonAddressResolver,
  JettonPacks,
  DEFAULT_TOKENS,
  resolveJettonWalletAddress,
  isJettonResolver,
  isTokenMap,
  type AddressString,
  type Base64Boc,
  type PackDataFn,
  type TokenDefinition,
  type TokenMap,
  type JettonResolver,
  type JettonResolving
} from './tonconnect/jetton-resolver';

// Export Deeplink provider (placeholder implementation)
export { createDeeplinkProvider, DeeplinkAdapter } from './deeplink';

// Future providers will be exported here:
// export { createOtherProvider } from './other';

// Re-export types for convenience
export type { InstantPayProvider } from '@tonkeeper/instantpay-protocol'; 