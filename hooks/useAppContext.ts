import { useState, useEffect } from 'react';

export type AppContext = 'base-app' | 'farcaster' | 'website';

export interface AppContextData {
  context: AppContext;
  isBaseApp: boolean;
  isFarcaster: boolean;
  isWebsite: boolean;
  ticketMultiplier: number; // 2x for Base app, 1x otherwise
}

/**
 * Detects user's app context (Base app, Farcaster, or website)
 * Base app users get 2x ticket multiplier as incentive
 */
export function useAppContext(): AppContextData {
  const [context, setContext] = useState<AppContext>('website');

  useEffect(() => {
    // Detect Base app context
    // Base app injects window.coinbaseWallet or specific user agent
    const isBaseApp = Boolean(
      typeof window !== 'undefined' &&
      (
        // Coinbase Wallet/Base app detection
        (window as any).coinbaseWallet ||
        // User agent check for Coinbase Wallet
        navigator.userAgent.includes('CoinbaseWallet') ||
        // Check for Coinbase branded connection
        (window as any).ethereum?.isCoinbaseWallet
      )
    );

    // Detect Farcaster context
    const isFarcaster = Boolean(
      typeof window !== 'undefined' &&
      (window as any).farcaster
    );

    if (isBaseApp) {
      setContext('base-app');
    } else if (isFarcaster) {
      setContext('farcaster');
    } else {
      setContext('website');
    }
  }, []);

  return {
    context,
    isBaseApp: context === 'base-app',
    isFarcaster: context === 'farcaster',
    isWebsite: context === 'website',
    ticketMultiplier: context === 'base-app' ? 2 : 1
  };
}
