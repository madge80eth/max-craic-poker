// hooks/useMiniKit.ts
import { useState, useEffect, useCallback } from 'react';
import { MiniKitUser, connectMiniKitWallet, shareMiniKit, isMiniKitAvailable } from '@/lib/minikit';

interface UseMiniKitReturn {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string;
  user: MiniKitUser | null;
  connect: () => Promise<void>;
  share: (text: string, embedUrl?: string) => Promise<boolean>;
  error: string | null;
}

export const useMiniKit = (): UseMiniKitReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [user, setUser] = useState<MiniKitUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isMiniKitAvailable();

  useEffect(() => {
    // Check if already connected on mount
    if (isAvailable && window.MiniKit?.user.wallet.isConnected()) {
      connect();
    }
  }, [isAvailable]);

  const connect = useCallback(async () => {
    if (!isAvailable) {
      setError('MiniKit not available. Please open in Coinbase Wallet.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const { address, user: userProfile } = await connectMiniKitWallet();
      setWalletAddress(address);
      setUser(userProfile);
      setIsConnected(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [isAvailable]);

  const share = useCallback(async (text: string, embedUrl?: string): Promise<boolean> => {
    if (!isAvailable) {
      // Fallback to browser sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Max Craic Poker',
            text,
            url: embedUrl
          });
          return true;
        } catch (err) {
          console.error('Native share failed:', err);
          return false;
        }
      } else if (navigator.clipboard) {
        // Copy to clipboard as fallback
        try {
          const shareText = embedUrl ? `${text} ${embedUrl}` : text;
          await navigator.clipboard.writeText(shareText);
          return true;
        } catch (err) {
          console.error('Clipboard copy failed:', err);
          return false;
        }
      }
      return false;
    }

    return await shareMiniKit(text, embedUrl);
  }, [isAvailable]);

  return {
    isAvailable,
    isConnected,
    isConnecting,
    walletAddress,
    user,
    connect,
    share,
    error
  };
};