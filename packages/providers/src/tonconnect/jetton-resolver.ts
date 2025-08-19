import { Address, beginCell, Cell, contractAddress } from '@ton/core';
import { InstantPayInvalidParamsError } from '@tonkeeper/instantpay-sdk';

// ===== Общие типы =====
export type AddressString = string;   // TON address (user-friendly)
export type Base64Boc = string;       // Cell BOC (base64)

// Собирает data для конкретного jetton wallet (layout токена)
export type PackDataFn = (args: {
  owner: AddressString;          // адрес владельца
  master: AddressString;         // адрес мастер-контракта токена
  walletCodeBase64: Base64Boc;   // BOC кода кошелька (base64)
}) => Base64Boc;

// Описание одного токена (мастер у токена один)
export type TokenDefinition = {
  walletCodeBase64: Base64Boc;
  packData: PackDataFn;
};

// Map: master-address → token description
export type TokenMap = Record<AddressString, TokenDefinition>;

// Universal resolver (full override)
export type JettonResolver = (
  master: AddressString,
  owner: AddressString
) => Promise<AddressString> | AddressString;

// Type of «resolving»: either specific tokens, or universal function
export type JettonResolving = TokenMap | JettonResolver;

// Ready packers (for API users convenience)
export const JettonPacks: {
  /** data = (0, owner, master, ref(code)) */
  standard: PackDataFn;
  /** data = (status:uint4=0, 0, owner, master) */
  usdt: PackDataFn;
} = {
  standard: ({ owner, master, walletCodeBase64 }) => {
    const walletCode = Cell.fromBase64(walletCodeBase64);
    return beginCell()
      .storeUint(0, 1)
      .storeAddress(Address.parse(owner))
      .storeAddress(Address.parse(master))
      .storeRef(walletCode)
      .endCell()
      .toBoc()
      .toString('base64');
  },
  usdt: ({ owner, master }) => {
    return beginCell()
      .storeUint(0, 4)   // status
      .storeCoins(0n)
      .storeAddress(Address.parse(owner))
      .storeAddress(Address.parse(master))
      .endCell()
      .toBoc()
      .toString('base64');
  }
};

// Default tokens
export const DEFAULT_TOKENS: TokenMap = {
  // USDT on mainnet
  'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs': {
    walletCodeBase64: 'te6ccgEBAQEAIwAIQgKPRS16Tf10BmtoI2UXclntBXNENb52tf1L1divK3w9aA==',
    packData: JettonPacks.usdt
  }
};

// Функция для резолвинга адреса jetton wallet
export function resolveJettonWalletAddress(
  master: AddressString,
  owner: AddressString,
  tokenMap: TokenMap
): AddressString {
  const tokenDef = tokenMap[master];
  if (!tokenDef) {
    throw new InstantPayInvalidParamsError(`Unsupported jetton master: ${master}`);
  }

  const masterAddr = Address.parse(master);
  const walletCode = Cell.fromBase64(tokenDef.walletCodeBase64);
  
  const data = Cell.fromBase64(tokenDef.packData({ owner, master, walletCodeBase64: tokenDef.walletCodeBase64 }));
  
  const wallet = contractAddress(masterAddr.workChain, { code: walletCode, data });
  return wallet.toString();
}

// Type guards for determining type of JettonResolving
export function isJettonResolver(resolving: JettonResolving): resolving is JettonResolver {
  return typeof resolving === 'function';
}

export function isTokenMap(resolving: JettonResolving): resolving is TokenMap {
  return typeof resolving === 'object' && resolving !== null && 'walletCodeBase64' in resolving;
}

export function buildResolverFromTokenMap(map: TokenMap): JettonResolver {
  // Валидация и нормализация ключей
  const normalized = new Map<string, TokenDefinition>();

  for (const [masterStr, def] of Object.entries(map)) {
    if (!def || typeof def.walletCodeBase64 !== 'string' || typeof def.packData !== 'function') {
      throw new Error(`[JettonResolver] Invalid TokenDefinition for master ${masterStr}`);
    }
    // Ранняя проверка, что code — валидный BOC
    try { Cell.fromBase64(def.walletCodeBase64); }
    catch { throw new Error(`[JettonResolver] walletCodeBase64 for ${masterStr} is not a valid BOC (base64)`); }

    const key = normalizeAddrKey(masterStr);
    normalized.set(key, def);
  }

  const resolver: JettonResolver = (master: AddressString, owner: AddressString): AddressString => {
    const key = normalizeAddrKey(master);
    const def = normalized.get(key);
    if (!def) {
      throw new Error(`[JettonResolver] Unknown jetton master ${master} (no TokenDefinition found)`);
    }

    // Собираем адрес оффлайн
    const ownerAddr  = Address.parse(owner);
    const masterAddr = Address.parse(master);

    const codeCell = Cell.fromBase64(def.walletCodeBase64);

    let dataCell: Cell;
    try {
      const dataBoc = def.packData({
        owner: ownerAddr.toString(),
        master: masterAddr.toString(),
        walletCodeBase64: def.walletCodeBase64,
      });
      dataCell = Cell.fromBase64(dataBoc);
    } catch (e) {
      throw new Error(`[JettonResolver] packData failed for ${master}: ${(e as Error).message || e}`);
    }

    const wallet = contractAddress(masterAddr.workChain, { code: codeCell, data: dataCell });
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

  constructor(resolving: JettonResolving = {}) {
    this.jettonResolver = typeof resolving === 'function'
      ? resolving
      : buildResolverFromTokenMap({ ...DEFAULT_TOKENS, ...resolving as TokenMap });
  }

  async resolveJettonWallet(master: AddressString, owner: AddressString): Promise<AddressString> {
    const result = this.jettonResolver(master, owner);
    return result instanceof Promise ? result : Promise.resolve(result);
  }
} 