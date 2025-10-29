// app/mini-app/components/WalletDisplay.tsx
'use client';

import { useBasename, formatAddressOrBasename } from '../hooks/useBasename';

interface WalletDisplayProps {
  address: string;
  className?: string;
  showFullOnHover?: boolean;
}

/**
 * Component to display wallet address with Basename resolution
 * Shows .base.eth name if available, otherwise shows truncated address
 */
export function WalletDisplay({ address, className = '', showFullOnHover = false }: WalletDisplayProps) {
  const { basename, isLoading } = useBasename(address);

  const displayText = formatAddressOrBasename(address, basename);

  if (isLoading) {
    return (
      <span className={className}>
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
      </span>
    );
  }

  return (
    <span
      className={className}
      title={showFullOnHover ? address : undefined}
    >
      {displayText}
    </span>
  );
}
