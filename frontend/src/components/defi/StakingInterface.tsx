/**
 * Staking Interface Component - Provides UI for token staking and rewards
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
import { Clock, Gift, Lock, Unlock, TrendingUp } from 'lucide-react';
import { useDeFiProtocol } from '../../hooks/useDeFiProtocol';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatIOTA, formatPercentage, formatDuration } from '../../utils/format';
import { useToast } from '../ui/use-toast';

const STAKING_POOLS = [
  {
    id: 'flexible',
    name: 'Flexible Staking',
    description: 'Stake and unstake anytime',
    apy: 3.5,
    lockPeriod: 0,
    minAmount: 1000,
    icon: '🔄'
  },
  {
    id: '30d',
    name: '30 Day Lock',
    description: '30-day fixed term',
    apy: 6.2,
    lockPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
    minAmount: 5000,
    icon: '📅'
  },
  {
    id: '90d',
    name: '90 Day Lock',
    description: '90-day fixed term',
    apy: 8.5,
    lockPeriod: 90 * 24 * 60 * 60, // 90 days in seconds
    minAmount: 10000,
    icon: '🔒'
  },
  {
    id: '180d',
    name: '180 Day Lock',
    description: '180-day fixed term',
    apy: 12.0,
    lockPeriod: 180 * 24 * 60 * 60, // 180 days in seconds
    minAmount: 25000,
    icon: '💎'
  }
];

export function StakingInterface() {
  const [selectedPool, setSelectedPool] = useState('flexible');
  const [stakeAmount, setStakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState('stake');
  
  const currentAccount = useCurrentAccount();
  const defi = useDeFiProtocol();
  const { toast } = useToast();
  
  const [stakingPositions, setStakingPositions] = useState<any[]>([]);
  const [stakingInfo, setStakingInfo] = useState<any>(null);
  const [totalRewards, setTotalRewards] = useState(BigInt(0));
  
  // Fetch staking data
  useEffect(() => {
    if (currentAccount?.address) {
      defi.staking.getUserStakingPositions(currentAccount.address)
        .then((positions) => {
          setStakingPositions(positions);
          // Calculate total rewards
          const total = positions.reduce((sum: bigint, pos: any) => sum + BigInt(pos.rewards || 0), BigInt(0));
          setTotalRewards(total);
        })
        .catch(console.error);
      
      defi.staking.getStakingInfo()
        .then(setStakingInfo)
        .catch(console.error);
    }
  }, [currentAccount?.address, defi]);
  
  const selectedPoolInfo = STAKING_POOLS.find(p => p.id === selectedPool) || STAKING_POOLS[0];
  
  const handleStake = async () => {
    if (!stakeAmount || !currentAccount) return;
    
    try {
      await defi.staking.stake(stakeAmount, selectedPoolInfo.lockPeriod);
      setStakeAmount('');
      toast({
        title: "Staking Successful",
        description: `Successfully staked ${stakeAmount} IOTA for ${selectedPoolInfo.name}`
      });
    } catch (error) {
      console.error('Staking failed:', error);
    }
  };
  
  const handleUnstake = async (positionId: string) => {
    try {
      await defi.staking.unstake(positionId);
      toast({
        title: "Unstaking Successful",
        description: "Successfully unstaked tokens"
      });
    } catch (error) {
      console.error('Unstaking failed:', error);
    }
  };
  
  const handleClaimRewards = async (positionId: string) => {
    try {
      await defi.staking.claimRewards(positionId);
      toast({
        title: "Rewards Claimed",
        description: "Successfully claimed staking rewards"
      });
    } catch (error) {
      console.error('Claiming rewards failed:', error);
    }
  };
  
  const isPositionUnlocked = (position: any): boolean => {
    const lockEndTime = position.timestamp + (selectedPoolInfo.lockPeriod * 1000);
    return Date.now() > lockEndTime;
  };
  
  const getTimeRemaining = (position: any): string => {
    const lockEndTime = position.timestamp + (selectedPoolInfo.lockPeriod * 1000);
    const remaining = Math.max(0, lockEndTime - Date.now());
    return formatDuration(remaining / 1000);
  };
  
  if (!currentAccount) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Staking Protocol
          </CardTitle>
          <CardDescription>
            Please connect your wallet to access staking features
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Staking Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Total Staked</span>
            </div>
            <p className="text-2xl font-bold">
              {stakingInfo ? formatIOTA(stakingInfo.totalStaked) : '0'} IOTA
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Pending Rewards</span>
            </div>
            <p className="text-2xl font-bold">
              {formatIOTA(totalRewards)} IOTA
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Your Positions</span>
            </div>
            <p className="text-2xl font-bold">{stakingPositions.length}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staking Pools */}
        <Card>
          <CardHeader>
            <CardTitle>Staking Pools</CardTitle>
            <CardDescription>
              Choose a pool that fits your strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {STAKING_POOLS.map((pool) => (
                <div
                  key={pool.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPool === pool.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPool(pool.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{pool.icon}</span>
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        <p className="text-xs text-muted-foreground">{pool.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {formatPercentage(pool.apy)} APY
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Min: {formatIOTA(BigInt(pool.minAmount))} IOTA</span>
                    <span>
                      {pool.lockPeriod === 0 ? 'Flexible' : `${pool.lockPeriod / (24 * 60 * 60)} days`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Staking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedPoolInfo.icon} {selectedPoolInfo.name}
            </CardTitle>
            <CardDescription>
              APY: {formatPercentage(selectedPoolInfo.apy)} | 
              Lock Period: {selectedPoolInfo.lockPeriod === 0 ? 'Flexible' : `${selectedPoolInfo.lockPeriod / (24 * 60 * 60)} days`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stake">Stake</TabsTrigger>
                <TabsTrigger value="manage">Manage</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stake" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stake-amount">Amount to Stake</Label>
                  <Input
                    id="stake-amount"
                    type="number"
                    placeholder={`Min: ${formatIOTA(BigInt(selectedPoolInfo.minAmount))}`}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Minimum stake: {formatIOTA(BigInt(selectedPoolInfo.minAmount))} IOTA</div>
                    <div>Expected rewards: {formatPercentage(selectedPoolInfo.apy)} APY</div>
                    {selectedPoolInfo.lockPeriod > 0 && (
                      <div className="text-amber-600">
                        ⚠️ Tokens will be locked for {selectedPoolInfo.lockPeriod / (24 * 60 * 60)} days
                      </div>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleStake}
                  disabled={!stakeAmount || defi.isLoading || parseFloat(stakeAmount) < selectedPoolInfo.minAmount / 1_000_000}
                  className="w-full"
                >
                  {defi.isLoading ? 'Processing...' : `Stake ${stakeAmount || '0'} IOTA`}
                </Button>
              </TabsContent>
              
              <TabsContent value="manage" className="space-y-4">
                {stakingPositions.length === 0 ? (
                  <div className="text-center py-8">
                    <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No staking positions</p>
                    <p className="text-sm text-muted-foreground">Stake tokens to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stakingPositions.map((position, index) => {
                      const isUnlocked = isPositionUnlocked(position);
                      return (
                        <div key={position.id || index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={isUnlocked ? 'default' : 'secondary'}>
                                {isUnlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                {isUnlocked ? 'Unlocked' : 'Locked'}
                              </Badge>
                              <span className="font-medium">
                                {formatIOTA(position.amount)} IOTA
                              </span>
                            </div>
                            <Badge variant="outline">
                              {formatIOTA(position.rewards)} Rewards
                            </Badge>
                          </div>
                          
                          {!isUnlocked && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Time remaining</span>
                                <span className="font-medium">{getTimeRemaining(position)}</span>
                              </div>
                              <Progress 
                                value={(Date.now() - position.timestamp) / (selectedPoolInfo.lockPeriod * 1000) * 100}
                                className="h-2"
                              />
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleClaimRewards(position.id)}
                              disabled={defi.isLoading || position.rewards === '0'}
                            >
                              Claim Rewards
                            </Button>
                            
                            {isUnlocked && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUnstake(position.id)}
                                disabled={defi.isLoading}
                              >
                                Unstake
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Staking Statistics */}
      {stakingInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Pool Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Value Locked</p>
                <p className="text-lg font-semibold">
                  {formatIOTA(stakingInfo.totalValueLocked)} IOTA
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stakers</p>
                <p className="text-lg font-semibold">
                  {stakingInfo.totalStakers || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rewards Distributed</p>
                <p className="text-lg font-semibold">
                  {formatIOTA(stakingInfo.totalRewardsDistributed)} IOTA
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pool Health</p>
                <div className="flex items-center gap-2">
                  <Progress value={stakingInfo.poolHealth || 100} className="flex-1" />
                  <span className="text-sm font-medium">
                    {formatPercentage(stakingInfo.poolHealth || 100)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}