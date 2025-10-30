/**
 * IOTA DeFi Protocol - Client Service
 *
 * Singleton service for managing IOTA blockchain interactions
 * based on the iotaflow implementation pattern
 */

import {
  IotaClient,
  getFullnodeUrl,
  Network
} from '@iota/iota-sdk/client';

import { Transaction } from '@iota/iota-sdk/transactions';
import { SerialTransactionExecutor } from '@iota/iota-sdk/transactions';
import { NETWORK_CONFIG } from '../../config/network';

// Types
export interface IotaClientConfig {
  url: string;
  network?: Network;
}

export interface ContractCallOptions {
  moduleFunction: string;
  args: any[];
  amount?: bigint;
}

export interface TransactionResult {
  transactionId: string;
  status: string;
  timestamp: number;
  effects?: any;
  objectChanges?: any;
}

export interface DeFiTransactionOptions extends ContractCallOptions {
  module: 'amm' | 'governance' | 'oracle' | 'nft_marketplace' | 'yield_farming' | 'flash_loan';
  functionName: string;
  gasAmount?: bigint;
}

// Configuration
const NODE_URL = process.env.REACT_APP_IOTA_NODE_URL || NETWORK_CONFIG.RPC_URL;

// DeFi Protocol Package ID (will be set after deployment)
export const DEFI_PROTOCOL_PACKAGE_ID = NETWORK_CONFIG.DEFI_PROTOCOL_PACKAGE_ID;
export const NFT_MARKETPLACE_PACKAGE_ID = NETWORK_CONFIG.NFT_MARKETPLACE_PACKAGE_ID;

// Client initialization
export class IotaClientService {
  private static instance: IotaClientService;
  private client: IotaClient | null = null;

  private constructor() {}

  public static getInstance(): IotaClientService {
    if (!IotaClientService.instance) {
      IotaClientService.instance = new IotaClientService();
    }
    return IotaClientService.instance;
  }

  public async getClient(): Promise<IotaClient> {
    if (!this.client) {
      try {
        this.client = new IotaClient({
          url: NODE_URL,
        });
      } catch (error) {
        console.error('Error initializing IOTA client:', error);
        throw new Error('Failed to initialize IOTA client');
      }
    }
    return this.client;
  }

  // Transaction handling
  public async createTransactionExecutor(signer: any): Promise<SerialTransactionExecutor> {
    try {
      const client = await this.getClient();
      return new SerialTransactionExecutor({ client, signer });
    } catch (error) {
      console.error('Error creating transaction executor:', error);
      throw new Error('Failed to create transaction executor');
    }
  }

  public async executeTransaction(transaction: Transaction, signer: any): Promise<TransactionResult> {
    try {
      const client = await this.getClient();
      const result = await client.executeTransactionBlock({
        transactionBlock: transaction,
        signature: signer,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        },
      });

      return {
        transactionId: result.digest,
        status: 'success',
        timestamp: Date.now(),
        effects: result.effects,
        objectChanges: result.objectChanges
      };
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw new Error(`Failed to execute transaction: ${error.message}`);
    }
  }

  // DeFi Protocol specific transactions
  public async createDeFiTransaction(options: DeFiTransactionOptions): Promise<Transaction> {
    const { module, functionName, args, amount = BigInt(0), gasAmount } = options;

    try {
      const tx = new Transaction();

      // Handle coin splitting if amount is provided
      if (amount > BigInt(0)) {
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
      }

      // Set gas budget if specified
      if (gasAmount) {
        tx.setGasBudget(gasAmount);
      }

      // Create the move call
      tx.moveCall({
        target: `${DEFI_PROTOCOL_PACKAGE_ID}::${module}::${functionName}`,
        arguments: args.map(arg => tx.pure(arg)),
      });

      return tx;
    } catch (error) {
      console.error('Error creating DeFi transaction:', error);
      throw new Error(`Failed to create DeFi transaction: ${error.message}`);
    }
  }

  // AMM specific functions
  public async createSwapTransaction(
    tokenAType: string,
    tokenBType: string,
    amountIn: bigint,
    minAmountOut: bigint
  ): Promise<Transaction> {
    return this.createDeFiTransaction({
      module: 'amm',
      functionName: 'swap',
      args: [tokenAType, tokenBType, amountIn, minAmountOut],
      moduleFunction: `amm::swap`,
      amount: amountIn
    });
  }

  public async createAddLiquidityTransaction(
    tokenAType: string,
    tokenBType: string,
    amountA: bigint,
    amountB: bigint,
    minLpTokens: bigint
  ): Promise<Transaction> {
    return this.createDeFiTransaction({
      module: 'amm',
      functionName: 'add_liquidity',
      args: [tokenAType, tokenBType, amountA, amountB, minLpTokens],
      moduleFunction: `amm::add_liquidity`,
      amount: amountA + amountB
    });
  }

  // Yield Farming functions
  public async createStakeTransaction(
    poolId: string,
    amount: bigint,
    lockPeriod: number
  ): Promise<Transaction> {
    return this.createDeFiTransaction({
      module: 'yield_farming',
      functionName: 'stake',
      args: [poolId, amount, lockPeriod],
      moduleFunction: `yield_farming::stake`,
      amount
    });
  }

  // Governance functions
  public async createVoteTransaction(
    proposalId: string,
    support: boolean,
    votingPower: bigint
  ): Promise<Transaction> {
    return this.createDeFiTransaction({
      module: 'governance',
      functionName: 'vote',
      args: [proposalId, support, votingPower],
      moduleFunction: `governance::vote`
    });
  }

  // NFT Marketplace functions
  public async createListNFTTransaction(
    nftId: string,
    price: bigint
  ): Promise<Transaction> {
    return this.createDeFiTransaction({
      module: 'nft_marketplace',
      functionName: 'list_nft',
      args: [nftId, price],
      moduleFunction: `nft_marketplace::list_nft`
    });
  }

  // Generic contract interactions
  public async createContractTransaction(options: ContractCallOptions): Promise<Transaction> {
    const { moduleFunction, args, amount = BigInt(0) } = options;
    try {
      const tx = new Transaction();

      if (amount > BigInt(0)) {
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
      }

      tx.moveCall({
        target: `${DEFI_PROTOCOL_PACKAGE_ID}::${moduleFunction}`,
        arguments: args.map(arg => tx.pure(arg)),
      });

      return tx;
    } catch (error) {
      console.error('Error creating contract transaction:', error);
      throw new Error('Failed to create contract transaction');
    }
  }

  // Object and event queries
  public async getOwnedObjects(address: string): Promise<any> {
    try {
      const client = await this.getClient();
      const objects = await client.getOwnedObjects({ owner: address });
      return objects;
    } catch (error) {
      console.error('Error getting owned objects:', error);
      return { data: [] };
    }
  }

  public async getTransactionStatus(digest: string): Promise<any> {
    try {
      const client = await this.getClient();
      return await client.getTransactionBlock({ digest });
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return null;
    }
  }

  public async getContractEvents(module: string, eventType: string, limit: number = 50): Promise<any[]> {
    try {
      const client = await this.getClient();
      const events = await client.getEvents({
        query: { MoveEventType: `${DEFI_PROTOCOL_PACKAGE_ID}::${module}::${eventType}` },
        limit,
      });
      return events.data;
    } catch (error) {
      console.error(`Error getting ${eventType} events:`, error);
      return [];
    }
  }

  // Balance and coin utilities
  public async getBalance(address: string, coinType?: string): Promise<bigint> {
    try {
      const client = await this.getClient();
      const balance = await client.getBalance({
        owner: address,
        coinType: coinType || '0x2::iota::IOTA'
      });
      return BigInt(balance.totalBalance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return BigInt(0);
    }
  }

  // Protocol state queries
  public async getProtocolState(): Promise<any> {
    try {
      const client = await this.getClient();
      return await client.getObject({
        id: NETWORK_CONFIG.PROTOCOL_STATE_ID,
        options: { showContent: true }
      });
    } catch (error) {
      console.error('Error getting protocol state:', error);
      return null;
    }
  }

  public async getPoolInfo(poolId: string): Promise<any> {
    try {
      const client = await this.getClient();
      return await client.getObject({
        id: poolId,
        options: { showContent: true }
      });
    } catch (error) {
      console.error('Error getting pool info:', error);
      return null;
    }
  }

  // Module-specific transactions (backward compatibility)
  public async createModuleTransaction(
    module: string,
    functionName: string,
    args: any[],
    amount: bigint
  ): Promise<Transaction> {
    return this.createContractTransaction({
      moduleFunction: `${module}::${functionName}`,
      args,
      amount
    });
  }
}

// Export singleton instance
export const iotaClient = IotaClientService.getInstance();

// Utility functions
export const formatIotaAmount = (amount: bigint, decimals: number = 6): string => {
  const amountString = amount.toString();
  if (amountString.length <= decimals) {
    return `0.${amountString.padStart(decimals, '0')} IOTA`;
  }
  const integerPart = amountString.slice(0, -decimals);
  const decimalPart = amountString.slice(-decimals);
  return `${integerPart}.${decimalPart} IOTA`;
};

export const parseIotaAmount = (amount: string): bigint => {
  const cleanAmount = amount.replace(/[,\s]/g, '');
  const parts = cleanAmount.split('.');

  if (parts.length === 1) {
    return BigInt(parts[0]) * BigInt(1_000_000);
  }

  const integerPart = BigInt(parts[0] || '0');
  const decimalPart = parts[1].padEnd(6, '0').slice(0, 6);

  return integerPart * BigInt(1_000_000) + BigInt(decimalPart);
};