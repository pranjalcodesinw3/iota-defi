/**
 * IOTA DeFi Protocol - Wallet Connection Component
 *
 * Advanced wallet connection component with IOTA integration
 * Based on iotaflow pattern with DeFi-specific enhancements
 */

"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useCurrentWallet, useConnectWallet, useDisconnectWallet } from "@iota/dapp-kit";
import { Loader2, Wallet, ChevronDown, ExternalLink, Copy, LogOut } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatIotaAmount, iotaClient } from '@/lib/iota/client';
import { NETWORK_CONFIG } from '@/config/network';

interface WalletInfo {
  address: string;
  balance: bigint;
  network: string;
}

export function WalletConnect() {
  const currentWallet = useCurrentWallet();
  const { mutate: connect, isPending: connecting } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();

  const [isClient, setIsClient] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load wallet balance when connected
  useEffect(() => {
    const loadWalletInfo = async () => {
      if (currentWallet?.accounts?.[0]?.address) {
        setIsLoadingBalance(true);
        try {
          const address = currentWallet.accounts[0].address;
          const balance = await iotaClient.getBalance(address);

          setWalletInfo({
            address,
            balance,
            network: NETWORK_CONFIG.NETWORK
          });
        } catch (error) {
          console.error('Error loading wallet info:', error);
          toast({
            title: "Error",
            description: "Failed to load wallet information",
            variant: "destructive",
          });
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        setWalletInfo(null);
      }
    };

    loadWalletInfo();
  }, [currentWallet]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleConnect = () => {
    try {
      connect(
        { wallet: undefined }, // Let user choose wallet
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Wallet connected successfully",
            });
          },
          onError: (error) => {
            console.error('Wallet connection error:', error);
            toast({
              title: "Connection Error",
              description: "Failed to connect wallet. Please try again.",
              variant: "destructive",
            });
          }
        }
      );
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const handleDisconnect = () => {
    setIsDropdownOpen(false);
    disconnect();
    setWalletInfo(null);
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully",
    });
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Copied",
        description: "Address copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying address:', error);
    }
  };

  const openExplorer = (address: string) => {
    const url = `${NETWORK_CONFIG.EXPLORER_URL}/address/${address}`;
    window.open(url, '_blank');
  };

  if (!isClient) {
    return null;
  }

  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Connected state
  if (currentWallet?.accounts?.[0] && walletInfo) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          className="flex items-center gap-3 border-border bg-background hover:bg-muted min-w-[200px]"
          onClick={toggleDropdown}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-foreground">
                {shortenAddress(walletInfo.address)}
              </span>
              <span className="text-xs text-muted-foreground">
                {isLoadingBalance ? 'Loading...' : formatIotaAmount(walletInfo.balance)}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-80 rounded-lg bg-popover border border-border shadow-lg z-50">
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Wallet Connected
                  </h3>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-muted-foreground capitalize">
                      {walletInfo.network}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="p-4 space-y-4">
                {/* Address */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Address
                  </label>
                  <div className="flex items-center gap-2 mt-1 p-2 bg-muted rounded-md">
                    <code className="text-xs text-foreground flex-1 break-all">
                      {walletInfo.address}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyAddress(walletInfo.address)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => openExplorer(walletInfo.address)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Balance
                  </label>
                  <div className="mt-1 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-md">
                    {isLoadingBalance ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-foreground">Loading balance...</span>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-foreground">
                        {formatIotaAmount(walletInfo.balance)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Wallet Name */}
                {currentWallet.name && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Wallet
                    </label>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {currentWallet.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnect}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <Button
      onClick={handleConnect}
      variant="default"
      disabled={connecting}
      className="bg-primary hover:bg-primary/90 min-w-[140px]"
    >
      {connecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}

// Export for use in layout components
export default WalletConnect;