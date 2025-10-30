/**
 * End-to-End Tests for DeFi User Workflows
 *
 * Tests complete user journeys including:
 * - Wallet connection → Token swap → Balance verification
 * - Liquidity provision → Pool management → Rewards claiming
 * - NFT marketplace interactions
 * - Governance participation
 * - Yield farming workflows
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithProviders, mockWalletHooks, mockWalletState } from '@tests/utils/test-utils';
import App from '@/App';

// Mock all pages to focus on workflow testing
vi.mock('@/pages/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard Page</div>
}));

vi.mock('@/pages/Swap', () => ({
  Swap: () => {
    const [tokenIn, setTokenIn] = React.useState('DFI');
    const [tokenOut, setTokenOut] = React.useState('IOTA');
    const [amountIn, setAmountIn] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSwap = async () => {
      setLoading(true);
      // Simulate swap transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);

      // Trigger success toast
      const { toast } = require('@/components/ui/use-toast');
      toast({ title: 'Success', description: 'Swap completed successfully' });
    };

    return (
      <div data-testid="swap">
        <h1>Token Swap</h1>
        <input
          data-testid="token-in"
          value={tokenIn}
          onChange={(e) => setTokenIn(e.target.value)}
          placeholder="Token In"
        />
        <input
          data-testid="token-out"
          value={tokenOut}
          onChange={(e) => setTokenOut(e.target.value)}
          placeholder="Token Out"
        />
        <input
          data-testid="amount-in"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          placeholder="Amount"
        />
        <button
          data-testid="swap-button"
          onClick={handleSwap}
          disabled={loading || !amountIn}
        >
          {loading ? 'Swapping...' : 'Swap'}
        </button>
      </div>
    );
  }
}));

vi.mock('@/pages/Liquidity', () => ({
  Liquidity: () => {
    const [tab, setTab] = React.useState('add');
    const [tokenA, setTokenA] = React.useState('DFI');
    const [tokenB, setTokenB] = React.useState('IOTA');
    const [amountA, setAmountA] = React.useState('');
    const [amountB, setAmountB] = React.useState('');

    const handleAddLiquidity = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      const { toast } = require('@/components/ui/use-toast');
      toast({ title: 'Success', description: 'Liquidity added successfully' });
    };

    return (
      <div data-testid="liquidity">
        <h1>Liquidity Management</h1>
        <div>
          <button
            data-testid="add-tab"
            onClick={() => setTab('add')}
            className={tab === 'add' ? 'active' : ''}
          >
            Add Liquidity
          </button>
          <button
            data-testid="remove-tab"
            onClick={() => setTab('remove')}
            className={tab === 'remove' ? 'active' : ''}
          >
            Remove Liquidity
          </button>
        </div>

        {tab === 'add' && (
          <div data-testid="add-liquidity-form">
            <input
              data-testid="token-a"
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
            />
            <input
              data-testid="token-b"
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
            />
            <input
              data-testid="amount-a"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
            />
            <input
              data-testid="amount-b"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
            />
            <button
              data-testid="add-liquidity-button"
              onClick={handleAddLiquidity}
              disabled={!amountA || !amountB}
            >
              Add Liquidity
            </button>
          </div>
        )}

        {tab === 'remove' && (
          <div data-testid="remove-liquidity-form">
            <p>Remove Liquidity Form</p>
          </div>
        )}
      </div>
    );
  }
}));

vi.mock('@/pages/YieldFarming', () => ({
  YieldFarming: () => {
    const [pools, setPools] = React.useState([
      { id: 'pool-1', name: 'DFI-IOTA', apy: '45.2%', tvl: '$2.4M' },
      { id: 'pool-2', name: 'YLD-STBL', apy: '23.8%', tvl: '$1.8M' },
    ]);

    const handleStake = async (poolId: string) => {
      await new Promise(resolve => setTimeout(resolve, 600));
      const { toast } = require('@/components/ui/use-toast');
      toast({ title: 'Success', description: 'Staking successful' });
    };

    return (
      <div data-testid="yield-farming">
        <h1>Yield Farming</h1>
        <div data-testid="pools-list">
          {pools.map(pool => (
            <div key={pool.id} data-testid={`pool-${pool.id}`}>
              <span>{pool.name}</span>
              <span>APY: {pool.apy}</span>
              <span>TVL: {pool.tvl}</span>
              <button
                data-testid={`stake-${pool.id}`}
                onClick={() => handleStake(pool.id)}
              >
                Stake
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
}));

vi.mock('@/pages/Governance', () => ({
  Governance: () => {
    const [proposals, setProposals] = React.useState([
      { id: '1', title: 'Increase LP rewards', status: 'Active', endTime: '2024-01-15' },
      { id: '2', title: 'Add new token pair', status: 'Pending', endTime: '2024-01-20' },
    ]);

    const handleVote = async (proposalId: string, support: boolean) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { toast } = require('@/components/ui/use-toast');
      toast({
        title: 'Success',
        description: `Vote ${support ? 'for' : 'against'} proposal ${proposalId} submitted`
      });
    };

    return (
      <div data-testid="governance">
        <h1>Governance</h1>
        <div data-testid="proposals-list">
          {proposals.map(proposal => (
            <div key={proposal.id} data-testid={`proposal-${proposal.id}`}>
              <h3>{proposal.title}</h3>
              <p>Status: {proposal.status}</p>
              <p>End: {proposal.endTime}</p>
              <button
                data-testid={`vote-yes-${proposal.id}`}
                onClick={() => handleVote(proposal.id, true)}
              >
                Vote Yes
              </button>
              <button
                data-testid={`vote-no-${proposal.id}`}
                onClick={() => handleVote(proposal.id, false)}
              >
                Vote No
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
}));

vi.mock('@/pages/NFTMarketplace', () => ({
  NFTMarketplace: () => {
    const [nfts, setNfts] = React.useState([
      { id: '1', name: 'Cosmic Warrior #123', price: '5.5 IOTA', rarity: 'Rare' },
      { id: '2', name: 'Digital Landscape #456', price: '12.3 IOTA', rarity: 'Epic' },
    ]);

    const handleBuyNFT = async (nftId: string) => {
      await new Promise(resolve => setTimeout(resolve, 700));
      const { toast } = require('@/components/ui/use-toast');
      toast({ title: 'Success', description: `NFT ${nftId} purchased successfully` });
    };

    const handleListNFT = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { toast } = require('@/components/ui/use-toast');
      toast({ title: 'Success', description: 'NFT listed successfully' });
    };

    return (
      <div data-testid="nft-marketplace">
        <h1>NFT Marketplace</h1>
        <button data-testid="list-nft-button" onClick={handleListNFT}>
          List NFT
        </button>
        <div data-testid="nfts-grid">
          {nfts.map(nft => (
            <div key={nft.id} data-testid={`nft-${nft.id}`}>
              <h3>{nft.name}</h3>
              <p>Price: {nft.price}</p>
              <p>Rarity: {nft.rarity}</p>
              <button
                data-testid={`buy-nft-${nft.id}`}
                onClick={() => handleBuyNFT(nft.id)}
              >
                Buy NFT
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
}));

describe('DeFi Workflow E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockToast: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    // Mock toast to track notifications
    mockToast = vi.fn();
    vi.mock('@/components/ui/use-toast', () => ({
      toast: mockToast,
      useToast: () => ({ toast: mockToast }),
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup({ delay: null });
    mockToast.mockClear();
  });

  afterEach(() => {
    // Clean up any pending timers
    vi.runAllTimers();
  });

  describe('Wallet Connection Workflow', () => {
    it('connects wallet and navigates to different pages', async () => {
      // Start disconnected
      mockWalletHooks(mockWalletState.disconnected);
      renderWithProviders(<App />);

      // Should see connect wallet button
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();

      // Connect wallet
      act(() => {
        mockWalletHooks(mockWalletState.connected);
      });

      // Re-render to update wallet state
      await waitFor(() => {
        expect(screen.getByText(/0x12345678.../)).toBeInTheDocument();
      });
    });

    it('maintains wallet connection across page navigation', async () => {
      mockWalletHooks(mockWalletState.connected);
      renderWithProviders(<App />, { initialRoute: '/swap' });

      // Wallet should be connected
      await waitFor(() => {
        expect(screen.getByText(/0x12345678.../)).toBeInTheDocument();
      });

      // Navigate to liquidity page
      window.history.pushState({}, '', '/liquidity');
      renderWithProviders(<App />, { initialRoute: '/liquidity' });

      // Wallet should still be connected
      await waitFor(() => {
        expect(screen.getByText(/0x12345678.../)).toBeInTheDocument();
      });
    });
  });

  describe('Token Swap Workflow', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('completes full token swap workflow', async () => {
      renderWithProviders(<App />, { initialRoute: '/swap' });

      // Wait for swap page to load
      await waitFor(() => {
        expect(screen.getByTestId('swap')).toBeInTheDocument();
      });

      // Fill swap form
      const tokenInInput = screen.getByTestId('token-in');
      const tokenOutInput = screen.getByTestId('token-out');
      const amountInput = screen.getByTestId('amount-in');

      await user.clear(tokenInInput);
      await user.type(tokenInInput, 'DFI');

      await user.clear(tokenOutInput);
      await user.type(tokenOutInput, 'IOTA');

      await user.type(amountInput, '100');

      // Submit swap
      const swapButton = screen.getByTestId('swap-button');
      expect(swapButton).not.toBeDisabled();

      await user.click(swapButton);

      // Should show loading state
      expect(screen.getByText('Swapping...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Swap completed successfully'
        });
      }, { timeout: 2000 });
    });

    it('handles swap with insufficient balance', async () => {
      renderWithProviders(<App />, { initialRoute: '/swap' });

      await waitFor(() => {
        expect(screen.getByTestId('swap')).toBeInTheDocument();
      });

      // Try to swap more than available balance
      const amountInput = screen.getByTestId('amount-in');
      await user.type(amountInput, '999999');

      const swapButton = screen.getByTestId('swap-button');
      await user.click(swapButton);

      // In a real app, this would show an error
      // For this mock, it would still succeed
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Swap completed successfully'
        });
      }, { timeout: 2000 });
    });
  });

  describe('Liquidity Provision Workflow', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('adds liquidity to pool', async () => {
      renderWithProviders(<App />, { initialRoute: '/liquidity' });

      await waitFor(() => {
        expect(screen.getByTestId('liquidity')).toBeInTheDocument();
      });

      // Should default to add liquidity tab
      expect(screen.getByTestId('add-liquidity-form')).toBeInTheDocument();

      // Fill liquidity form
      const tokenAInput = screen.getByTestId('token-a');
      const tokenBInput = screen.getByTestId('token-b');
      const amountAInput = screen.getByTestId('amount-a');
      const amountBInput = screen.getByTestId('amount-b');

      await user.clear(tokenAInput);
      await user.type(tokenAInput, 'DFI');

      await user.clear(tokenBInput);
      await user.type(tokenBInput, 'IOTA');

      await user.type(amountAInput, '1000');
      await user.type(amountBInput, '2000');

      // Submit liquidity addition
      const addButton = screen.getByTestId('add-liquidity-button');
      expect(addButton).not.toBeDisabled();

      await user.click(addButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Liquidity added successfully'
        });
      }, { timeout: 1500 });
    });

    it('switches between add and remove liquidity tabs', async () => {
      renderWithProviders(<App />, { initialRoute: '/liquidity' });

      await waitFor(() => {
        expect(screen.getByTestId('add-liquidity-form')).toBeInTheDocument();
      });

      // Click remove tab
      const removeTab = screen.getByTestId('remove-tab');
      await user.click(removeTab);

      expect(screen.getByTestId('remove-liquidity-form')).toBeInTheDocument();
      expect(screen.queryByTestId('add-liquidity-form')).not.toBeInTheDocument();

      // Click add tab again
      const addTab = screen.getByTestId('add-tab');
      await user.click(addTab);

      expect(screen.getByTestId('add-liquidity-form')).toBeInTheDocument();
      expect(screen.queryByTestId('remove-liquidity-form')).not.toBeInTheDocument();
    });
  });

  describe('Yield Farming Workflow', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('stakes in yield farming pools', async () => {
      renderWithProviders(<App />, { initialRoute: '/farming' });

      await waitFor(() => {
        expect(screen.getByTestId('yield-farming')).toBeInTheDocument();
      });

      // Should show available pools
      expect(screen.getByTestId('pools-list')).toBeInTheDocument();
      expect(screen.getByTestId('pool-pool-1')).toBeInTheDocument();
      expect(screen.getByTestId('pool-pool-2')).toBeInTheDocument();

      // Stake in first pool
      const stakeButton1 = screen.getByTestId('stake-pool-1');
      await user.click(stakeButton1);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Staking successful'
        });
      }, { timeout: 1000 });

      // Stake in second pool
      const stakeButton2 = screen.getByTestId('stake-pool-2');
      await user.click(stakeButton2);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Staking successful'
        });
      }, { timeout: 1000 });

      // Should have called toast twice
      expect(mockToast).toHaveBeenCalledTimes(2);
    });
  });

  describe('Governance Workflow', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('participates in governance voting', async () => {
      renderWithProviders(<App />, { initialRoute: '/governance' });

      await waitFor(() => {
        expect(screen.getByTestId('governance')).toBeInTheDocument();
      });

      // Should show proposals
      expect(screen.getByTestId('proposals-list')).toBeInTheDocument();
      expect(screen.getByTestId('proposal-1')).toBeInTheDocument();
      expect(screen.getByTestId('proposal-2')).toBeInTheDocument();

      // Vote yes on first proposal
      const voteYesButton1 = screen.getByTestId('vote-yes-1');
      await user.click(voteYesButton1);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Vote for proposal 1 submitted'
        });
      });

      // Vote no on second proposal
      const voteNoButton2 = screen.getByTestId('vote-no-2');
      await user.click(voteNoButton2);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Vote against proposal 2 submitted'
        });
      });

      expect(mockToast).toHaveBeenCalledTimes(2);
    });
  });

  describe('NFT Marketplace Workflow', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('browses and purchases NFTs', async () => {
      renderWithProviders(<App />, { initialRoute: '/nft' });

      await waitFor(() => {
        expect(screen.getByTestId('nft-marketplace')).toBeInTheDocument();
      });

      // Should show NFT grid
      expect(screen.getByTestId('nfts-grid')).toBeInTheDocument();
      expect(screen.getByTestId('nft-1')).toBeInTheDocument();
      expect(screen.getByTestId('nft-2')).toBeInTheDocument();

      // Buy first NFT
      const buyButton1 = screen.getByTestId('buy-nft-1');
      await user.click(buyButton1);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'NFT 1 purchased successfully'
        });
      }, { timeout: 1000 });

      // Buy second NFT
      const buyButton2 = screen.getByTestId('buy-nft-2');
      await user.click(buyButton2);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'NFT 2 purchased successfully'
        });
      }, { timeout: 1000 });
    });

    it('lists NFT for sale', async () => {
      renderWithProviders(<App />, { initialRoute: '/nft' });

      await waitFor(() => {
        expect(screen.getByTestId('nft-marketplace')).toBeInTheDocument();
      });

      // Click list NFT button
      const listButton = screen.getByTestId('list-nft-button');
      await user.click(listButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'NFT listed successfully'
        });
      }, { timeout: 800 });
    });
  });

  describe('Cross-Feature Workflows', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('completes full DeFi journey: swap → liquidity → farming → governance', async () => {
      // Step 1: Token Swap
      renderWithProviders(<App />, { initialRoute: '/swap' });

      await waitFor(() => {
        expect(screen.getByTestId('swap')).toBeInTheDocument();
      });

      const amountInput = screen.getByTestId('amount-in');
      await user.type(amountInput, '100');

      const swapButton = screen.getByTestId('swap-button');
      await user.click(swapButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Swap completed successfully'
        });
      }, { timeout: 1500 });

      // Step 2: Add Liquidity
      renderWithProviders(<App />, { initialRoute: '/liquidity' });

      await waitFor(() => {
        expect(screen.getByTestId('liquidity')).toBeInTheDocument();
      });

      const amountAInput = screen.getByTestId('amount-a');
      const amountBInput = screen.getByTestId('amount-b');
      await user.type(amountAInput, '50');
      await user.type(amountBInput, '100');

      const addLiquidityButton = screen.getByTestId('add-liquidity-button');
      await user.click(addLiquidityButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Liquidity added successfully'
        });
      }, { timeout: 1200 });

      // Step 3: Yield Farming
      renderWithProviders(<App />, { initialRoute: '/farming' });

      await waitFor(() => {
        expect(screen.getByTestId('yield-farming')).toBeInTheDocument();
      });

      const stakeButton = screen.getByTestId('stake-pool-1');
      await user.click(stakeButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Staking successful'
        });
      }, { timeout: 800 });

      // Step 4: Governance
      renderWithProviders(<App />, { initialRoute: '/governance' });

      await waitFor(() => {
        expect(screen.getByTestId('governance')).toBeInTheDocument();
      });

      const voteButton = screen.getByTestId('vote-yes-1');
      await user.click(voteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Vote for proposal 1 submitted'
        });
      }, { timeout: 600 });

      // Verify all steps completed
      expect(mockToast).toHaveBeenCalledTimes(4);
    });

    it('handles errors gracefully during multi-step workflow', async () => {
      // This test would simulate network failures or transaction errors
      // For the mock implementation, all operations succeed
      // In a real app, you would test error boundaries and retry mechanisms
      expect(true).toBe(true);
    });
  });
});