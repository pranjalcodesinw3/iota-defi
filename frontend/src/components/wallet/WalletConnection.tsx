/**
 * Advanced IOTA Wallet Connection Component
 * Provides comprehensive wallet integration using @iota/dapp-kit
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  useCurrentWallet, 
  useConnectWallet, 
  useDisconnectWallet,
  useAccounts,
  useWallets,
  useCurrentAccount,
  useIotaClient
} from '@iota/dapp-kit';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Loader2, Wallet, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { formatIOTA, shortenAddress } from '../../utils/format';
import { useCoinBalance } from '../../hooks/useCoinBalance';

interface WalletConnectionProps {
  variant?: 'default' | 'compact' | 'detailed';
  showBalance?: boolean;
  showDisconnect?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export function WalletConnection({ 
  variant = 'default',
  showBalance = true,
  showDisconnect = true,
  onConnectionChange
}: WalletConnectionProps) {
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const { mutate: connect, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const currentAccount = useCurrentAccount();
  const wallets = useWallets();
  const client = useIotaClient();
  
  const { data: balance, isLoading: balanceLoading } = useCoinBalance(
    currentAccount?.address
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    onConnectionChange?.(connectionStatus === 'connected');
  }, [connectionStatus, onConnectionChange]);

  const handleConnect = useCallback((walletName?: string) => {
    try {
      connect(
        { wallet: wallets.find(w => w.name === walletName) || wallets[0] },
        {
          onSuccess: () => {
            toast({
              title: "Wallet Connected",
              description: `Successfully connected to ${walletName || 'wallet'}`
            });
          },
          onError: (error) => {
            toast({
              title: "Connection Failed",
              description: error.message,
              variant: "destructive"
            });
          }
        }
      );
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, [connect, wallets, toast]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setIsDropdownOpen(false);
    toast({
      title: "Wallet Disconnected",
      description: "Successfully disconnected from wallet"
    });
  }, [disconnect, toast]);

  const copyAddress = useCallback(() => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard"
      });
    }
  }, [currentAccount?.address, toast]);

  if (!isClient) {
    return (
      <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
    );
  }

  // Compact variant for headers/navbars
  if (variant === 'compact') {
    if (connectionStatus === 'connected' && currentAccount) {
      return (
        <Button 
          variant="outline" 
          size="sm" 
          className="relative"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Avatar className="h-4 w-4 mr-2">
            <AvatarFallback className="text-xs">
              {currentWallet?.name?.[0] || 'W'}
            </AvatarFallback>
          </Avatar>
          {shortenAddress(currentAccount.address)}
          
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-popover border rounded-lg shadow-lg z-50 p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{currentWallet?.name}</Badge>
                  {showBalance && balance && (
                    <Badge variant="outline">{formatIOTA(balance)} IOTA</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {currentAccount.address}
                </p>
                {showDisconnect && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleDisconnect}
                    className="w-full justify-start text-destructive"
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          )}
        </Button>
      );
    }
    
    return (
      <Button 
        size="sm" 
        onClick={() => handleConnect()}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Connect
          </>
        )}
      </Button>
    );
  }

  // Detailed variant for settings/profile pages
  if (variant === 'detailed') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus === 'connected' && currentAccount ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {currentWallet?.name?.[0] || 'W'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{currentWallet?.name}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                      {currentAccount.address}
                    </code>
                    <Button size="sm" variant="ghost" onClick={copyAddress}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {showBalance && (
                  <div>
                    <label className="text-sm font-medium">Balance</label>
                    <div className="mt-1">
                      {balanceLoading ? (
                        <div className="h-8 bg-muted animate-pulse rounded" />
                      ) : balance ? (
                        <p className="text-lg font-semibold">
                          {formatIOTA(balance)} IOTA
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unable to load balance</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {showDisconnect && (
                <>
                  <Separator />
                  <Button 
                    variant="destructive" 
                    onClick={handleDisconnect}
                    className="w-full"
                  >
                    Disconnect Wallet
                  </Button>
                </>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to start using DeFi features
                </p>
              </div>
              
              {wallets.length > 0 ? (
                <div className="space-y-2">
                  {wallets.map((wallet) => (
                    <Button
                      key={wallet.name}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleConnect(wallet.name)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <img 
                          src={wallet.icon} 
                          alt={wallet.name} 
                          className="h-4 w-4 mr-2" 
                        />
                      )}
                      {wallet.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No wallets detected. Please install an IOTA wallet extension.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  if (connectionStatus === 'connected' && currentAccount) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {currentWallet?.name?.[0] || 'W'}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {shortenAddress(currentAccount.address)}
          </span>
          {showBalance && balance && (
            <Badge variant="secondary" className="ml-2">
              {formatIOTA(balance)}
            </Badge>
          )}
        </Button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {currentWallet?.name?.[0] || 'W'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{currentWallet?.name}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                    {currentAccount.address}
                  </code>
                  <Button size="sm" variant="ghost" onClick={copyAddress}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {showBalance && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Balance</label>
                  <div className="mt-1">
                    {balanceLoading ? (
                      <div className="h-6 bg-muted animate-pulse rounded" />
                    ) : balance ? (
                      <p className="font-semibold">{formatIOTA(balance)} IOTA</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unable to load</p>
                    )}
                  </div>
                </div>
              )}
              
              {showDisconnect && (
                <>
                  <Separator />
                  <Button 
                    size="sm"
                    variant="ghost" 
                    onClick={handleDisconnect}
                    className="w-full justify-start text-destructive"
                  >
                    Disconnect Wallet
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button 
      onClick={() => handleConnect()}
      disabled={isConnecting}
      className="flex items-center gap-2"
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}