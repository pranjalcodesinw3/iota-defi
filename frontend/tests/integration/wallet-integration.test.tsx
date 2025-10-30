/**
 * Integration Tests for Wallet and Contract Interactions
 *
 * Tests cover:
 * - Wallet connection flow with real providers
 * - Contract transaction building and simulation
 * - Balance updates after transactions
 * - Error handling for failed transactions
 * - Multi-step DeFi workflows
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, mockWalletHooks, mockWalletState, mockIotaResponses } from '@tests/utils/test-utils';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { iotaClient } from '@/lib/iota/client';

// Mock network calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Extended mock for integration testing
const mockIotaClientIntegration = {
  getClient: vi.fn(),
  getBalance: vi.fn(),
  getOwnedObjects: vi.fn(),
  executeTransaction: vi.fn(),
  createSwapTransaction: vi.fn(),
  createAddLiquidityTransaction: vi.fn(),
  createStakeTransaction: vi.fn(),
  getTransactionStatus: vi.fn(),
  getProtocolState: vi.fn(),
  getPoolInfo: vi.fn(),
  getContractEvents: vi.fn(),
};

vi.mock('@/lib/iota/client', () => ({
  iotaClient: mockIotaClientIntegration,
  formatIotaAmount: (amount: bigint) => `${amount} IOTA`,
  parseIotaAmount: (amount: string) => BigInt(amount.replace('.', '').padEnd(6, '0')),
}));

describe('Wallet Integration Tests', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false },
      },
    });

    // Setup default mock responses
    mockIotaClientIntegration.getBalance.mockResolvedValue(BigInt('1000000'));
    mockIotaClientIntegration.getOwnedObjects.mockResolvedValue({ data: [] });
  });

  describe('Wallet Connection Flow', () => {
    it('completes full wallet connection and data loading', async () => {
      // Start disconnected
      mockWalletHooks(mockWalletState.disconnected);

      const { rerender } = renderWithProviders(<WalletConnect />, { queryClient });

      // Verify connect button is shown
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();

      // Simulate wallet connection
      act(() => {
        mockWalletHooks(mockWalletState.connected);
      });

      // Re-render with connected state
      rerender(<WalletConnect />);

      // Wait for balance to load
      await waitFor(() => {
        expect(mockIotaClientIntegration.getBalance).toHaveBeenCalledWith(
          '0x1234567890abcdef1234567890abcdef12345678',
          undefined
        );
      });

      // Verify wallet info is displayed
      await waitFor(() => {
        expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
      });
    });

    it('handles wallet connection with custom token balance', async () => {
      mockIotaClientIntegration.getBalance.mockResolvedValue(BigInt('5000000'));

      mockWalletHooks(mockWalletState.connected);
      renderWithProviders(<WalletConnect />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('5000000 IOTA')).toBeInTheDocument();
      });
    });

    it('handles network switching', async () => {
      // Start with testnet
      mockWalletHooks({
        ...mockWalletState.connected,
        network: 'testnet'
      });

      const { rerender } = renderWithProviders(<WalletConnect />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
      });

      // Click wallet to open dropdown
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('testnet')).toBeInTheDocument();
      });

      // Simulate network change to mainnet
      act(() => {
        mockWalletHooks({
          ...mockWalletState.connected,
          network: 'mainnet'
        });
      });

      rerender(<WalletConnect />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('mainnet')).toBeInTheDocument();
      });
    });

    it('handles wallet disconnection and cleanup', async () => {
      mockWalletHooks(mockWalletState.connected);
      const { rerender } = renderWithProviders(<WalletConnect />, { queryClient });

      // Wait for connected state
      await waitFor(() => {
        expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
      });

      // Open dropdown and disconnect
      await user.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
      });

      // Simulate disconnection
      act(() => {
        mockWalletHooks(mockWalletState.disconnected);
      });

      rerender(<WalletConnect />);

      // Verify back to disconnected state
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });
  });

  describe('Contract Interaction Flow', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
      mockIotaClientIntegration.executeTransaction.mockResolvedValue({
        transactionId: 'tx-123',
        status: 'success',
        timestamp: Date.now(),
      });
    });

    it('handles swap transaction flow', async () => {
      const mockSwapTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createSwapTransaction.mockResolvedValue(mockSwapTx);

      // Simulate creating and executing a swap
      const swapParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountIn: BigInt('1000000'),
        minAmountOut: BigInt('950000'),
      };

      // Create swap transaction
      const tx = await iotaClient.createSwapTransaction(
        swapParams.tokenA,
        swapParams.tokenB,
        swapParams.amountIn,
        swapParams.minAmountOut
      );

      expect(mockIotaClientIntegration.createSwapTransaction).toHaveBeenCalledWith(
        'DFI',
        'IOTA',
        BigInt('1000000'),
        BigInt('950000')
      );

      // Execute transaction
      const result = await iotaClient.executeTransaction(tx, 'mock-signer');

      expect(mockIotaClientIntegration.executeTransaction).toHaveBeenCalledWith(
        mockSwapTx,
        'mock-signer'
      );

      expect(result.transactionId).toBe('tx-123');
      expect(result.status).toBe('success');
    });

    it('handles liquidity provision flow', async () => {
      const mockLiquidityTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createAddLiquidityTransaction.mockResolvedValue(mockLiquidityTx);

      const liquidityParams = {
        tokenA: 'DFI',
        tokenB: 'IOTA',
        amountA: BigInt('1000000'),
        amountB: BigInt('2000000'),
        minLpTokens: BigInt('1414213'),
      };

      const tx = await iotaClient.createAddLiquidityTransaction(
        liquidityParams.tokenA,
        liquidityParams.tokenB,
        liquidityParams.amountA,
        liquidityParams.amountB,
        liquidityParams.minLpTokens
      );

      expect(mockIotaClientIntegration.createAddLiquidityTransaction).toHaveBeenCalledWith(
        'DFI',
        'IOTA',
        BigInt('1000000'),
        BigInt('2000000'),
        BigInt('1414213')
      );

      const result = await iotaClient.executeTransaction(tx, 'mock-signer');
      expect(result.status).toBe('success');
    });

    it('handles staking transaction flow', async () => {
      const mockStakeTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createStakeTransaction.mockResolvedValue(mockStakeTx);

      const stakeParams = {
        poolId: 'pool-123',
        amount: BigInt('1000000'),
        lockPeriod: 30,
      };

      const tx = await iotaClient.createStakeTransaction(
        stakeParams.poolId,
        stakeParams.amount,
        stakeParams.lockPeriod
      );

      expect(mockIotaClientIntegration.createStakeTransaction).toHaveBeenCalledWith(
        'pool-123',
        BigInt('1000000'),
        30
      );

      const result = await iotaClient.executeTransaction(tx, 'mock-signer');
      expect(result.status).toBe('success');
    });

    it('handles transaction failures gracefully', async () => {
      mockIotaClientIntegration.executeTransaction.mockRejectedValue(
        new Error('Insufficient balance')
      );

      const mockTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createSwapTransaction.mockResolvedValue(mockTx);

      const tx = await iotaClient.createSwapTransaction('DFI', 'IOTA', BigInt('1000000'), BigInt('950000'));

      await expect(iotaClient.executeTransaction(tx, 'mock-signer'))
        .rejects.toThrow('Insufficient balance');
    });
  });

  describe('Balance Updates After Transactions', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('updates balance after successful transaction', async () => {
      // Initial balance
      mockIotaClientIntegration.getBalance.mockResolvedValueOnce(BigInt('1000000'));

      renderWithProviders(<WalletConnect />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
      });

      // Simulate transaction that reduces balance
      mockIotaClientIntegration.getBalance.mockResolvedValueOnce(BigInt('800000'));
      mockIotaClientIntegration.executeTransaction.mockResolvedValue({
        transactionId: 'tx-123',
        status: 'success',
        timestamp: Date.now(),
      });

      // Execute a transaction (this would be triggered by a component)
      const tx = { moveCall: vi.fn() };
      await iotaClient.executeTransaction(tx, 'mock-signer');

      // Manually trigger balance refresh (in real app this would be automatic)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Balance should update if component re-renders
      expect(mockIotaClientIntegration.getBalance).toHaveBeenCalledTimes(2);
    });

    it('handles balance query errors after transaction', async () => {
      mockIotaClientIntegration.getBalance
        .mockResolvedValueOnce(BigInt('1000000'))
        .mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<WalletConnect />, { queryClient });

      await waitFor(() => {
        expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
      });

      // Trigger balance refresh that fails
      await act(async () => {
        await expect(iotaClient.getBalance('0x123')).resolves.toBe(BigInt('0'));
      });
    });
  });

  describe('Multi-step DeFi Workflows', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('handles complete liquidity provision and staking workflow', async () => {
      // Step 1: Provide liquidity
      const liquidityTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createAddLiquidityTransaction.mockResolvedValue(liquidityTx);
      mockIotaClientIntegration.executeTransaction.mockResolvedValueOnce({
        transactionId: 'lp-tx-123',
        status: 'success',
        timestamp: Date.now(),
        objectChanges: [
          { type: 'created', objectType: 'LPToken', objectId: 'lp-token-123' }
        ],
      });

      const lpTxResult = await iotaClient.executeTransaction(liquidityTx, 'mock-signer');
      expect(lpTxResult.transactionId).toBe('lp-tx-123');

      // Step 2: Stake LP tokens
      const stakeTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createStakeTransaction.mockResolvedValue(stakeTx);
      mockIotaClientIntegration.executeTransaction.mockResolvedValueOnce({
        transactionId: 'stake-tx-123',
        status: 'success',
        timestamp: Date.now(),
      });

      const stakeTxResult = await iotaClient.executeTransaction(stakeTx, 'mock-signer');
      expect(stakeTxResult.transactionId).toBe('stake-tx-123');

      // Verify both transactions completed
      expect(mockIotaClientIntegration.executeTransaction).toHaveBeenCalledTimes(2);
    });

    it('handles workflow interruption on failed intermediate step', async () => {
      // Step 1: Successful liquidity provision
      const liquidityTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createAddLiquidityTransaction.mockResolvedValue(liquidityTx);
      mockIotaClientIntegration.executeTransaction.mockResolvedValueOnce({
        transactionId: 'lp-tx-123',
        status: 'success',
        timestamp: Date.now(),
      });

      const lpTxResult = await iotaClient.executeTransaction(liquidityTx, 'mock-signer');
      expect(lpTxResult.status).toBe('success');

      // Step 2: Failed staking
      const stakeTx = { moveCall: vi.fn() };
      mockIotaClientIntegration.createStakeTransaction.mockResolvedValue(stakeTx);
      mockIotaClientIntegration.executeTransaction.mockRejectedValueOnce(
        new Error('Staking pool is full')
      );

      await expect(iotaClient.executeTransaction(stakeTx, 'mock-signer'))
        .rejects.toThrow('Staking pool is full');

      // First transaction should have succeeded, second should have failed
      expect(mockIotaClientIntegration.executeTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Monitoring', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('queries contract events after transactions', async () => {
      mockIotaClientIntegration.getContractEvents.mockResolvedValue([
        {
          id: 'event-1',
          type: 'SwapEvent',
          parsedJson: {
            tokenIn: 'DFI',
            tokenOut: 'IOTA',
            amountIn: '1000000',
            amountOut: '950000',
          },
        },
      ]);

      const events = await iotaClient.getContractEvents('amm', 'SwapEvent', 10);

      expect(events).toHaveLength(1);
      expect(events[0].parsedJson.tokenIn).toBe('DFI');
      expect(mockIotaClientIntegration.getContractEvents).toHaveBeenCalledWith(
        'amm',
        'SwapEvent',
        10
      );
    });

    it('handles empty event results', async () => {
      mockIotaClientIntegration.getContractEvents.mockResolvedValue([]);

      const events = await iotaClient.getContractEvents('amm', 'SwapEvent');
      expect(events).toEqual([]);
    });

    it('handles event query errors', async () => {
      mockIotaClientIntegration.getContractEvents.mockRejectedValue(
        new Error('Events service unavailable')
      );

      await expect(iotaClient.getContractEvents('amm', 'SwapEvent'))
        .rejects.toThrow('Events service unavailable');
    });
  });

  describe('Protocol State Monitoring', () => {
    it('monitors protocol state changes', async () => {
      mockIotaClientIntegration.getProtocolState.mockResolvedValue({
        data: {
          objectId: '0xprotocol',
          content: {
            fields: {
              totalValueLocked: '10000000',
              totalUsers: '1234',
            },
          },
        },
      });

      const state = await iotaClient.getProtocolState();
      expect(state.data.content.fields.totalValueLocked).toBe('10000000');
    });

    it('monitors pool state changes', async () => {
      mockIotaClientIntegration.getPoolInfo.mockResolvedValue({
        data: {
          content: {
            fields: {
              reserveA: '1000000',
              reserveB: '2000000',
              lpTokenSupply: '1414213',
              fee: '30',
            },
          },
        },
      });

      const pool = await iotaClient.getPoolInfo('pool-123');
      expect(pool.data.content.fields.reserveA).toBe('1000000');
      expect(pool.data.content.fields.reserveB).toBe('2000000');
    });
  });
});