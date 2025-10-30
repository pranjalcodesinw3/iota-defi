/**
 * TypeScript interfaces and types for DeFi protocol
 */

// Base types
export interface IOTAAmount {
  value: bigint;
  formatted: string;
  symbol: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  address?: string;
}

export interface TransactionResult {
  success: boolean;
  digest: string;
  effects?: any;
  events?: any[];
}

export interface ContractError extends Error {
  code: string;
  details?: any;
  transaction?: string;
}

// Wallet related
export interface WalletConnectionState {
  isConnected: boolean;
  address: string | null;
  balance: bigint | null;
  network: string;
}

export interface WalletError extends Error {
  code: 'CONNECTION_FAILED' | 'NETWORK_MISMATCH' | 'INSUFFICIENT_FUNDS' | 'USER_REJECTED';
  details?: any;
}

// Lending protocol
export interface LendingPosition {
  id: string;
  user: string;
  asset: string;
  amount: bigint;
  interestRate: number;
  accruedInterest: bigint;
  lastUpdateTime: number;
  type: 'supply' | 'borrow';
}

export interface LendingPool {
  asset: string;
  totalSupplied: bigint;
  totalBorrowed: bigint;
  utilizationRate: number;
  supplyAPY: number;
  borrowAPY: number;
  reserveFactor: number;
  liquidationThreshold: number;
  collateralFactor: number;
  available: bigint;
}

export interface LendingPoolStats {
  totalValueLocked: bigint;
  totalBorrowed: bigint;
  numberOfPositions: number;
  averageUtilization: number;
}

// Staking protocol
export interface StakingPosition {
  id: string;
  user: string;
  amount: bigint;
  rewards: bigint;
  lockPeriod: number;
  startTime: number;
  endTime: number;
  apy: number;
  status: 'active' | 'unlocked' | 'withdrawn';
}

export interface StakingPool {
  id: string;
  name: string;
  description: string;
  apy: number;
  lockPeriod: number; // in seconds
  minAmount: bigint;
  maxAmount?: bigint;
  totalStaked: bigint;
  rewardRate: bigint;
  lastUpdateTime: number;
}

export interface StakingStats {
  totalValueLocked: bigint;
  totalRewardsDistributed: bigint;
  totalStakers: number;
  averageStakingPeriod: number;
  poolHealth: number; // percentage
}

// Liquidity protocol
export interface LiquidityPool {
  id: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: bigint;
  reserveB: bigint;
  totalShares: bigint;
  fee: number; // percentage
  volume24h: bigint;
  fees24h: bigint;
  totalLiquidity: bigint;
  exchangeRate: number;
}

export interface LiquidityPosition {
  id: string;
  user: string;
  poolId: string;
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  shares: bigint;
  shareOfPool: number; // percentage
  fee: number;
  createdAt: number;
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  exchangeRate: number;
  priceImpact: number;
  tradingFee: bigint;
  route: string[];
  slippage: number;
}

export interface SwapTransaction {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  recipient: string;
  deadline: number;
}

// Governance
export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  target: string;
  calldata: string;
  startTime: number;
  endTime: number;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed';
  quorumReached: boolean;
}

export interface Vote {
  proposalId: string;
  voter: string;
  support: 'for' | 'against' | 'abstain';
  votingPower: bigint;
  timestamp: number;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVotes: bigint;
  participationRate: number;
  treasuryBalance: bigint;
}

// NFT and Gaming
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  external_url?: string;
}

export interface GameAsset {
  id: string;
  tokenId: string;
  owner: string;
  metadata: NFTMetadata;
  level: number;
  experience: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stats: Record<string, number>;
}

export interface MarketplaceListing {
  id: string;
  seller: string;
  asset: GameAsset;
  price: bigint;
  currency: string;
  listingTime: number;
  expirationTime: number;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Analytics and metrics
export interface ProtocolMetrics {
  totalValueLocked: bigint;
  totalVolume24h: bigint;
  totalUsers: number;
  totalTransactions: number;
  averageTransactionValue: bigint;
  protocolRevenue: bigint;
}

export interface UserMetrics {
  totalDeposits: bigint;
  totalBorrows: bigint;
  totalStaked: bigint;
  totalRewards: bigint;
  portfolioValue: bigint;
  riskScore: number;
}

// Events
export interface ProtocolEvent {
  id: string;
  type: 'supply' | 'borrow' | 'stake' | 'swap' | 'governance' | 'nft';
  user: string;
  amount?: bigint;
  asset?: string;
  details: Record<string, any>;
  timestamp: number;
  blockHeight: number;
  transactionHash: string;
}

// Configuration
export interface ProtocolConfig {
  packageId: string;
  networkUrl: string;
  supportedTokens: TokenInfo[];
  stakingPools: StakingPool[];
  governance: {
    votingPeriod: number;
    executionDelay: number;
    proposalThreshold: bigint;
    quorum: number;
  };
  liquidityMining: {
    rewardToken: string;
    emissionRate: bigint;
    distributionPeriod: number;
  };
}

// Hook return types
export interface UseContractResult {
  isLoading: boolean;
  error: ContractError | null;
  lastTransactionId: string | null;
  executeTransaction: (functionName: string, args?: any[], typeArgs?: string[]) => Promise<any>;
  readOnlyCall: (functionName: string, args?: any[], typeArgs?: string[]) => Promise<any>;
  clearError: () => void;
}

export interface UseDeFiProtocolResult extends UseContractResult {
  lending: {
    supply: (asset: string, amount: string) => Promise<TransactionResult>;
    withdraw: (positionId: string, amount: string) => Promise<TransactionResult>;
    borrow: (asset: string, amount: string, collateralAsset: string) => Promise<TransactionResult>;
    repay: (positionId: string, amount: string) => Promise<TransactionResult>;
    getUserPositions: (userAddress: string) => Promise<LendingPosition[]>;
    getPoolInfo: (asset: string) => Promise<LendingPool>;
  };
  staking: {
    stake: (amount: string, lockPeriod: number) => Promise<TransactionResult>;
    unstake: (positionId: string) => Promise<TransactionResult>;
    claimRewards: (positionId: string) => Promise<TransactionResult>;
    getUserStakingPositions: (userAddress: string) => Promise<StakingPosition[]>;
    getStakingInfo: () => Promise<StakingStats>;
  };
  liquidity: {
    addLiquidity: (tokenA: string, tokenB: string, amountA: string, amountB: string) => Promise<TransactionResult>;
    removeLiquidity: (poolId: string, shares: string) => Promise<TransactionResult>;
    swap: (tokenIn: string, tokenOut: string, amountIn: string, minAmountOut: string) => Promise<TransactionResult>;
    getPoolInfo: (tokenA: string, tokenB: string) => Promise<LiquidityPool>;
    getUserLiquidityPositions: (userAddress: string) => Promise<LiquidityPosition[]>;
    getSwapQuote: (tokenIn: string, tokenOut: string, amountIn: string) => Promise<SwapQuote>;
  };
}