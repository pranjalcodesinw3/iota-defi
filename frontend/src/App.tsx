/**
 * IOTA Advanced DeFi Protocol - Main Application Component
 *
 * A comprehensive DeFi frontend application featuring:
 * - Advanced AMM with dynamic pricing
 * - Multi-token ecosystem management
 * - Dynamic NFT marketplace with evolution
 * - DAO governance interface
 * - Real-time price oracles
 * - Yield farming with time-locked staking
 * - Fractional NFT ownership
 *
 * Built with modern React, TypeScript, and IOTA DApp Kit
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IotaClientProvider, WalletProvider } from '@iota/dapp-kit';
import { getFullnodeUrl } from '@iota/iota-sdk/client';
import '@iota/dapp-kit/dist/index.css';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/toaster';

// Layout components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';

// Page components
import { Dashboard } from './pages/Dashboard';
import { Swap } from './pages/Swap';
import { Liquidity } from './pages/Liquidity';
import { YieldFarming } from './pages/YieldFarming';
import { Governance } from './pages/Governance';
import { NFTMarketplace } from './pages/NFTMarketplace';
import { NFTCollection } from './pages/NFTCollection';
import { Profile } from './pages/Profile';
import { Analytics } from './pages/Analytics';

// Configuration and utilities
import { NETWORK_CONFIG } from './config/network';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Styles
import './styles/globals.css';

// Create query client for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Retry up to 3 times for network errors
        if (failureCount < 3 && error instanceof Error && error.message.includes('network')) {
          return true;
        }
        return false;
      },
    },
  },
});

// IOTA client configuration
const networks = {
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  localnet: { url: 'http://127.0.0.1:9000' },
};

function AppContent() {
  const { theme, sidebarCollapsed } = useAppStore();

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <div className=\"flex h-screen overflow-hidden\">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          {/* Header */}
          <Header />

          {/* Main content area */}
          <main className=\"flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900\">
            <ErrorBoundary>
              <Routes>
                {/* Core DeFi Routes */}
                <Route path=\"/\" element={<Dashboard />} />
                <Route path=\"/dashboard\" element={<Dashboard />} />
                <Route path=\"/swap\" element={<Swap />} />
                <Route path=\"/liquidity\" element={<Liquidity />} />
                <Route path=\"/farming\" element={<YieldFarming />} />
                <Route path=\"/governance\" element={<Governance />} />

                {/* NFT Marketplace Routes */}
                <Route path=\"/nft\" element={<NFTMarketplace />} />
                <Route path=\"/nft/collection/:id\" element={<NFTCollection />} />

                {/* User & Analytics Routes */}
                <Route path=\"/profile\" element={<Profile />} />
                <Route path=\"/analytics\" element={<Analytics />} />

                {/* Catch all route */}
                <Route path=\"*\" element={<Dashboard />} />
              </Routes>
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <IotaClientProvider networks={networks} defaultNetwork={NETWORK_CONFIG.NETWORK as keyof typeof networks}>
          <WalletProvider autoConnect>
            <TooltipProvider>
              <Router>
                <AppContent />
                <Toaster />
              </Router>
            </TooltipProvider>
          </WalletProvider>
        </IotaClientProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;