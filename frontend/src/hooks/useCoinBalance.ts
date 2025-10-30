/**
 * Hook for fetching IOTA coin balance
 */

import { useQuery } from '@tanstack/react-query';
import { useIotaClient } from '@iota/dapp-kit';
import { CoinStruct } from '@iota/iota-sdk/client';

export function useCoinBalance(address?: string | null) {
  const client = useIotaClient();

  return useQuery({
    queryKey: ['coinBalance', address],
    queryFn: async (): Promise<bigint> => {
      if (!address || !client) {
        throw new Error('Address or client not available');
      }

      try {
        const balance = await client.getBalance({ owner: address });
        return BigInt(balance.totalBalance || '0');
      } catch (error) {
        console.error('Error fetching balance:', error);
        throw error;
      }
    },
    enabled: !!address && !!client,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}