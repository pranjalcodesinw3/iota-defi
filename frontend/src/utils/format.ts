/**
 * Utility functions for formatting addresses, amounts, and other data
 */

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Format IOTA amount from micro-IOTA to human-readable format
 */
export function formatIOTA(microIota: bigint | string | number, decimals = 6): string {
  try {
    const amount = typeof microIota === 'bigint' 
      ? microIota 
      : BigInt(microIota.toString());
    
    const divisor = BigInt(10 ** 6); // 1 IOTA = 1,000,000 micro-IOTA
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(6, '0');
    const trimmed = fractionalStr.replace(/0+$/, '');
    
    if (trimmed === '') {
      return wholePart.toString();
    }
    
    return `${wholePart}.${trimmed.slice(0, decimals)}`;
  } catch (error) {
    console.error('Error formatting IOTA amount:', error);
    return '0';
  }
}

/**
 * Parse human-readable IOTA amount to micro-IOTA
 */
export function parseIOTA(amount: string): bigint {
  try {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return BigInt(0);
    
    return BigInt(Math.floor(numAmount * 1_000_000));
  } catch (error) {
    console.error('Error parsing IOTA amount:', error);
    return BigInt(0);
  }
}

/**
 * Format percentage with proper decimal places
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1_000_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  return `${(num / 1_000_000_000).toFixed(1)}B`;
}

/**
 * Format timestamp to human-readable date
 */
export function formatDate(timestamp: number | string | Date, includeTime = false): string {
  try {
    const date = new Date(timestamp);
    
    if (includeTime) {
      return date.toLocaleString();
    }
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Validate IOTA address format
 */
export function isValidIOTAAddress(address: string): boolean {
  // Basic validation - IOTA addresses typically start with 'iota' and are 64+ characters
  const iotaAddressRegex = /^(iota|smr)[a-zA-Z0-9]{60,}$/;
  return iotaAddressRegex.test(address);
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, length = 8): string {
  if (!hash) return '';
  return shortenAddress(hash, length, length);
}