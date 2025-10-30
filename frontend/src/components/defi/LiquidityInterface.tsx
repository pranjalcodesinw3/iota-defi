/**
 * Liquidity Interface Component - Provides UI for liquidity provision and AMM trading
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { ArrowUpDown, Plus, Minus, RefreshCw, TrendingUp, Droplets } from 'lucide-react';
import { useDeFiProtocol } from '../../hooks/useDeFiProtocol';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatIOTA, formatPercentage, formatCompactNumber } from '../../utils/format';
import { useToast } from '../ui/use-toast';
import { parseIOTA } from '../../utils/format';

const TOKEN_LIST = [
  { symbol: 'IOTA', name: 'IOTA', icon: '🔷', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', icon: '💵', decimals: 6 },
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', icon: '♦️', decimals: 18 },
  { symbol: 'WETH', name: 'Wrapped ETH', icon: '🔄', decimals: 18 },
  { symbol: 'DAI', name: 'Dai Stablecoin', icon: '💰', decimals: 18 }
];

const POPULAR_PAIRS = [
  { tokenA: 'IOTA', tokenB: 'USDC', fee: 0.3, volume24h: 125000 },
  { tokenA: 'IOTA', tokenB: 'ETH', fee: 0.3, volume24h: 98000 },
  { tokenA: 'BTC', tokenB: 'USDC', fee: 0.3, volume24h: 87500 },
  { tokenA: 'ETH', tokenB: 'USDC', fee: 0.3, volume24h: 156000 }
];

export function LiquidityInterface() {
  const [activeTab, setActiveTab] = useState('add');
  const [selectedPair, setSelectedPair] = useState({ tokenA: 'IOTA', tokenB: 'USDC' });
  const [amounts, setAmounts] = useState({ tokenA: '', tokenB: '' });
  const [swapAmounts, setSwapAmounts] = useState({ from: '', to: '' });
  const [swapTokens, setSwapTokens] = useState({ from: 'IOTA', to: 'USDC' });
  const [slippage, setSlippage] = useState(0.5);
  
  const currentAccount = useCurrentAccount();
  const defi = useDeFiProtocol();
  const { toast } = useToast();
  
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [userPositions, setUserPositions] = useState<any[]>([]);
  const [swapQuote, setSwapQuote] = useState<any>(null);
  
  // Fetch pool data
  useEffect(() => {
    if (selectedPair.tokenA && selectedPair.tokenB) {
      defi.liquidity.getPoolInfo(selectedPair.tokenA, selectedPair.tokenB)
        .then(setPoolInfo)
        .catch(console.error);
    }
  }, [selectedPair, defi]);
  
  // Fetch user positions
  useEffect(() => {
    if (currentAccount?.address) {
      defi.liquidity.getUserLiquidityPositions(currentAccount.address)
        .then(setUserPositions)
        .catch(console.error);
    }
  }, [currentAccount?.address, defi]);
  
  // Get swap quote
  useEffect(() => {
    if (swapAmounts.from && swapTokens.from && swapTokens.to) {
      defi.liquidity.getSwapQuote(swapTokens.from, swapTokens.to, swapAmounts.from)
        .then(setSwapQuote)
        .catch(console.error);
    }
  }, [swapAmounts.from, swapTokens, defi]);
  
  const handleAddLiquidity = async () => {
    if (!amounts.tokenA || !amounts.tokenB || !currentAccount) return;
    
    try {
      await defi.liquidity.addLiquidity(
        selectedPair.tokenA,
        selectedPair.tokenB,
        amounts.tokenA,
        amounts.tokenB
      );
      
      setAmounts({ tokenA: '', tokenB: '' });
      toast({
        title: "Liquidity Added",
        description: `Successfully added liquidity to ${selectedPair.tokenA}/${selectedPair.tokenB} pool`
      });
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
  };
  
  const handleRemoveLiquidity = async (poolId: string, shares: string) => {
    try {
      await defi.liquidity.removeLiquidity(poolId, shares);
      toast({
        title: "Liquidity Removed",
        description: "Successfully removed liquidity from pool"
      });
    } catch (error) {
      console.error('Remove liquidity failed:', error);
    }
  };
  
  const handleSwap = async () => {
    if (!swapAmounts.from || !swapQuote || !currentAccount) return;
    
    try {
      const minAmountOut = (parseFloat(swapQuote.amountOut) * (1 - slippage / 100)).toString();
      
      await defi.liquidity.swap(
        swapTokens.from,
        swapTokens.to,
        swapAmounts.from,
        minAmountOut
      );
      
      setSwapAmounts({ from: '', to: '' });
      toast({
        title: "Swap Successful",
        description: `Successfully swapped ${swapAmounts.from} ${swapTokens.from} for ${swapTokens.to}`
      });
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };
  
  const switchSwapTokens = () => {
    setSwapTokens({ from: swapTokens.to, to: swapTokens.from });
    setSwapAmounts({ from: swapAmounts.to, to: swapAmounts.from });
  };
  
  const getTokenInfo = (symbol: string) => {
    return TOKEN_LIST.find(t => t.symbol === symbol) || TOKEN_LIST[0];
  };
  
  if (!currentAccount) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Liquidity Protocol
          </CardTitle>
          <CardDescription>
            Please connect your wallet to access liquidity features
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Popular Pairs Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Popular Trading Pairs
          </CardTitle>
          <CardDescription>
            High-volume liquidity pools with competitive fees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_PAIRS.map((pair, index) => {
              const tokenAInfo = getTokenInfo(pair.tokenA);
              const tokenBInfo = getTokenInfo(pair.tokenB);
              const isSelected = selectedPair.tokenA === pair.tokenA && selectedPair.tokenB === pair.tokenB;
              
              return (
                <div
                  key={`${pair.tokenA}-${pair.tokenB}`}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPair({ tokenA: pair.tokenA, tokenB: pair.tokenB })}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{tokenAInfo.icon}</span>
                    <span className="text-lg">{tokenBInfo.icon}</span>
                    <div>
                      <p className="font-medium">{pair.tokenA}/{pair.tokenB}</p>
                      <Badge variant="outline" className="text-xs">
                        {formatPercentage(pair.fee)} fee
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">24h Volume</span>
                      <span className="font-medium">${formatCompactNumber(pair.volume24h)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTokenInfo(selectedPair.tokenA).icon}
              {getTokenInfo(selectedPair.tokenB).icon}
              {selectedPair.tokenA}/{selectedPair.tokenB}
            </CardTitle>
            <CardDescription>
              Manage liquidity and trade tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="add" className="flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Add
                </TabsTrigger>
                <TabsTrigger value="remove" className="flex items-center gap-1">
                  <Minus className="h-3 w-3" />
                  Remove
                </TabsTrigger>
                <TabsTrigger value="swap" className="flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" />
                  Swap
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="add" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenA-amount">{selectedPair.tokenA} Amount</Label>
                    <Input
                      id="tokenA-amount"
                      type="number"
                      placeholder="0.0"
                      value={amounts.tokenA}
                      onChange={(e) => setAmounts({ ...amounts, tokenA: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tokenB-amount">{selectedPair.tokenB} Amount</Label>
                    <Input
                      id="tokenB-amount"
                      type="number"
                      placeholder="0.0"
                      value={amounts.tokenB}
                      onChange={(e) => setAmounts({ ...amounts, tokenB: e.target.value })}
                    />
                  </div>
                  
                  {poolInfo && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exchange Rate</span>
                          <span>1 {selectedPair.tokenA} = {poolInfo.exchangeRate} {selectedPair.tokenB}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pool Share</span>
                          <span>{formatPercentage(poolInfo.userShare || 0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleAddLiquidity}
                    disabled={!amounts.tokenA || !amounts.tokenB || defi.isLoading}
                    className="w-full"
                  >
                    {defi.isLoading ? 'Processing...' : 'Add Liquidity'}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="remove" className="space-y-4">
                {userPositions.length === 0 ? (
                  <div className="text-center py-8">
                    <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No liquidity positions</p>
                    <p className="text-sm text-muted-foreground">Add liquidity to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userPositions.map((position, index) => (
                      <div key={position.id || index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{position.tokenA}/{position.tokenB}</span>
                            <Badge variant="outline">{formatPercentage(position.fee)} fee</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatPercentage(position.shareOfPool)} of pool
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{position.tokenA}</span>
                            <p className="font-medium">{formatIOTA(position.amountA)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{position.tokenB}</span>
                            <p className="font-medium">{formatIOTA(position.amountB)}</p>
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveLiquidity(position.id, position.shares)}
                          disabled={defi.isLoading}
                          className="w-full"
                        >
                          Remove Liquidity
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="swap" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-amount">From</Label>
                    <div className="flex gap-2">
                      <select
                        value={swapTokens.from}
                        onChange={(e) => setSwapTokens({ ...swapTokens, from: e.target.value })}
                        className="p-2 border border-border rounded-md bg-background min-w-[100px]"
                      >
                        {TOKEN_LIST.map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol}
                          </option>
                        ))}
                      </select>
                      <Input
                        id="from-amount"
                        type="number"
                        placeholder="0.0"
                        value={swapAmounts.from}
                        onChange={(e) => setSwapAmounts({ ...swapAmounts, from: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={switchSwapTokens}
                      className="rounded-full"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="to-amount">To</Label>
                    <div className="flex gap-2">
                      <select
                        value={swapTokens.to}
                        onChange={(e) => setSwapTokens({ ...swapTokens, to: e.target.value })}
                        className="p-2 border border-border rounded-md bg-background min-w-[100px]"
                      >
                        {TOKEN_LIST.map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.symbol}
                          </option>
                        ))}
                      </select>
                      <Input
                        id="to-amount"
                        type="number"
                        placeholder="0.0"
                        value={swapQuote ? swapQuote.amountOut : ''}
                        readOnly
                        className="flex-1 bg-muted"
                      />
                    </div>
                  </div>
                  
                  {swapQuote && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Exchange Rate</span>
                          <span>1 {swapTokens.from} = {swapQuote.exchangeRate} {swapTokens.to}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price Impact</span>
                          <span className={swapQuote.priceImpact > 3 ? 'text-destructive' : ''}>
                            {formatPercentage(swapQuote.priceImpact)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trading Fee</span>
                          <span>{formatIOTA(swapQuote.tradingFee)} {swapTokens.from}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="slippage">Slippage Tolerance</Label>
                    <div className="flex gap-2">
                      {[0.1, 0.5, 1.0].map((value) => (
                        <Button
                          key={value}
                          variant={slippage === value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSlippage(value)}
                        >
                          {formatPercentage(value)}
                        </Button>
                      ))}
                      <Input
                        id="slippage"
                        type="number"
                        step="0.1"
                        value={slippage}
                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                        className="w-20 text-center"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSwap}
                    disabled={!swapAmounts.from || !swapQuote || defi.isLoading}
                    className="w-full"
                  >
                    {defi.isLoading ? 'Processing...' : 'Swap'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Pool Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pool Information</CardTitle>
            <CardDescription>
              Current pool statistics and metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {poolInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{selectedPair.tokenA} Reserve</p>
                    <p className="text-lg font-semibold">
                      {formatIOTA(poolInfo.reserveA)} {selectedPair.tokenA}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{selectedPair.tokenB} Reserve</p>
                    <p className="text-lg font-semibold">
                      {formatIOTA(poolInfo.reserveB)} {selectedPair.tokenB}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Liquidity</span>
                    <span className="font-medium">${formatCompactNumber(poolInfo.totalLiquidity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">24h Volume</span>
                    <span className="font-medium">${formatCompactNumber(poolInfo.volume24h)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">24h Fees</span>
                    <span className="font-medium">${formatCompactNumber(poolInfo.fees24h)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pool Shares</span>
                    <span className="font-medium">{formatCompactNumber(poolInfo.totalShares)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Pool Share</span>
                    <div className="text-right">
                      <span className="font-medium">{formatPercentage(poolInfo.userShare || 0)}</span>
                      <p className="text-xs text-muted-foreground">
                        ${formatCompactNumber((poolInfo.userShare || 0) * poolInfo.totalLiquidity / 100)}
                      </p>
                    </div>
                  </div>
                  
                  {poolInfo.userShare > 0 && (
                    <Progress value={poolInfo.userShare} className="h-2" />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                <p className="text-muted-foreground">Loading pool information...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}