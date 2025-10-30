/**
 * Advanced Move Contract Interaction Hook for IOTA DeFi Protocol
 * Provides utilities for interacting with Move smart contracts
 */

import { useState, useCallback } from 'react';
import { 
  useCurrentAccount, 
  useSignAndExecuteTransaction,
  useIotaClient,
  useSignTransaction
} from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { useToast } from '../components/ui/use-toast';

export interface ContractConfig {
  packageId: string;
  moduleName: string;
  gasLimit?: bigint;
  gasBudget?: bigint;
}

export interface TransactionOptions {
  gasLimit?: bigint;
  gasBudget?: bigint;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export function useContractInteraction(config: ContractConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const client = useIotaClient();
  const { toast } = useToast();

  const executeTransaction = useCallback(
    async (
      functionName: string,
      args: any[] = [],
      typeArgs: string[] = [],
      options: TransactionOptions = {}
    ) => {
      if (!currentAccount?.address) {
        throw new Error('No wallet connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        const tx = new Transaction();
        
        // Build the transaction
        tx.moveCall({
          target: `${config.packageId}::${config.moduleName}::${functionName}`,
          arguments: args,
          typeArguments: typeArgs,
        });

        // Set gas budget if provided
        if (options.gasBudget) {
          tx.setGasBudget(options.gasBudget);
        }

        return new Promise((resolve, reject) => {
          signAndExecuteTransaction(
            {
              transaction: tx,
              chain: 'iota:devnet', // or config chain
            },
            {
              onSuccess: (result) => {
                setLastTransactionId(result.digest);
                toast({
                  title: "Transaction Successful",
                  description: `Function ${functionName} executed successfully`
                });
                options.onSuccess?.(result);
                resolve(result);
              },
              onError: (error) => {
                setError(error as Error);
                toast({
                  title: "Transaction Failed",
                  description: error.message,
                  variant: "destructive"
                });
                options.onError?.(error as Error);
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        const err = error as Error;
        setError(err);
        options.onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentAccount, signAndExecuteTransaction, config, toast]
  );

  const readOnlyCall = useCallback(
    async (
      functionName: string,
      args: any[] = [],
      typeArgs: string[] = []
    ) => {
      if (!client) {
        throw new Error('Client not available');
      }

      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${config.packageId}::${config.moduleName}::${functionName}`,
          arguments: args,
          typeArguments: typeArgs,
        });

        const result = await client.devInspectTransaction({
          transaction: tx,
          sender: currentAccount?.address || '0x0'
        });

        return result;
      } catch (error) {
        console.error('Read-only call failed:', error);
        throw error;
      }
    },
    [client, config, currentAccount]
  );

  const getTransactionStatus = useCallback(
    async (txId: string) => {
      if (!client) return null;
      
      try {
        const result = await client.waitForTransaction({ digest: txId });
        return result;
      } catch (error) {
        console.error('Failed to get transaction status:', error);
        return null;
      }
    },
    [client]
  );

  return {
    executeTransaction,
    readOnlyCall,
    getTransactionStatus,
    isLoading,
    error,
    lastTransactionId,
    isConnected: !!currentAccount?.address,
    clearError: () => setError(null)
  };
}