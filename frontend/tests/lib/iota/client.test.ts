/**
 * Unit Tests for IOTA Client Service
 *
 * Tests cover:
 * - Client initialization and singleton pattern
 * - Transaction creation and execution
 * - DeFi-specific transaction methods
 * - Balance and object queries
 * - Error handling and network failures
 * - Utility functions (formatIotaAmount, parseIotaAmount)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IotaClientService, iotaClient, formatIotaAmount, parseIotaAmount } from '@/lib/iota/client';

// Mock IOTA SDK
const mockIotaClient = {
  getBalance: vi.fn(),
  getOwnedObjects: vi.fn(),
  executeTransactionBlock: vi.fn(),
  getTransactionBlock: vi.fn(),
  getObject: vi.fn(),
  getEvents: vi.fn(),
};

const mockTransaction = {
  moveCall: vi.fn().mockReturnThis(),
  splitCoins: vi.fn().mockReturnThis(),
  setGasBudget: vi.fn().mockReturnThis(),
  pure: vi.fn().mockImplementation((val) => `pure(${val})`),
  gas: 'gas-object',
};

const mockSerialTransactionExecutor = vi.fn();

vi.mock('@iota/iota-sdk/client', () => ({
  IotaClient: vi.fn().mockImplementation(() => mockIotaClient),
  getFullnodeUrl: vi.fn().mockReturnValue('https://api.testnet.iota.cafe'),
}));

vi.mock('@iota/iota-sdk/transactions', () => ({
  Transaction: vi.fn().mockImplementation(() => mockTransaction),
  SerialTransactionExecutor: mockSerialTransactionExecutor,
}));

vi.mock('@/config/network', () => ({
  NETWORK_CONFIG: {
    RPC_URL: 'https://api.testnet.iota.cafe',
    NETWORK: 'testnet',
    DEFI_PROTOCOL_PACKAGE_ID: '0xdefi_package',
    NFT_MARKETPLACE_PACKAGE_ID: '0xnft_package',
    PROTOCOL_STATE_ID: '0xprotocol_state',
    EXPLORER_URL: 'https://explorer.iota.cafe/testnet',
  },
}));

describe('IotaClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    IotaClientService['instance'] = undefined as any;
  });

  describe('Singleton Pattern', () => {
    it('returns same instance across calls', () => {
      const instance1 = IotaClientService.getInstance();
      const instance2 = IotaClientService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('exports singleton instance as iotaClient', () => {
      expect(iotaClient).toBeInstanceOf(IotaClientService);
    });
  });

  describe('Client Initialization', () => {
    it('initializes IOTA client correctly', async () => {
      const client = await iotaClient.getClient();

      expect(client).toBeDefined();
      expect(require('@iota/iota-sdk/client').IotaClient).toHaveBeenCalledWith({
        url: 'https://api.testnet.iota.cafe',
      });
    });

    it('reuses existing client instance', async () => {
      const client1 = await iotaClient.getClient();
      const client2 = await iotaClient.getClient();

      expect(client1).toBe(client2);
      expect(require('@iota/iota-sdk/client').IotaClient).toHaveBeenCalledTimes(1);
    });

    it('handles client initialization errors', async () => {
      const IotaClientMock = require('@iota/iota-sdk/client').IotaClient;
      IotaClientMock.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      await expect(iotaClient.getClient()).rejects.toThrow('Failed to initialize IOTA client');
    });
  });

  describe('Transaction Execution', () => {
    beforeEach(() => {
      mockIotaClient.executeTransactionBlock.mockResolvedValue({
        digest: 'test-digest',
        effects: { status: 'success' },
        objectChanges: [],
      });
    });

    it('executes transaction successfully', async () => {
      const mockSigner = 'mock-signer';
      const mockTx = 'mock-transaction';

      const result = await iotaClient.executeTransaction(mockTx as any, mockSigner);

      expect(result).toEqual({
        transactionId: 'test-digest',
        status: 'success',
        timestamp: expect.any(Number),
        effects: { status: 'success' },
        objectChanges: [],
      });

      expect(mockIotaClient.executeTransactionBlock).toHaveBeenCalledWith({
        transactionBlock: mockTx,
        signature: mockSigner,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        },
      });
    });

    it('handles transaction execution errors', async () => {
      mockIotaClient.executeTransactionBlock.mockRejectedValue(new Error('Transaction failed'));

      const mockSigner = 'mock-signer';
      const mockTx = 'mock-transaction';

      await expect(iotaClient.executeTransaction(mockTx as any, mockSigner))
        .rejects.toThrow('Failed to execute transaction: Transaction failed');
    });

    it('creates transaction executor', async () => {
      const mockSigner = 'mock-signer';

      const executor = await iotaClient.createTransactionExecutor(mockSigner);

      expect(mockSerialTransactionExecutor).toHaveBeenCalledWith({
        client: expect.any(Object),
        signer: mockSigner,
      });
    });
  });

  describe('DeFi Transaction Creation', () => {
    it('creates swap transaction', async () => {
      const tx = await iotaClient.createSwapTransaction(
        'TokenA',
        'TokenB',
        BigInt('1000000'),
        BigInt('950000')
      );

      expect(mockTransaction.moveCall).toHaveBeenCalledWith({
        target: '0xdefi_package::amm::swap',
        arguments: [
          'pure(TokenA)',
          'pure(TokenB)',
          'pure(1000000)',
          'pure(950000)',
        ],
      });
    });

    it('creates add liquidity transaction', async () => {
      const tx = await iotaClient.createAddLiquidityTransaction(
        'TokenA',
        'TokenB',
        BigInt('1000000'),
        BigInt('2000000'),
        BigInt('1414213')
      );

      expect(mockTransaction.moveCall).toHaveBeenCalledWith({
        target: '0xdefi_package::amm::add_liquidity',
        arguments: [
          'pure(TokenA)',
          'pure(TokenB)',
          'pure(1000000)',
          'pure(2000000)',
          'pure(1414213)',
        ],
      });
    });

    it('creates stake transaction', async () => {
      const tx = await iotaClient.createStakeTransaction(
        'pool-123',
        BigInt('1000000'),
        30
      );

      expect(mockTransaction.moveCall).toHaveBeenCalledWith({
        target: '0xdefi_package::yield_farming::stake',
        arguments: [
          'pure(pool-123)',
          'pure(1000000)',
          'pure(30)',
        ],
      });
    });

    it('creates vote transaction', async () => {
      const tx = await iotaClient.createVoteTransaction(
        'proposal-123',
        true,
        BigInt('1000000')
      );

      expect(mockTransaction.moveCall).toHaveBeenCalledWith({
        target: '0xdefi_package::governance::vote',
        arguments: [
          'pure(proposal-123)',
          'pure(true)',
          'pure(1000000)',
        ],
      });
    });

    it('creates NFT listing transaction', async () => {
      const tx = await iotaClient.createListNFTTransaction(
        'nft-123',
        BigInt('5000000')
      );

      expect(mockTransaction.moveCall).toHaveBeenCalledWith({
        target: '0xdefi_package::nft_marketplace::list_nft',
        arguments: [
          'pure(nft-123)',
          'pure(5000000)',
        ],
      });
    });

    it('splits coins for transactions with amounts', async () => {
      mockTransaction.splitCoins.mockReturnValue(['split-coin']);

      await iotaClient.createSwapTransaction(
        'TokenA',
        'TokenB',
        BigInt('1000000'),
        BigInt('950000')
      );

      expect(mockTransaction.splitCoins).toHaveBeenCalledWith(
        'gas-object',
        ['pure(1000000)']
      );
    });

    it('sets gas budget when specified', async () => {
      await iotaClient.createDeFiTransaction({
        module: 'amm',
        functionName: 'swap',
        args: ['TokenA', 'TokenB'],
        moduleFunction: 'amm::swap',
        gasAmount: BigInt('10000000'),
      });

      expect(mockTransaction.setGasBudget).toHaveBeenCalledWith(BigInt('10000000'));
    });

    it('handles transaction creation errors', async () => {
      mockTransaction.moveCall.mockImplementation(() => {
        throw new Error('Invalid arguments');
      });

      await expect(iotaClient.createSwapTransaction(
        'TokenA',
        'TokenB',
        BigInt('1000000'),
        BigInt('950000')
      )).rejects.toThrow('Failed to create DeFi transaction: Invalid arguments');
    });
  });

  describe('Balance and Object Queries', () => {
    it('gets balance successfully', async () => {
      mockIotaClient.getBalance.mockResolvedValue({
        totalBalance: '1000000',
      });

      const balance = await iotaClient.getBalance('0x123');

      expect(balance).toBe(BigInt('1000000'));
      expect(mockIotaClient.getBalance).toHaveBeenCalledWith({
        owner: '0x123',
        coinType: '0x2::iota::IOTA',
      });
    });

    it('gets balance for custom coin type', async () => {
      mockIotaClient.getBalance.mockResolvedValue({
        totalBalance: '2000000',
      });

      const balance = await iotaClient.getBalance('0x123', '0xdefi::token::DFI');

      expect(balance).toBe(BigInt('2000000'));
      expect(mockIotaClient.getBalance).toHaveBeenCalledWith({
        owner: '0x123',
        coinType: '0xdefi::token::DFI',
      });
    });

    it('handles balance query errors', async () => {
      mockIotaClient.getBalance.mockRejectedValue(new Error('Network error'));

      const balance = await iotaClient.getBalance('0x123');

      expect(balance).toBe(BigInt('0'));
    });

    it('gets owned objects', async () => {
      mockIotaClient.getOwnedObjects.mockResolvedValue({
        data: [{ objectId: '0x1' }, { objectId: '0x2' }],
      });

      const objects = await iotaClient.getOwnedObjects('0x123');

      expect(objects.data).toHaveLength(2);
      expect(mockIotaClient.getOwnedObjects).toHaveBeenCalledWith({
        owner: '0x123',
      });
    });

    it('handles owned objects query errors', async () => {
      mockIotaClient.getOwnedObjects.mockRejectedValue(new Error('Network error'));

      const objects = await iotaClient.getOwnedObjects('0x123');

      expect(objects.data).toEqual([]);
    });

    it('gets transaction status', async () => {
      const mockTxData = { status: 'success' };
      mockIotaClient.getTransactionBlock.mockResolvedValue(mockTxData);

      const txStatus = await iotaClient.getTransactionStatus('digest-123');

      expect(txStatus).toBe(mockTxData);
      expect(mockIotaClient.getTransactionBlock).toHaveBeenCalledWith({
        digest: 'digest-123',
      });
    });

    it('gets contract events', async () => {
      const mockEvents = [
        { id: '1', type: 'SwapEvent' },
        { id: '2', type: 'SwapEvent' },
      ];
      mockIotaClient.getEvents.mockResolvedValue({ data: mockEvents });

      const events = await iotaClient.getContractEvents('amm', 'SwapEvent', 10);

      expect(events).toEqual(mockEvents);
      expect(mockIotaClient.getEvents).toHaveBeenCalledWith({
        query: { MoveEventType: '0xdefi_package::amm::SwapEvent' },
        limit: 10,
      });
    });

    it('gets protocol state', async () => {
      const mockState = { data: { fields: { totalValueLocked: '1000000' } } };
      mockIotaClient.getObject.mockResolvedValue(mockState);

      const state = await iotaClient.getProtocolState();

      expect(state).toBe(mockState);
      expect(mockIotaClient.getObject).toHaveBeenCalledWith({
        id: '0xprotocol_state',
        options: { showContent: true },
      });
    });

    it('gets pool info', async () => {
      const mockPool = { data: { fields: { reserveA: '1000000', reserveB: '2000000' } } };
      mockIotaClient.getObject.mockResolvedValue(mockPool);

      const pool = await iotaClient.getPoolInfo('pool-123');

      expect(pool).toBe(mockPool);
      expect(mockIotaClient.getObject).toHaveBeenCalledWith({
        id: 'pool-123',
        options: { showContent: true },
      });
    });
  });

  describe('Utility Functions', () => {
    describe('formatIotaAmount', () => {
      it('formats amount with default decimals', () => {
        expect(formatIotaAmount(BigInt('1234567'))).toBe('1.234567 IOTA');
      });

      it('formats amount with custom decimals', () => {
        expect(formatIotaAmount(BigInt('1234567890'), 9)).toBe('1.234567890 IOTA');
      });

      it('handles small amounts', () => {
        expect(formatIotaAmount(BigInt('123'))).toBe('0.000123 IOTA');
      });

      it('handles zero amount', () => {
        expect(formatIotaAmount(BigInt('0'))).toBe('0.000000 IOTA');
      });

      it('handles large amounts', () => {
        expect(formatIotaAmount(BigInt('1000000000000'))).toBe('1000000.000000 IOTA');
      });
    });

    describe('parseIotaAmount', () => {
      it('parses integer amounts', () => {
        expect(parseIotaAmount('123')).toBe(BigInt('123000000'));
      });

      it('parses decimal amounts', () => {
        expect(parseIotaAmount('123.456')).toBe(BigInt('123456000'));
      });

      it('parses amounts with full decimals', () => {
        expect(parseIotaAmount('123.456789')).toBe(BigInt('123456789'));
      });

      it('handles amounts with trailing zeros', () => {
        expect(parseIotaAmount('123.4560')).toBe(BigInt('123456000'));
      });

      it('handles amounts with leading zeros', () => {
        expect(parseIotaAmount('0.456789')).toBe(BigInt('456789'));
      });

      it('removes spaces and commas', () => {
        expect(parseIotaAmount('1,234.567')).toBe(BigInt('1234567000'));
        expect(parseIotaAmount('1 234.567')).toBe(BigInt('1234567000'));
      });

      it('handles empty decimal part', () => {
        expect(parseIotaAmount('123.')).toBe(BigInt('123000000'));
      });

      it('handles zero amounts', () => {
        expect(parseIotaAmount('0')).toBe(BigInt('0'));
        expect(parseIotaAmount('0.0')).toBe(BigInt('0'));
      });
    });
  });
});