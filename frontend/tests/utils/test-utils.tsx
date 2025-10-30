/**
 * Test Utilities and Custom Renderers
 *
 * Provides utilities for testing React components with proper providers
 * and mock implementations for IOTA-specific functionality
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock wallet state for testing
export interface MockWalletState {
  isConnected: boolean;
  address?: string;
  balance?: bigint;
  network?: string;
  name?: string;
}

// Create a new QueryClient for each test to avoid cache pollution
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Test provider wrapper
interface TestProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function TestProviders({
  children,
  queryClient = createTestQueryClient(),
  initialRoute = '/'
}: TestProvidersProps) {
  // Set initial route for testing
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const { queryClient = createTestQueryClient(), initialRoute, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient} initialRoute={initialRoute}>
      {children}
    </TestProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Mock wallet utilities
export const mockWalletState = {
  disconnected: {
    isConnected: false,
  },
  connected: {
    isConnected: true,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    balance: BigInt('1000000'),
    network: 'testnet',
    name: 'Mock Wallet',
  },
} satisfies Record<string, MockWalletState>;

// Mock IOTA client responses
export const mockIotaResponses = {
  balance: {
    totalBalance: '1000000',
  },
  ownedObjects: {
    data: [
      {
        objectId: '0x1',
        type: 'DeFi LP Token',
        version: '1',
        digest: 'mock-digest-1',
      }
    ],
  },
  transactionResult: {
    digest: 'mock-transaction-digest',
    effects: {
      status: { status: 'success' },
      gasUsed: { computationCost: '1000', storageCost: '500', storageRebate: '100' }
    },
    objectChanges: [],
  },
  poolInfo: {
    data: {
      objectId: '0xpool1',
      content: {
        fields: {
          tokenA: '0xtoken_a',
          tokenB: '0xtoken_b',
          reserveA: '1000000',
          reserveB: '2000000',
          lpTokenSupply: '1414213',
        }
      }
    }
  },
};

// Helper to mock wallet hooks
export const mockWalletHooks = (state: MockWalletState) => {
  const { useCurrentWallet, useConnectWallet, useDisconnectWallet } = require('@iota/dapp-kit');

  useCurrentWallet.mockReturnValue(state.isConnected ? {
    accounts: [{ address: state.address }],
    name: state.name,
  } : null);

  useConnectWallet.mockReturnValue({
    mutate: vi.fn().mockImplementation((_, { onSuccess }) => {
      if (onSuccess) onSuccess();
    }),
    isPending: false,
  });

  useDisconnectWallet.mockReturnValue({
    mutate: vi.fn(),
  });
};

// Helper to wait for async operations
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Helper to generate test data
export const generateMockTransaction = (overrides = {}) => ({
  digest: 'mock-digest',
  status: 'success',
  timestamp: Date.now(),
  effects: {},
  objectChanges: [],
  ...overrides,
});

export const generateMockPool = (overrides = {}) => ({
  id: 'mock-pool-id',
  tokenA: 'DFI',
  tokenB: 'IOTA',
  reserveA: BigInt('1000000'),
  reserveB: BigInt('2000000'),
  fee: 30, // 0.3%
  ...overrides,
});

// Mock form data for testing
export const mockFormData = {
  swap: {
    tokenIn: 'DFI',
    tokenOut: 'IOTA',
    amountIn: '100',
    slippage: '0.5',
  },
  liquidity: {
    tokenA: 'DFI',
    tokenB: 'IOTA',
    amountA: '1000',
    amountB: '2000',
  },
  stake: {
    poolId: 'mock-pool-id',
    amount: '1000',
    lockPeriod: 30,
  },
};

// Performance testing utilities
export const measureRenderTime = async (componentRender: () => Promise<void> | void) => {
  const start = performance.now();
  await componentRender();
  const end = performance.now();
  return end - start;
};

export const measureBundleSize = () => {
  // Mock implementation for bundle size measurement
  // In real scenario, this would analyze actual bundle
  return {
    totalSize: 1024 * 1024, // 1MB mock size
    gzippedSize: 256 * 1024, // 256KB mock gzipped
    chunkSizes: {
      main: 512 * 1024,
      vendor: 512 * 1024,
    },
  };
};

// Re-export testing library utilities
export * from '@testing-library/react';
export * from '@testing-library/user-event';

// Make renderWithProviders the default export
export { renderWithProviders as render };