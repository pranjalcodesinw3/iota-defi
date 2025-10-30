/**
 * Vitest Configuration for IOTA DeFi Protocol Frontend
 *
 * Comprehensive testing setup with:
 * - Unit tests for components and utilities
 * - Integration tests for wallet and contract interactions
 * - E2E simulation tests for DeFi workflows
 * - Performance testing for bundle size and rendering
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{ts,tsx}',
        '**/*.config.*',
        '**/vite.config.*',
        'dist/',
        'build/',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Performance testing configuration
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    // Threads for parallel testing
    threads: true,
    maxThreads: 4,
    minThreads: 2,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
  define: {
    // Define test environment variables
    'process.env.REACT_APP_NETWORK': JSON.stringify('localnet'),
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
});