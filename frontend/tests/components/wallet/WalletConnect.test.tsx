/**
 * Unit Tests for WalletConnect Component
 *
 * Tests cover:
 * - Wallet connection states
 * - User interactions (connect/disconnect)
 * - Balance loading and display
 * - Error handling
 * - Address copying and external links
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { renderWithProviders, mockWalletHooks, mockWalletState } from '@tests/utils/test-utils';

// Mock toast function
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  toast: mockToast,
}));

// Mock IOTA client
const mockIotaClient = {
  getBalance: vi.fn(),
};
vi.mock('@/lib/iota/client', () => ({
  iotaClient: mockIotaClient,
  formatIotaAmount: (amount: bigint) => `${amount} IOTA`,
}));

describe('WalletConnect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIotaClient.getBalance.mockResolvedValue(BigInt('1000000'));
  });

  describe('Disconnected State', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.disconnected);
    });

    it('renders connect button when wallet is disconnected', () => {
      renderWithProviders(<WalletConnect />);

      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
      expect(screen.getByText('Connect Wallet')).toBeVisible();
    });

    it('shows wallet icon in connect button', () => {
      renderWithProviders(<WalletConnect />);

      const button = screen.getByRole('button', { name: /connect wallet/i });
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('handles wallet connection', async () => {
      const user = userEvent.setup();
      const mockConnect = vi.fn();

      // Mock the connect wallet hook to return our mock function
      const { useConnectWallet } = require('@iota/dapp-kit');
      useConnectWallet.mockReturnValue({
        mutate: mockConnect,
        isPending: false,
      });

      renderWithProviders(<WalletConnect />);

      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      expect(mockConnect).toHaveBeenCalledWith(
        { wallet: undefined },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('shows loading state during connection', () => {
      const { useConnectWallet } = require('@iota/dapp-kit');
      useConnectWallet.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<WalletConnect />);

      expect(screen.getByText('Connecting...')).toBeVisible();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('renders wallet info when connected', async () => {
      renderWithProviders(<WalletConnect />);

      await waitFor(() => {
        expect(screen.getByText(/0x12345678.../)).toBeInTheDocument();
      });

      expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
    });

    it('shows connection indicator', () => {
      renderWithProviders(<WalletConnect />);

      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('opens dropdown on click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      });
    });

    it('displays full address in dropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        expect(screen.getByText('0x1234567890abcdef1234567890abcdef12345678')).toBeInTheDocument();
      });
    });

    it('copies address to clipboard', async () => {
      const user = userEvent.setup();
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.getAttribute('class')?.includes('h-3')
        );
        expect(copyButton).toBeInTheDocument();
      });

      const copyButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('h-3')
      );
      await user.click(copyButton!);

      expect(mockWriteText).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Copied',
        description: 'Address copied to clipboard',
      });
    });

    it('opens explorer link', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      window.open = mockOpen;

      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        const explorerButtons = screen.getAllByRole('button');
        const explorerButton = explorerButtons.find(btn =>
          btn.querySelector('svg')?.getAttribute('class')?.includes('h-3')
        );
        expect(explorerButton).toBeInTheDocument();
      });

      // Click the second button (explorer link)
      const buttons = screen.getAllByRole('button');
      const explorerButton = buttons.find(btn =>
        btn.getAttribute('title') !== 'Copy' &&
        btn.querySelector('svg')?.getAttribute('class')?.includes('h-3')
      );

      if (explorerButton) {
        await user.click(explorerButton);
      }

      await waitFor(() => {
        expect(mockOpen).toHaveBeenCalled();
      });
    });

    it('disconnects wallet', async () => {
      const user = userEvent.setup();
      const mockDisconnect = vi.fn();

      const { useDisconnectWallet } = require('@iota/dapp-kit');
      useDisconnectWallet.mockReturnValue({
        mutate: mockDisconnect,
      });

      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole('button', { name: /disconnect wallet/i });
      await user.click(disconnectButton);

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Disconnected',
        description: 'Wallet disconnected successfully',
      });
    });

    it('closes dropdown when clicking backdrop', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByText('Wallet Connected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Balance Loading', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.connected);
    });

    it('shows loading state while fetching balance', async () => {
      mockIotaClient.getBalance.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(BigInt('1000000')), 100))
      );

      renderWithProviders(<WalletConnect />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
      });
    });

    it('handles balance loading error', async () => {
      mockIotaClient.getBalance.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<WalletConnect />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load wallet information',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockWalletHooks(mockWalletState.disconnected);
    });

    it('handles connection errors', async () => {
      const user = userEvent.setup();
      const mockConnect = vi.fn().mockImplementation((_, { onError }) => {
        onError(new Error('Connection failed'));
      });

      const { useConnectWallet } = require('@iota/dapp-kit');
      useConnectWallet.mockReturnValue({
        mutate: mockConnect,
        isPending: false,
      });

      renderWithProviders(<WalletConnect />);

      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Connection Error',
          description: 'Failed to connect wallet. Please try again.',
          variant: 'destructive',
        });
      });
    });

    it('handles clipboard copy errors', async () => {
      const user = userEvent.setup();
      mockWalletHooks(mockWalletState.connected);

      // Mock clipboard to reject
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error'))
        }
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.getAttribute('class')?.includes('h-3')
        );
        expect(copyButton).toBeInTheDocument();
      });

      const copyButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.getAttribute('class')?.includes('h-3')
      );
      await user.click(copyButton!);

      expect(consoleSpy).toHaveBeenCalledWith('Error copying address:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Address Formatting', () => {
    it('shortens long addresses correctly', () => {
      mockWalletHooks(mockWalletState.connected);
      renderWithProviders(<WalletConnect />);

      // Should show first 8 and last 6 characters
      expect(screen.getByText(/0x12345678.*345678/)).toBeInTheDocument();
    });

    it('handles empty address gracefully', () => {
      mockWalletHooks({
        isConnected: true,
        address: '',
        balance: BigInt('1000000'),
        network: 'testnet',
      });

      renderWithProviders(<WalletConnect />);

      // Should not crash with empty address
      expect(screen.getByText('1000000 IOTA')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper button labels', () => {
      mockWalletHooks(mockWalletState.disconnected);
      renderWithProviders(<WalletConnect />);

      const button = screen.getByRole('button', { name: /connect wallet/i });
      expect(button).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      mockWalletHooks(mockWalletState.connected);
      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');

      // Focus and press Enter
      walletButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Wallet Connected')).toBeInTheDocument();
      });
    });

    it('provides proper aria labels', async () => {
      const user = userEvent.setup();
      mockWalletHooks(mockWalletState.connected);
      renderWithProviders(<WalletConnect />);

      const walletButton = screen.getByRole('button');
      await user.click(walletButton);

      await waitFor(() => {
        const disconnectButton = screen.getByRole('button', { name: /disconnect wallet/i });
        expect(disconnectButton).toHaveAttribute('type', 'button');
      });
    });
  });
});