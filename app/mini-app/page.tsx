'use client';

import { useState, useEffect } from 'react';
import { Play, Users, Clock, Trophy, Wallet } from 'lucide-react';
import { base } from 'wagmi/chains';  // ADD THIS LINE

// Farcaster SDK
import { sdk as farcasterSdk } from '@farcaster/miniapp-sdk';

// Base/OnchainKit imports  
import { MiniKitProvider, useMiniKit } from '@coinbase/onchainkit/minikit';
import { Wallet as OnchainWallet } from '@coinbase/onchainkit/wallet';

interface Tournament {
  name: string;
  buyIn: string;
}

interface Entry {
  walletAddress: string;
  platform: string;
  tournament: Tournament;
  tournamentBuyIn: string;
  timestamp: string;
  hasRecasted: boolean;
}

interface Winner {
  walletAddress: string;
  entry: Entry;
  drawnAt: string;
  totalEntries: number;
}

// Platform detection utility
function detectPlatform(): 'farcaster' | 'base' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  
  // Check if we're in Farcaster context
  if (window.parent !== window && farcasterSdk) {
    return 'farcaster';
  }
  
  // Check for Base/Coinbase Wallet context
  if (window.ethereum?.isCoinbaseWallet) {
    return 'base';
  }
  
  return 'unknown';
}

// Unified wallet hook
function useUnifiedWallet() {
  const [platform, setPlatform] = useState<'farcaster' | 'base' | 'unknown'>('unknown');
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Base/MiniKit context
  const minikit = useMiniKit();

  useEffect(() => {
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);
    
    // Auto-connect for Farcaster
    if (detectedPlatform === 'farcaster') {
      connectFarcaster();
    }
  }, []);

  const connectFarcaster = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Get Farcaster user context
      const context = await farcasterSdk.context;
      if (context?.user?.fid) {
        // Use FID as address identifier for Farcaster
        setAddress(`farcaster:${context.user.fid}`);
      } else {
        throw new Error('No Farcaster user context available');
      }
    } catch (err) {
      setError('Failed to connect to Farcaster');
      console.error('Farcaster connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectBase = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        if (accounts[0]) {
          setAddress(accounts[0]);
        }
      } else {
        throw new Error('No Ethereum provider found');
      }
    } catch (err) {
      setError('Failed to connect wallet');
      console.error('Base wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async () => {
    if (platform === 'farcaster') {
      await connectFarcaster();
    } else {
      await connectBase();
    }
  };

  return {
    platform,
    address,
    isConnecting,
    error,
    connect,
    isConnected: !!address
  };
}

// Main Mini App Component
function MiniApp() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [drawTime, setDrawTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const { platform, address, isConnecting, error, connect, isConnected } = useUnifiedWallet();

  // Initialize Farcaster SDK
  useEffect(() => {
    if (platform === 'farcaster') {
      farcasterSdk.actions.ready();
    }
  }, [platform]);

  // Load tournaments and status
  useEffect(() => {
    loadTournaments();
    checkStatus();
    
    const interval = setInterval(() => {
      checkStatus();
      updateTimeRemaining();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await fetch('/tournaments.json');
      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  };

  const checkStatus = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/status?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      
      if (data.entry) {
        setCurrentEntry(data.entry);
      }
      
      if (data.winner) {
        setCurrentWinner(data.winner);
      }
      
      if (data.drawTime) {
        setDrawTime(new Date(data.drawTime));
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const updateTimeRemaining = () => {
    if (!drawTime) return;
    
    const now = new Date();
    const diff = drawTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining('Draw complete!');
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  const enterRaffle = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: platform,
          hasRecasted: false // Could implement sharing logic here
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentEntry(data.entry);
        // Optional: trigger sharing for bonus
        if (platform === 'farcaster') {
          // Could use farcasterSdk.actions.openComposer here
        }
      }
    } catch (error) {
      console.error('Failed to enter raffle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWalletSection = () => {
    if (!isConnected) {
      return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-purple-600" />
          <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
          <p className="text-gray-600 mb-4">
            Platform detected: {platform === 'farcaster' ? 'Farcaster' : platform === 'base' ? 'Base' : 'Web'}
          </p>
          {error && (
            <p className="text-red-600 mb-4 text-sm">{error}</p>
          )}
          <button
            onClick={connect}
            disabled={isConnecting}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Connected Wallet</h3>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {platform === 'farcaster' ? 'Farcaster' : 'Base'}
          </span>
        </div>
        <p className="text-gray-600 font-mono text-sm break-all">
          {address}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MAX CRAIC</h1>
          <p className="text-purple-600 font-semibold">POKER</p>
          <p className="text-gray-600 mt-2">Community-Rewarded Tournaments</p>
        </div>

        {/* Wallet Connection */}
        {renderWalletSection()}

        {/* Tournament Info */}
        {tournaments.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Play className="w-5 h-5 mr-2 text-purple-600" />
              Today's Tournaments ({tournaments.length})
            </h3>
            <div className="space-y-3">
              {tournaments.map((tournament, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium">{tournament.name}</span>
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {tournament.buyIn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Draw Timer */}
        {drawTime && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Next Draw</h3>
            <p className="text-2xl font-mono font-bold text-orange-600">{timeRemaining}</p>
          </div>
        )}

        {/* Entry Status */}
        {currentEntry ? (
          <div className="bg-green-50 p-6 rounded-xl border border-green-200 mt-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">You're Entered!</h3>
            <p className="text-green-700 mb-2">Tournament: {currentEntry.tournament.name}</p>
            <p className="text-green-700">Buy-in: {currentEntry.tournamentBuyIn}</p>
            <p className="text-sm text-green-600 mt-3">Good luck in the draw!</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-purple-600" />
            <h3 className="text-lg font-semibold mb-2">Enter Today's Draw</h3>
            <p className="text-gray-600 mb-4">
              Winner gets 5% of tournament profits + 5% bonus for sharing!
            </p>
            <button
              onClick={enterRaffle}
              disabled={!isConnected || isLoading}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entering...' : 'Enter Raffle'}
            </button>
          </div>
        )}

        {/* Winner Display */}
        {currentWinner && (
          <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 mt-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Latest Winner!</h3>
            <p className="text-yellow-700 font-mono text-sm break-all mb-2">
              {currentWinner.walletAddress}
            </p>
            <p className="text-yellow-700">
              Won: {currentWinner.entry.tournament.name} ({currentWinner.entry.tournamentBuyIn})
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Total entries: {currentWinner.totalEntries}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper with Base MiniKit Provider
export default function MiniAppPage() {
  return (
    <MiniKitProvider
      projectId={process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID || 'test'}
      chain={base}
      notificationProxyUrl="/api/notification"
    >
      <MiniApp />
    </MiniKitProvider>
  );
}