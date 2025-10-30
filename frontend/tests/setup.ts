/**
 * Test Setup and Configuration
 *
 * Global test setup including:
 * - Jest DOM matchers
 * - IOTA client mocks
 * - Wallet mocks
 * - React Query test utils
 * - Global test utilities
 */

import '@testing-library/jest-dom';
import { beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock IOTA SDK modules
vi.mock('@iota/iota-sdk/client', () => ({
  IotaClient: vi.fn().mockImplementation(() => ({
    getBalance: vi.fn().mockResolvedValue({ totalBalance: '1000000' }),
    getOwnedObjects: vi.fn().mockResolvedValue({ data: [] }),
    executeTransactionBlock: vi.fn().mockResolvedValue({
      digest: 'mock-digest',
      effects: {},
      objectChanges: []
    }),
    getTransactionBlock: vi.fn().mockResolvedValue({}),
    getObject: vi.fn().mockResolvedValue({}),
    getEvents: vi.fn().mockResolvedValue({ data: [] }),
  })),
  getFullnodeUrl: vi.fn().mockImplementation((network) => `https://api.${network}.iota.cafe`),
}));

vi.mock('@iota/iota-sdk/transactions', () => ({
  Transaction: vi.fn().mockImplementation(() => ({
    moveCall: vi.fn(),
    splitCoins: vi.fn(),
    setGasBudget: vi.fn(),
    pure: vi.fn(),
    gas: {},
  })),
  SerialTransactionExecutor: vi.fn().mockImplementation(() => ({})),
}));

// Mock IOTA DApp Kit
vi.mock('@iota/dapp-kit', () => ({
  useCurrentWallet: vi.fn(),
  useConnectWallet: vi.fn(),
  useDisconnectWallet: vi.fn(),
  IotaClientProvider: ({ children }: { children: React.ReactNode }) => children,
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock React Router DOM
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: () => null,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
}));

// Mock Zustand store
vi.mock('@/store/useAppStore', () => ({
  useAppStore: vi.fn().mockReturnValue({
    theme: 'light',
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    setTheme: vi.fn(),
  }),
}));

// Mock toast notifications
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock performance API for performance tests
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn().mockReturnValue(Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([]),
    getEntriesByType: vi.fn().mockReturnValue([]),
  },
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  // Suppress console warnings in tests unless debugging
  if (!process.env.DEBUG) {
    global.console.warn = vi.fn();
    global.console.error = vi.fn();
  }
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

// Define global test types
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): void;
      toHaveClass(className: string): void;
      toHaveAttribute(attr: string, value?: string): void;
      toBeVisible(): void;
      toBeDisabled(): void;
    }
  }
}

export {};