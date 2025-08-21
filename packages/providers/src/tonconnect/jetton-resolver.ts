import { Address, beginCell, Cell, contractAddress } from '@ton/core';
import { Asset } from '@tonkeeper/instantpay-sdk';

// ===== Общие типы =====
export type AddressString = string;   // TON address (user-friendly)
export type Base64Boc = string;       // Cell BOC (base64)

// Собирает data для конкретного jetton wallet (layout токена)
export type PackDataFn = (args: {
  owner: AddressString;          // адрес владельца
  master: AddressString;         // адрес мастер-контракта токена
  walletCodeBase64?: Base64Boc;   // BOC кода кошелька (base64)
}) => Base64Boc;


// Описание одного токена (мастер у токена один)
export type JettonDefinition = {
  asset: Extract<Asset, { type: 'jetton' }>;
  walletCodeBase64: Base64Boc;
  packData: PackDataFn;
};

// Universal resolver (full override)
export type JettonResolver = (
  master: AddressString,
  owner: AddressString
) => Promise<AddressString> | AddressString;

// Type of «resolving»: either specific tokens, or universal function
export type JettonResolving = JettonDefinition[] | JettonResolver;

// Ready packers (for API users convenience)
export const JettonPacks: {
  /** data = (0, owner, master, ref(code)) */
  standardV1: PackDataFn;
  /** data = (status:uint4=0, 0, owner, master) */
  standardV1R2: PackDataFn;
  /** data = (0, owner, master) */
  standardV2: PackDataFn;
} = {
  standardV1: ({ owner, master, walletCodeBase64 }) => {
    if (!walletCodeBase64) {
      throw new Error('walletCodeBase64 is required');
    }

    const walletCode = Cell.fromBase64(walletCodeBase64);

    const data = beginCell()
      .storeCoins(0n)                        // balance
      .storeAddress(Address.parse(owner))    // owner
      .storeAddress(Address.parse(master))   // jetton_master
      .storeRef(walletCode)                  // wallet_code
      .endCell();

    return data.toBoc().toString('base64');
  },
  standardV1R2: ({ owner, master }) => {
    return beginCell()
      .storeUint(0, 4)   // status
      .storeCoins(0n)
      .storeAddress(Address.parse(owner))
      .storeAddress(Address.parse(master))
      .endCell()
      .toBoc()
      .toString('base64');
  },
  standardV2: ({ owner, master }) => {
    return beginCell()  // status
      .storeCoins(0n)
      .storeAddress(Address.parse(owner))
      .storeAddress(Address.parse(master))
      .endCell()
      .toBoc()
      .toString('base64');
  }
};

// Default tokens
export const DEFAULT_TOKENS: JettonDefinition[] = [
  // USDT on mainnet
  {
    asset: {
      type: 'jetton',
      master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      symbol: 'USDT',
      decimals: 6
    },
    walletCodeBase64: 'te6ccgEBAQEAIwAIQgKPRS16Tf10BmtoI2UXclntBXNENb52tf1L1divK3w9aA==',
    packData: JettonPacks.standardV1R2
  }
];

// Функция для резолвинга адреса jetton wallet
// export function resolveJettonWalletAddress(
//   master: AddressString,
//   owner: AddressString,
//   tokenMap: TokenMap
// ): AddressString {
//   const tokenDef = tokenMap[master];
//   if (!tokenDef) {
//     throw new InstantPayInvalidParamsError(`Unsupported jetton master: ${master}`);
//   }

//   const masterAddr = Address.parse(master);
//   const walletCode = Cell.fromBase64(tokenDef.walletCodeBase64);
  
//   const data = Cell.fromBase64(tokenDef.packData({ owner, master }));
  
//   const wallet = contractAddress(masterAddr.workChain, { code: walletCode, data });
//   return wallet.toString();
// }

// Type guards for determining type of JettonResolving
export function isJettonResolver(resolving: JettonResolving): resolving is JettonResolver {
  return typeof resolving === 'function';
}

export function isTokenMap(resolving: JettonResolving): resolving is JettonDefinition[] {
  return typeof resolving === 'object' && resolving !== null && 'walletCodeBase64' in resolving;
}

export function buildResolverFromTokenMap(jettonDefinitions: JettonDefinition[]): JettonResolver {
  // Валидация и нормализация ключей
  const normalized = new Map<string, JettonDefinition>();

  jettonDefinitions.forEach(definition => {
    const { asset, walletCodeBase64, packData } = definition;
    if (typeof walletCodeBase64 !== 'string' || typeof packData !== 'function') {
      throw new Error(`[JettonResolver] Invalid JettonDefinition for master ${asset.master}`);
    }

    // Ранняя проверка, что code — валидный BOC
    try { Cell.fromBase64(walletCodeBase64); }
    catch { throw new Error(`[JettonResolver] walletCodeBase64 for ${asset.master} is not a valid BOC (base64)`); }
    if (normalized.has(asset.master)) {
      throw new Error(`[JettonResolver] Duplicate jetton master ${asset.master}`);
    }

    const key = normalizeAddrKey(asset.master);
    normalized.set(key, definition);
  })

  const resolver: JettonResolver = (master: AddressString, owner: AddressString): AddressString => {
    const key = normalizeAddrKey(master);
    const def = normalized.get(key);
    if (!def) {
      throw new Error(`[JettonResolver] Unknown jetton master ${master} (no JettonDefinition found)`);
    }

    // build jetton wallet address offline
    const ownerAddr  = Address.parse(owner);
    const masterAddr = Address.parse(master);
    const codeCell = Cell.fromBase64(def.walletCodeBase64);

    let initDataCell: Cell;
    try {
      const dataBoc = def.packData({
        owner: ownerAddr.toString(),
        master: masterAddr.toString(),
        walletCodeBase64: def.walletCodeBase64
      });
      initDataCell = Cell.fromBase64(dataBoc);
    } catch (e) {
      throw new Error(`[JettonResolver] packData failed for ${master}: ${(e as Error).message || e}`);
    }

    const wallet = contractAddress(masterAddr.workChain, { code: codeCell, data: initDataCell });
    return wallet.toString();
  };

  return resolver;
}


function normalizeAddrKey(a: string): string {
  return Address.parse(a).toString({ bounceable: false });
}

// Class for managing jetton address resolving
export class JettonAddressResolver {
  private readonly jettonResolver: JettonResolver;

  constructor(resolving: JettonResolving = []) {
    
    this.jettonResolver = typeof resolving === 'function'
      ? resolving
      : buildResolverFromTokenMap([ ...DEFAULT_TOKENS, ...resolving ]);
  }

  async resolveJettonWallet(master: AddressString, owner: AddressString): Promise<AddressString> {
    const result = this.jettonResolver(master, owner);
    return result instanceof Promise ? result : Promise.resolve(result);
  }
} 