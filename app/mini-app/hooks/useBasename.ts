// app/mini-app/hooks/useBasename.ts
'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Basename text records follow ENS standard
const client = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Custom hook to resolve Base names (Basenames) for Ethereum addresses
 * Returns the .base.eth name if available, otherwise returns formatted address
 */
export function useBasename(address: string | undefined) {
  const [basename, setBasename] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setBasename(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function resolveBasename() {
      try {
        // Call the L2 resolver to get the Basename
        const ensName = await client.getEnsName({
          address: address as `0x${string}`,
        });

        if (!cancelled) {
          setBasename(ensName);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error resolving Basename:', error);
        if (!cancelled) {
          setBasename(null);
          setIsLoading(false);
        }
      }
    }

    resolveBasename();

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { basename, isLoading };
}

/**
 * Format wallet address or return basename
 */
export function formatAddressOrBasename(
  address: string | undefined,
  basename: string | null | undefined
): string {
  if (!address) return '';
  if (basename) return basename;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
