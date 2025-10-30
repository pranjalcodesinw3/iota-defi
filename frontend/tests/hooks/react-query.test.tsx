/**
 * Tests for React Query Integration and Data Fetching
 *
 * Tests cover:
 * - Query hook behavior and caching
 * - Mutation hooks for transactions
 * - Error handling and retries
 * - Cache invalidation and updates
 * - Optimistic updates
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@tests/utils/test-utils';
import { iotaClient } from '@/lib/iota/client';
import React, { ReactNode } from 'react';

// Mock the IOTA client
const mockIotaClient = {
  getBalance: vi.fn(),
  getOwnedObjects: vi.fn(),
  executeTransaction: vi.fn(),
  getPoolInfo: vi.fn(),
  getProtocolState: vi.fn(),
  getContractEvents: vi.fn(),
  createSwapTransaction: vi.fn(),
  createAddLiquidityTransaction: vi.fn(),
};

vi.mock('@/lib/iota/client', () => ({
  iotaClient: mockIotaClient,
  formatIotaAmount: (amount: bigint) => `${amount} IOTA`,
}));

// Custom hooks for testing
const useWalletBalance = (address?: string) => {
  return useQuery({
    queryKey: ['balance', address],
    queryFn: () => iotaClient.getBalance(address!),
    enabled: !!address,
    staleTime: 30000, // 30 seconds
    cacheTime: 60000, // 1 minute
  });
};

const useOwnedObjects = (address?: string) => {
  return useQuery({
    queryKey: ['ownedObjects', address],
    queryFn: () => iotaClient.getOwnedObjects(address!),
    enabled: !!address,
  });
};

const usePoolInfo = (poolId?: string) => {
  return useQuery({
    queryKey: ['poolInfo', poolId],
    queryFn: () => iotaClient.getPoolInfo(poolId!),
    enabled: !!poolId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

const useProtocolState = () => {
  return useQuery({
    queryKey: ['protocolState'],
    queryFn: () => iotaClient.getProtocolState(),
  });
};

const useSwapTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tokenA,
      tokenB,
      amountIn,
      minAmountOut,
      signer
    }: {
      tokenA: string;
      tokenB: string;
      amountIn: bigint;
      minAmountOut: bigint;
      signer: any;
    }) => {
      const tx = await iotaClient.createSwapTransaction(tokenA, tokenB, amountIn, minAmountOut);
      return iotaClient.executeTransaction(tx, signer);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries after successful swap
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['ownedObjects'] });
      queryClient.invalidateQueries({ queryKey: ['poolInfo'] });
    },
  });
};

const useLiquidityTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tokenA,
      tokenB,
      amountA,
      amountB,
      minLpTokens,
      signer
    }: {
      tokenA: string;
      tokenB: string;
      amountA: bigint;
      amountB: bigint;
      minLpTokens: bigint;
      signer: any;
    }) => {
      const tx = await iotaClient.createAddLiquidityTransaction(
        tokenA,
        tokenB,
        amountA,
        amountB,
        minLpTokens
      );
      return iotaClient.executeTransaction(tx, signer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['ownedObjects'] });
      queryClient.invalidateQueries({ queryKey: ['poolInfo'] });
    },
    onError: (error) => {
      console.error('Liquidity transaction failed:', error);
    },
  });
};

describe('React Query Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
    mockIotaClient.getBalance.mockResolvedValue(BigInt('1000000'));
    mockIotaClient.getOwnedObjects.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useWalletBalance Hook', () => {
    it('fetches balance successfully', async () => {
      const address = '0x123';

      const { result } = renderHook(
        () => useWalletBalance(address),
        {
          wrapper: ({ children }: { children: ReactNode }) => (
            <div>{children}</div>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(BigInt('1000000'));
      expect(mockIotaClient.getBalance).toHaveBeenCalledWith(address);
    });

    it('does not fetch when address is undefined', () => {
      const { result } = renderHook(() => useWalletBalance(undefined));

      expect(result.current.isIdle).toBe(true);
      expect(mockIotaClient.getBalance).not.toHaveBeenCalled();
    });

    it('handles balance fetch errors', async () => {
      mockIotaClient.getBalance.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWalletBalance('0x123'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Network error'));
    });

    it('caches balance data correctly', async () => {
      const address = '0x123';

      // First hook instance
      const { result: result1 } = renderHook(() => useWalletBalance(address));

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook instance should use cached data
      const { result: result2 } = renderHook(() => useWalletBalance(address));

      expect(result2.current.isSuccess).toBe(true);
      expect(result2.current.data).toBe(BigInt('1000000'));
      expect(mockIotaClient.getBalance).toHaveBeenCalledTimes(1);
    });
  });

  describe('useOwnedObjects Hook', () => {
    it('fetches owned objects successfully', async () => {
      const mockObjects = {
        data: [
          { objectId: '0x1', type: 'Token' },
          { objectId: '0x2', type: 'NFT' },
        ],
      };
      mockIotaClient.getOwnedObjects.mockResolvedValue(mockObjects);

      const { result } = renderHook(() => useOwnedObjects('0x123'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockObjects);
    });

    it('handles empty objects response', async () => {
      mockIotaClient.getOwnedObjects.mockResolvedValue({ data: [] });

      const { result } = renderHook(() => useOwnedObjects('0x123'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toEqual([]);
    });
  });

  describe('usePoolInfo Hook', () => {
    it('fetches pool info with auto-refresh', async () => {
      vi.useFakeTimers();

      const mockPoolInfo = {
        data: {
          content: {
            fields: {
              reserveA: '1000000',
              reserveB: '2000000',
            },
          },
        },
      };
      mockIotaClient.getPoolInfo.mockResolvedValue(mockPoolInfo);

      const { result } = renderHook(() => usePoolInfo('pool-123'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPoolInfo);
      expect(mockIotaClient.getPoolInfo).toHaveBeenCalledTimes(1);

      // Fast-forward to trigger refetch
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockIotaClient.getPoolInfo).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('useProtocolState Hook', () => {
    it('fetches protocol state', async () => {
      const mockState = {
        data: {
          content: {
            fields: {
              totalValueLocked: '10000000',
              totalUsers: '1234',
            },
          },
        },
      };
      mockIotaClient.getProtocolState.mockResolvedValue(mockState);

      const { result } = renderHook(() => useProtocolState());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockState);
    });
  });

  describe('useSwapTransaction Mutation', () => {
    beforeEach(() => {
      mockIotaClient.createSwapTransaction.mockResolvedValue({ moveCall: vi.fn() });
      mockIotaClient.executeTransaction.mockResolvedValue({
        transactionId: 'tx-123',
        status: 'success',
        timestamp: Date.now(),
      });
    });

    it('executes swap transaction successfully', async () => {
      const { result } = renderHook(() => useSwapTransaction());

      const swapParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountIn: BigInt('1000000'),
        minAmountOut: BigInt('950000'),
        signer: 'mock-signer',
      };

      await act(async () => {
        result.current.mutate(swapParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockIotaClient.createSwapTransaction).toHaveBeenCalledWith(
        'DFI',
        'IOTA',
        BigInt('1000000'),
        BigInt('950000')
      );
      expect(result.current.data?.transactionId).toBe('tx-123');
    });

    it('handles swap transaction errors', async () => {
      mockIotaClient.executeTransaction.mockRejectedValue(
        new Error('Insufficient balance')
      );

      const { result } = renderHook(() => useSwapTransaction());

      const swapParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountIn: BigInt('1000000'),
        minAmountOut: BigInt('950000'),
        signer: 'mock-signer',
      };

      await act(async () => {
        result.current.mutate(swapParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error('Insufficient balance'));
    });

    it('invalidates queries on successful swap', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSwapTransaction());

      const swapParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountIn: BigInt('1000000'),
        minAmountOut: BigInt('950000'),
        signer: 'mock-signer',
      };

      await act(async () => {
        result.current.mutate(swapParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['balance'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['ownedObjects'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['poolInfo'] });
    });
  });

  describe('useLiquidityTransaction Mutation', () => {
    beforeEach(() => {
      mockIotaClient.createAddLiquidityTransaction.mockResolvedValue({ moveCall: vi.fn() });
      mockIotaClient.executeTransaction.mockResolvedValue({
        transactionId: 'lp-tx-123',
        status: 'success',
        timestamp: Date.now(),
      });
    });

    it('executes liquidity transaction successfully', async () => {
      const { result } = renderHook(() => useLiquidityTransaction());

      const liquidityParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountA: BigInt('1000000'),
        amountB: BigInt('2000000'),
        minLpTokens: BigInt('1414213'),
        signer: 'mock-signer',
      };

      await act(async () => {
        result.current.mutate(liquidityParams);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockIotaClient.createAddLiquidityTransaction).toHaveBeenCalledWith(
        'DFI',
        'IOTA',
        BigInt('1000000'),
        BigInt('2000000'),
        BigInt('1414213')
      );
      expect(result.current.data?.transactionId).toBe('lp-tx-123');
    });

    it('handles liquidity transaction errors with logging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockIotaClient.executeTransaction.mockRejectedValue(
        new Error('Pool does not exist')
      );

      const { result } = renderHook(() => useLiquidityTransaction());

      const liquidityParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountA: BigInt('1000000'),
        amountB: BigInt('2000000'),
        minLpTokens: BigInt('1414213'),
        signer: 'mock-signer',
      };

      await act(async () => {
        result.current.mutate(liquidityParams);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Liquidity transaction failed:',
        new Error('Pool does not exist')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Query Dependencies and Relationships', () => {
    it('handles dependent queries correctly', async () => {
      const address = '0x123';

      // Mock the balance query
      const { result: balanceResult } = renderHook(() => useWalletBalance(address));

      await waitFor(() => {
        expect(balanceResult.current.isSuccess).toBe(true);
      });

      // Now use the objects query which might depend on having an address
      const { result: objectsResult } = renderHook(() => useOwnedObjects(address));

      await waitFor(() => {
        expect(objectsResult.current.isSuccess).toBe(true);
      });

      expect(mockIotaClient.getBalance).toHaveBeenCalledWith(address);
      expect(mockIotaClient.getOwnedObjects).toHaveBeenCalledWith(address);
    });

    it('handles conditional queries based on data availability', async () => {
      // Start without pool ID
      let poolId: string | undefined = undefined;

      const { result, rerender } = renderHook(() => usePoolInfo(poolId));

      // Should not make request initially
      expect(result.current.isIdle).toBe(true);
      expect(mockIotaClient.getPoolInfo).not.toHaveBeenCalled();

      // Update pool ID
      poolId = 'pool-123';
      rerender();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockIotaClient.getPoolInfo).toHaveBeenCalledWith('pool-123');
    });
  });

  describe('Error Recovery and Retries', () => {
    it('implements custom retry logic for transient errors', async () => {
      mockIotaClient.getBalance
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(BigInt('1000000'));

      // Configure query with custom retry logic
      const { result } = renderHook(() =>
        useQuery({
          queryKey: ['balance-retry', '0x123'],
          queryFn: () => iotaClient.getBalance('0x123'),
          retry: (failureCount, error) => {
            return failureCount < 3 && error.message.includes('Network');
          },
          retryDelay: 100,
        })
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockIotaClient.getBalance).toHaveBeenCalledTimes(3);
      expect(result.current.data).toBe(BigInt('1000000'));
    });

    it('stops retrying on permanent errors', async () => {
      mockIotaClient.getBalance.mockRejectedValue(new Error('Invalid address format'));

      const { result } = renderHook(() =>
        useQuery({
          queryKey: ['balance-no-retry', '0x123'],
          queryFn: () => iotaClient.getBalance('0x123'),
          retry: (failureCount, error) => {
            return !error.message.includes('Invalid address');
          },
        })
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockIotaClient.getBalance).toHaveBeenCalledTimes(1);
      expect(result.current.error?.message).toBe('Invalid address format');
    });
  });

  describe('Optimistic Updates', () => {
    it('implements optimistic updates for balance after swap', async () => {
      const address = '0x123';

      // Set up initial balance
      mockIotaClient.getBalance.mockResolvedValue(BigInt('1000000'));

      // Create a mutation with optimistic update
      const useOptimisticSwap = () => {
        const queryClient = useQueryClient();

        return useMutation({
          mutationFn: async (params: any) => {
            const tx = await iotaClient.createSwapTransaction(
              params.tokenA,
              params.tokenB,
              params.amountIn,
              params.minAmountOut
            );
            return iotaClient.executeTransaction(tx, params.signer);
          },
          onMutate: async (variables) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['balance', address] });

            // Snapshot previous value
            const previousBalance = queryClient.getQueryData(['balance', address]);

            // Optimistically update balance
            queryClient.setQueryData(['balance', address], (old: bigint | undefined) => {
              if (old && variables.amountIn) {
                return old - variables.amountIn;
              }
              return old;
            });

            return { previousBalance };
          },
          onError: (err, variables, context) => {
            // Rollback optimistic update on error
            if (context?.previousBalance) {
              queryClient.setQueryData(['balance', address], context.previousBalance);
            }
          },
          onSettled: () => {
            // Refetch to get accurate data
            queryClient.invalidateQueries({ queryKey: ['balance', address] });
          },
        });
      };

      const { result } = renderHook(() => useOptimisticSwap());

      const swapParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountIn: BigInt('100000'),
        minAmountOut: BigInt('95000'),
        signer: 'mock-signer',
      };

      await act(async () => {
        result.current.mutate(swapParams);
      });

      // Verify optimistic update was applied
      expect(queryClient.getQueryData(['balance', address])).toBe(BigInt('900000'));
    });
  });
});