/**
 * Lending Interface Component - Provides UI for lending and borrowing
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
import { AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useDeFiProtocol } from '../../hooks/useDeFiProtocol';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatIOTA, formatPercentage } from '../../utils/format';
import { useToast } from '../ui/use-toast';

interface LendingInterfaceProps {
  selectedAsset?: string;
}

const SUPPORTED_ASSETS = [
  { symbol: 'IOTA', name: 'IOTA', apy: 5.2, icon: '🔷' },
  { symbol: 'USDC', name: 'USD Coin', apy: 3.8, icon: '💵' },
  { symbol: 'BTC', name: 'Bitcoin', apy: 4.1, icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', apy: 4.7, icon: '♦️' }
];

export function LendingInterface({ selectedAsset = 'IOTA' }: LendingInterfaceProps) {
  const [activeTab, setActiveTab] = useState('supply');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(selectedAsset);
  const [collateralAsset, setCollateralAsset] = useState('IOTA');
  
  const currentAccount = useCurrentAccount();
  const defi = useDeFiProtocol();
  const { toast } = useToast();
  
  const [positions, setPositions] = useState<any[]>([]);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  
  // Fetch user positions and pool info
  useEffect(() => {
    if (currentAccount?.address) {
      defi.lending.getUserPositions(currentAccount.address)
        .then(setPositions)
        .catch(console.error);
      
      defi.lending.getPoolInfo(selectedToken)
        .then(setPoolInfo)
        .catch(console.error);
    }
  }, [currentAccount?.address, selectedToken, defi]);
  
  const handleSupply = async () => {
    if (!amount || !currentAccount) return;
    
    try {
      await defi.lending.supply(selectedToken, amount);
      setAmount('');
      toast({
        title: "Supply Successful",
        description: `Successfully supplied ${amount} ${selectedToken}`
      });
    } catch (error) {
      console.error('Supply failed:', error);
    }
  };
  
  const handleBorrow = async () => {
    if (!amount || !currentAccount) return;
    
    try {
      await defi.lending.borrow(selectedToken, amount, collateralAsset);
      setAmount('');
      toast({
        title: "Borrow Successful",
        description: `Successfully borrowed ${amount} ${selectedToken}`
      });
    } catch (error) {
      console.error('Borrow failed:', error);
    }
  };
  
  const handleWithdraw = async (positionId: string, withdrawAmount: string) => {
    try {
      await defi.lending.withdraw(positionId, withdrawAmount);
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${withdrawAmount} ${selectedToken}`
      });
    } catch (error) {
      console.error('Withdrawal failed:', error);
    }
  };
  
  const handleRepay = async (positionId: string, repayAmount: string) => {
    try {
      await defi.lending.repay(positionId, repayAmount);
      toast({
        title: "Repayment Successful",
        description: `Successfully repaid ${repayAmount} ${selectedToken}`
      });
    } catch (error) {
      console.error('Repayment failed:', error);
    }
  };
  
  const selectedAssetInfo = SUPPORTED_ASSETS.find(a => a.symbol === selectedToken) || SUPPORTED_ASSETS[0];
  
  if (!currentAccount) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lending Protocol
          </CardTitle>
          <CardDescription>
            Please connect your wallet to access lending features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Wallet connection required</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Asset Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Lending Markets
          </CardTitle>
          <CardDescription>
            Supply or borrow assets to earn interest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUPPORTED_ASSETS.map((asset) => (
              <div
                key={asset.symbol}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedToken === asset.symbol
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedToken(asset.symbol)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{asset.icon}</span>
                  <div>
                    <p className="font-medium">{asset.symbol}</p>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">APY</span>
                  <Badge variant="secondary">
                    {formatPercentage(asset.apy)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Lending Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supply/Borrow Form */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedAssetInfo.icon} {selectedAssetInfo.name}</CardTitle>
            <CardDescription>
              Current APY: {formatPercentage(selectedAssetInfo.apy)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="supply" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Supply
                </TabsTrigger>
                <TabsTrigger value="borrow" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Borrow
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="supply" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supply-amount">Amount to Supply</Label>
                  <Input
                    id="supply-amount"
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">
                    You will earn {formatPercentage(selectedAssetInfo.apy)} APY
                  </div>
                </div>
                <Button 
                  onClick={handleSupply}
                  disabled={!amount || defi.isLoading}
                  className="w-full"
                >
                  {defi.isLoading ? 'Processing...' : `Supply ${selectedToken}`}
                </Button>
              </TabsContent>
              
              <TabsContent value="borrow" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="borrow-amount">Amount to Borrow</Label>
                  <Input
                    id="borrow-amount"
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collateral">Collateral Asset</Label>
                  <select
                    id="collateral"
                    value={collateralAsset}
                    onChange={(e) => setCollateralAsset(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    {SUPPORTED_ASSETS.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} - {asset.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Interest rate: {formatPercentage(selectedAssetInfo.apy + 1.5)}
                </div>
                <Button 
                  onClick={handleBorrow}
                  disabled={!amount || defi.isLoading}
                  className="w-full"
                >
                  {defi.isLoading ? 'Processing...' : `Borrow ${selectedToken}`}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* User Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Your Positions</CardTitle>
            <CardDescription>
              Manage your lending and borrowing positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No positions found</p>
                <p className="text-sm text-muted-foreground">Supply or borrow to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position, index) => (
                  <div key={position.id || index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={position.type === 'supply' ? 'default' : 'destructive'}>
                          {position.type === 'supply' ? 'Supplied' : 'Borrowed'}
                        </Badge>
                        <span className="font-medium">{position.asset}</span>
                      </div>
                      <span className="font-semibold">
                        {formatIOTA(position.amount)} {position.asset}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      Interest Rate: {formatPercentage(position.interestRate)}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => position.type === 'supply' 
                          ? handleWithdraw(position.id, formatIOTA(position.amount))
                          : handleRepay(position.id, formatIOTA(position.amount))
                        }
                        disabled={defi.isLoading}
                      >
                        {position.type === 'supply' ? 'Withdraw' : 'Repay'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Pool Statistics */}
      {poolInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Pool Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Supplied</p>
                <p className="text-lg font-semibold">
                  {formatIOTA(poolInfo.totalSupplied)} {selectedToken}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
                <p className="text-lg font-semibold">
                  {formatIOTA(poolInfo.totalBorrowed)} {selectedToken}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilization Rate</p>
                <div className="flex items-center gap-2">
                  <Progress value={poolInfo.utilizationRate} className="flex-1" />
                  <span className="text-sm font-medium">
                    {formatPercentage(poolInfo.utilizationRate)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-lg font-semibold">
                  {formatIOTA(poolInfo.available)} {selectedToken}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}