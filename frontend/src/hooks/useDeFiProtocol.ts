/**
 * DeFi Protocol Hook - Provides access to lending, staking, and liquidity functions
 */

import { useMemo } from 'react';
import { useContractInteraction } from './useContractInteraction';
import { parseIOTA } from '../utils/format';

// DeFi Protocol contract configuration
const DEFI_PROTOCOL_CONFIG = {
  packageId: process.env.REACT_APP_DEFI_PACKAGE_ID || '0x...', // Replace with actual package ID
  moduleName: 'defi_protocol',
  gasLimit: BigInt(10_000_000),
  gasBudget: BigInt(100_000_000)
};

export interface LendingPosition {
  id: string;
  asset: string;
  amount: bigint;
  interestRate: number;
  timestamp: number;
}

export interface StakingPosition {
  id: string;
  amount: bigint;
  rewards: bigint;
  lockPeriod: number;
  timestamp: number;
}

export interface LiquidityPool {
  id: string;
  tokenA: string;
  tokenB: string;
  reserveA: bigint;
  reserveB: bigint;
  totalShares: bigint;
  fee: number;
}

export function useDeFiProtocol() {
  const contract = useContractInteraction(DEFI_PROTOCOL_CONFIG);

  // Lending functions
  const lendingOperations = useMemo(() => ({
    // Supply assets to lending pool
    supply: async (asset: string, amount: string) => {
      const microAmount = parseIOTA(amount);
      return contract.executeTransaction(
        'supply',
        [asset, microAmount.toString()]
      );
    },

    // Withdraw supplied assets
    withdraw: async (positionId: string, amount: string) => {
      const microAmount = parseIOTA(amount);
      return contract.executeTransaction(
        'withdraw',
        [positionId, microAmount.toString()]
      );
    },

    // Borrow against collateral
    borrow: async (asset: string, amount: string, collateralAsset: string) => {
      const microAmount = parseIOTA(amount);
      return contract.executeTransaction(
        'borrow',
        [asset, microAmount.toString(), collateralAsset]
      );
    },

    // Repay borrowed amount
    repay: async (positionId: string, amount: string) => {
      const microAmount = parseIOTA(amount);
      return contract.executeTransaction(
        'repay',
        [positionId, microAmount.toString()]
      );
    },

    // Get user lending positions
    getUserPositions: async (userAddress: string): Promise<LendingPosition[]> => {
      const result = await contract.readOnlyCall(
        'get_user_lending_positions',
        [userAddress]
      );
      // Parse and return positions
      return result?.results?.[0]?.returnValues || [];
    },

    // Get lending pool info
    getPoolInfo: async (asset: string) => {
      return contract.readOnlyCall(
        'get_lending_pool_info',
        [asset]
      );
    }
  }), [contract]);

  // Staking functions
  const stakingOperations = useMemo(() => ({
    // Stake tokens
    stake: async (amount: string, lockPeriod: number) => {
      const microAmount = parseIOTA(amount);
      return contract.executeTransaction(
        'stake',
        [microAmount.toString(), lockPeriod.toString()]
      );
    },

    // Unstake tokens
    unstake: async (positionId: string) => {
      return contract.executeTransaction(
        'unstake',
        [positionId]
      );
    },

    // Claim staking rewards
    claimRewards: async (positionId: string) => {
      return contract.executeTransaction(
        'claim_staking_rewards',
        [positionId]
      );
    },

    // Get user staking positions
    getUserStakingPositions: async (userAddress: string): Promise<StakingPosition[]> => {
      const result = await contract.readOnlyCall(
        'get_user_staking_positions',
        [userAddress]
      );
      return result?.results?.[0]?.returnValues || [];
    },

    // Get staking pool info
    getStakingInfo: async () => {
      return contract.readOnlyCall('get_staking_info');
    }
  }), [contract]);

  // Liquidity pool functions
  const liquidityOperations = useMemo(() => ({
    // Add liquidity to pool
    addLiquidity: async (
      tokenA: string, 
      tokenB: string, 
      amountA: string, 
      amountB: string
    ) => {
      const microAmountA = parseIOTA(amountA);
      const microAmountB = parseIOTA(amountB);
      return contract.executeTransaction(
        'add_liquidity',
        [
          tokenA, 
          tokenB, 
          microAmountA.toString(), 
          microAmountB.toString()
        ]
      );
    },

    // Remove liquidity from pool
    removeLiquidity: async (
      poolId: string, 
      shares: string
    ) => {
      return contract.executeTransaction(
        'remove_liquidity',
        [poolId, shares]
      );
    },

    // Swap tokens
    swap: async (
      tokenIn: string,
      tokenOut: string,
      amountIn: string,
      minAmountOut: string
    ) => {
      const microAmountIn = parseIOTA(amountIn);
      const microMinAmountOut = parseIOTA(minAmountOut);
      return contract.executeTransaction(
        'swap',
        [
          tokenIn,
          tokenOut,
          microAmountIn.toString(),
          microMinAmountOut.toString()
        ]
      );
    },

    // Get pool info
    getPoolInfo: async (tokenA: string, tokenB: string): Promise<LiquidityPool | null> => {
      const result = await contract.readOnlyCall(
        'get_pool_info',
        [tokenA, tokenB]
      );
      return result?.results?.[0]?.returnValues || null;
    },

    // Get user liquidity positions
    getUserLiquidityPositions: async (userAddress: string) => {
      const result = await contract.readOnlyCall(
        'get_user_liquidity_positions',
        [userAddress]
      );
      return result?.results?.[0]?.returnValues || [];
    },

    // Calculate swap output
    getSwapQuote: async (
      tokenIn: string,
      tokenOut: string,
      amountIn: string
    ) => {
      const microAmountIn = parseIOTA(amountIn);
      const result = await contract.readOnlyCall(
        'get_swap_quote',
        [tokenIn, tokenOut, microAmountIn.toString()]
      );
      return result?.results?.[0]?.returnValues || null;
    }
  }), [contract]);

  // Governance functions
  const governanceOperations = useMemo(() => ({
    // Create proposal
    createProposal: async (description: string, target: string, calldata: string) => {
      return contract.executeTransaction(
        'create_proposal',
        [description, target, calldata]
      );
    },

    // Vote on proposal
    vote: async (proposalId: string, support: boolean) => {
      return contract.executeTransaction(
        'vote',
        [proposalId, support]
      );
    },

    // Execute proposal
    executeProposal: async (proposalId: string) => {
      return contract.executeTransaction(
        'execute_proposal',
        [proposalId]
      );
    },

    // Get proposal info
    getProposal: async (proposalId: string) => {
      return contract.readOnlyCall(
        'get_proposal',
        [proposalId]
      );
    },

    // Get all proposals
    getAllProposals: async () => {
      return contract.readOnlyCall('get_all_proposals');
    }
  }), [contract]);

  return {
    // Core contract functions
    ...contract,
    
    // Specialized operations
    lending: lendingOperations,
    staking: stakingOperations,
    liquidity: liquidityOperations,
    governance: governanceOperations,
    
    // Contract config
    config: DEFI_PROTOCOL_CONFIG
  };
}