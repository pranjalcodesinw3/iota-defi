/**
 * IOTA DeFi Protocol Network Configuration
 *
 * Contains all network-specific configuration including:
 * - Contract addresses and package IDs
 * - RPC endpoints and network settings
 * - Token configurations
 * - Oracle and governance parameters
 */

export type NetworkType = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export interface NetworkConfig {
  NETWORK: NetworkType;
  RPC_URL: string;
  EXPLORER_URL: string;
  FAUCET_URL?: string;

  // Core Protocol Contracts
  DEFI_PROTOCOL_PACKAGE_ID: string;
  NFT_MARKETPLACE_PACKAGE_ID: string;

  // Protocol Objects
  PROTOCOL_STATE_ID: string;
  MARKETPLACE_STATE_ID: string;

  // Token Treasury Capabilities (Admin only)
  DFI_TREASURY_CAP_ID?: string;
  YLD_TREASURY_CAP_ID?: string;
  STBL_TREASURY_CAP_ID?: string;
  UTL_TREASURY_CAP_ID?: string;

  // Oracle Configuration
  PRICE_ORACLE_REGISTRY_ID: string;
  ORACLE_UPDATE_INTERVAL: number; // milliseconds

  // Governance Configuration
  GOVERNANCE_VOTING_DELAY: number; // blocks
  GOVERNANCE_VOTING_PERIOD: number; // blocks
  GOVERNANCE_EXECUTION_DELAY: number; // blocks

  // Fee Configuration
  DEFAULT_SLIPPAGE: number; // basis points
  MAX_SLIPPAGE: number; // basis points
  GAS_BUDGET: number; // MIST
}

// Development/Testnet Configuration
const TESTNET_CONFIG: NetworkConfig = {
  NETWORK: 'testnet',
  RPC_URL: 'https://api.testnet.iota.cafe',
  EXPLORER_URL: 'https://explorer.iota.cafe/testnet',
  FAUCET_URL: 'https://faucet.testnet.iota.cafe',

  // These would be populated after contract deployment
  DEFI_PROTOCOL_PACKAGE_ID: '0x1234567890abcdef1234567890abcdef12345678',
  NFT_MARKETPLACE_PACKAGE_ID: '0xabcdef1234567890abcdef1234567890abcdef12',

  PROTOCOL_STATE_ID: '0x1111111111111111111111111111111111111111',
  MARKETPLACE_STATE_ID: '0x2222222222222222222222222222222222222222',

  PRICE_ORACLE_REGISTRY_ID: '0x3333333333333333333333333333333333333333',
  ORACLE_UPDATE_INTERVAL: 60000, // 1 minute

  GOVERNANCE_VOTING_DELAY: 17280, // ~24 hours in blocks
  GOVERNANCE_VOTING_PERIOD: 120960, // ~7 days in blocks
  GOVERNANCE_EXECUTION_DELAY: 172800, // ~24 hours delay

  DEFAULT_SLIPPAGE: 50, // 0.5%
  MAX_SLIPPAGE: 5000, // 50%
  GAS_BUDGET: 10_000_000, // 0.01 SUI
};

// Production/Mainnet Configuration
const MAINNET_CONFIG: NetworkConfig = {
  NETWORK: 'mainnet',
  RPC_URL: 'https://api.mainnet.iota.cafe',
  EXPLORER_URL: 'https://explorer.iota.cafe',

  // Production contract addresses (would be set after mainnet deployment)
  DEFI_PROTOCOL_PACKAGE_ID: '0x0000000000000000000000000000000000000000',
  NFT_MARKETPLACE_PACKAGE_ID: '0x0000000000000000000000000000000000000000',

  PROTOCOL_STATE_ID: '0x0000000000000000000000000000000000000000',
  MARKETPLACE_STATE_ID: '0x0000000000000000000000000000000000000000',

  PRICE_ORACLE_REGISTRY_ID: '0x0000000000000000000000000000000000000000',
  ORACLE_UPDATE_INTERVAL: 30000, // 30 seconds for production

  GOVERNANCE_VOTING_DELAY: 17280,
  GOVERNANCE_VOTING_PERIOD: 120960,
  GOVERNANCE_EXECUTION_DELAY: 172800,

  DEFAULT_SLIPPAGE: 50,
  MAX_SLIPPAGE: 5000,
  GAS_BUDGET: 10_000_000,
};

// Local development configuration
const LOCALNET_CONFIG: NetworkConfig = {
  NETWORK: 'localnet',
  RPC_URL: 'http://127.0.0.1:9000',
  EXPLORER_URL: 'http://localhost:9001',
  FAUCET_URL: 'http://127.0.0.1:9123/gas',

  DEFI_PROTOCOL_PACKAGE_ID: '0xlocal_defi_package',
  NFT_MARKETPLACE_PACKAGE_ID: '0xlocal_nft_package',

  PROTOCOL_STATE_ID: '0xlocal_protocol_state',
  MARKETPLACE_STATE_ID: '0xlocal_marketplace_state',

  PRICE_ORACLE_REGISTRY_ID: '0xlocal_oracle_registry',
  ORACLE_UPDATE_INTERVAL: 5000, // 5 seconds for testing

  GOVERNANCE_VOTING_DELAY: 100, // Faster for testing
  GOVERNANCE_VOTING_PERIOD: 1000,
  GOVERNANCE_EXECUTION_DELAY: 100,

  DEFAULT_SLIPPAGE: 100, // 1% for testing
  MAX_SLIPPAGE: 5000,
  GAS_BUDGET: 100_000_000, // Higher for testing
};

// Network configuration mapping
const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mainnet: MAINNET_CONFIG,
  testnet: TESTNET_CONFIG,
  devnet: TESTNET_CONFIG, // Use testnet config for devnet
  localnet: LOCALNET_CONFIG,
};

// Current network (can be overridden by environment variable)
export const CURRENT_NETWORK: NetworkType = (process.env.REACT_APP_NETWORK as NetworkType) || 'testnet';

// Export current network configuration
export const NETWORK_CONFIG = NETWORK_CONFIGS[CURRENT_NETWORK];

// Token configuration
export const TOKENS = {
  DFI: {
    symbol: 'DFI',
    name: 'DeFi Governance Token',
    decimals: 9,
    coingeckoId: 'iota-defi-token',
    color: '#6366f1',
  },
  YLD: {
    symbol: 'YLD',
    name: 'Yield Token',
    decimals: 9,
    coingeckoId: 'iota-yield-token',
    color: '#10b981',
  },
  STBL: {
    symbol: 'STBL',
    name: 'Stability Token',
    decimals: 9,
    coingeckoId: 'iota-stable-token',
    color: '#f59e0b',
  },
  UTL: {
    symbol: 'UTL',
    name: 'Utility Token',
    decimals: 9,
    coingeckoId: 'iota-utility-token',
    color: '#ef4444',
  },
  IOTA: {
    symbol: 'IOTA',
    name: 'IOTA',
    decimals: 6,
    coingeckoId: 'iota',
    color: '#131F37',
  },
} as const;

// Pool configuration for AMM
export const POOLS = {
  'DFI-UTL': {
    tokenA: TOKENS.DFI,
    tokenB: TOKENS.UTL,
    isStable: false,
    fee: 30, // 0.3%
  },
  'YLD-STBL': {
    tokenA: TOKENS.YLD,
    tokenB: TOKENS.STBL,
    isStable: true,
    fee: 5, // 0.05% for stable pairs
  },
  'DFI-IOTA': {
    tokenA: TOKENS.DFI,
    tokenB: TOKENS.IOTA,
    isStable: false,
    fee: 30,
  },
  'UTL-IOTA': {
    tokenA: TOKENS.UTL,
    tokenB: TOKENS.IOTA,
    isStable: false,
    fee: 30,
  },
} as const;

// NFT rarity configuration
export const NFT_RARITIES = {
  1: {
    name: 'Common',
    color: '#9ca3af',
    probability: 0.6,
    baseValue: 1,
  },
  2: {
    name: 'Uncommon',
    color: '#10b981',
    probability: 0.25,
    baseValue: 2.5,
  },
  3: {
    name: 'Rare',
    color: '#3b82f6',
    probability: 0.1,
    baseValue: 5,
  },
  4: {
    name: 'Epic',
    color: '#8b5cf6',
    probability: 0.04,
    baseValue: 12.5,
  },
  5: {
    name: 'Legendary',
    color: '#f59e0b',
    probability: 0.01,
    baseValue: 25,
  },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  PRICE_FEEDS: 'https://api.coingecko.com/api/v3',
  INDEXER: `${NETWORK_CONFIG.RPC_URL}`,
  ANALYTICS: 'https://analytics.iotadefi.com',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_PREFERENCE: 'iota-defi-wallet-preference',
  THEME: 'iota-defi-theme',
  SLIPPAGE_TOLERANCE: 'iota-defi-slippage',
  TRANSACTION_HISTORY: 'iota-defi-tx-history',
  USER_PREFERENCES: 'iota-defi-user-prefs',
} as const;

// Application constants
export const APP_CONFIG = {
  APP_NAME: 'IOTA DeFi Protocol',
  VERSION: '1.0.0',
  DESCRIPTION: 'Advanced DeFi platform built on IOTA',
  SOCIAL_LINKS: {
    twitter: 'https://twitter.com/iotadefi',
    discord: 'https://discord.gg/iota',
    github: 'https://github.com/iota-community/iota-defi-protocol',
    docs: 'https://docs.iotadefi.com',
  },
  SUPPORTED_WALLETS: [
    'IOTA Wallet',
    'Firefly Wallet',
    'TanglePay Wallet',
    'Bloom Wallet',
  ],
} as const;

// Feature flags
export const FEATURES = {
  YIELD_FARMING: true,
  NFT_MARKETPLACE: true,
  GOVERNANCE: true,
  ORACLE_PRICES: true,
  ANALYTICS: true,
  FRACTIONAL_NFTS: true,
  CROSS_CHAIN: false, // Future feature
} as const;