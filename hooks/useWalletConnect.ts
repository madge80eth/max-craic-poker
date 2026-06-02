'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';

/**
 * Handles wallet connection strategy:
 *
 * - If window.ethereum is injected (Base app, MetaMask, any in-app browser):
 *   auto-connect silently using the injected() connector on mount.
 *   WalletConnect is suppressed — its QR modal is blocked as a popup in in-app browsers.
 *
 * - If no injected provider: show manual picker with WalletConnect + Coinbase Wallet.
 *
 * Returns:
 *   hasInjected    — true when window.ethereum is available (in-app browser / extension)
 *   isConnecting   — true while auto-connect or manual connect is in progress
 *   manualConnectors — filtered connector list safe to show in a manual picker
 *   connectWith    — call with a connector to manually connect
 */
export function useWalletConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [hasInjected, setHasInjected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const injectedAvailable = !!(window as unknown as Record<string, unknown>).ethereum;
    setHasInjected(injectedAvailable);

    if (!injectedAvailable || isConnected) return;

    const inj = connectors.find((c) => c.id === 'injected');
    if (!inj) return;

    setIsConnecting(true);
    connect({ connector: inj }, { onSettled: () => setIsConnecting(false) });
  // Run once when connectors are available — not on every isConnected change,
  // otherwise a failed auto-connect retries on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors]);

  // Manual picker: exclude farcaster (mini-app only), injected (auto-handled above),
  // and WalletConnect when inside an in-app browser (QR modal blocked as popup).
  const manualConnectors = connectors.filter(
    (c) =>
      c.id !== 'farcasterMiniApp' &&
      c.id !== 'injected' &&
      (!hasInjected || c.id !== 'walletConnect'),
  );

  function connectWith(connectorId: string) {
    const c = connectors.find((x) => x.id === connectorId);
    if (!c) return;
    setIsConnecting(true);
    connect({ connector: c }, { onSettled: () => setIsConnecting(false) });
  }

  return { hasInjected, isConnecting, manualConnectors, connectWith };
}
