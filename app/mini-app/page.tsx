'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import sdk from '@farcaster/miniapp-sdk';

export default function MiniApp() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [winner, setWinner] = useState<any>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize SDK
  useEffect(() => {
    async function init() {
      try {
        await sdk.context;
        sdk.actions.ready();
      } catch (err) {
        console.error('SDK init failed:', err);
      }
    }
    init();
  }, []);

  // Check entry status and winner when wallet connects
  useEffect(() => {
    if (address) {
      checkStatus(address);
    }
  }, [address]);

  // Timer countdown and auto-draw
  useEffect(() => {
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + 12);

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetTime.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        
        // Auto-trigger draw when timer hits zero
        if (!hasDrawn) {
          triggerDraw();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasDrawn]);

  // Poll for winner updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (address) {
        checkStatus(address);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [address]);

  async function checkStatus(walletAddress: string) {
    try {
      const response = await fetch(`/api/status?wallet=${walletAddress}`);
      const data = await response.json();
      
      if (data.hasEntered) {
        setHasEntered(true);
      }
      
      if (data.hasWinner && data.winner) {
        setWinner(data.winner);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  }

  async function triggerDraw() {
    try {
      const response = await fetch('/api/draw', { method: 'POST' });
      const data = await response.json();
      
      if (data.success && data.winner) {
        setWinner(data.winner);
        setHasDrawn(true);
      }
    } catch (err) {
      console.error('Error triggering draw:', err);
    }
  }

  async function handleConnectWallet() {
    try {
      const coinbaseConnector = connectors.find(c => c.id === 'coinbaseWalletSDK');
      if (coinbaseConnector) {
        connect({ connector: coinbaseConnector });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  }

  async function handleEnterRaffle() {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'farcaster',
          hasRecasted: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enter raffle');
      }

      setHasEntered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter raffle');
    } finally {
      setIsLoading(false);
    }
  }

  // Show winner announcement if draw has happened
  if (winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <img 
              src="/mcp-logo.png" 
              alt="Max Craic Poker" 
              className="w-32 h-32 mx-auto rounded-full"
            />
            <h1 className="text-4xl font-bold text-white">WINNER DRAWN!</h1>
            <p className="text-red-400 text-xl font-semibold">MAX CRAIC POKER</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center space-y-4">
            <div className="text-6xl">🏆</div>
            <div className="text-3xl font-bold text-white font-mono break-all">
              {winner.walletAddress.slice(0, 8)}...{winner.walletAddress.slice(-6)}
            </div>
            <p className="text-purple-200 text-lg">
              Assigned to: <span className="font-semibold">{winner.tournament || 'Late Night Grind'}</span>
            </p>
            <p className="text-purple-300 text-sm">
              If I cash in this tournament, the winner gets 5% of the profit + 5% bonus for sharing the post!
            </p>
          </div>

          <div className="bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-md rounded-2xl p-8 border border-red-500/50">
            <h2 className="text-2xl font-bold text-white text-center mb-4">LIVE ACTION</h2>
            <p className="text-white text-center mb-6">
              Join the stream to see how the community game unfolds! Chat participants get $MCP airdrops.
            </p>
            <a 
              href="https://twitch.tv/your-channel"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-red-800 hover:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg text-center"
            >
              🔴 Watch Live Stream
            </a>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
              Enter Free
            </span>
            <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
              Win Profits
            </span>
            <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
              Watch Live
            </span>
            <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
              Share for Bonus
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <img 
            src="/mcp-logo.png" 
            alt="Max Craic Poker" 
            className="w-32 h-32 mx-auto rounded-full"
          />
          <h1 className="text-4xl font-bold text-white">Max Craic Poker</h1>
          <p className="text-purple-200">Community-Backed Tournament Draw</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white text-center mb-4">Draw Countdown</h2>
          <div className="flex justify-center gap-4 text-center">
            <div>
              <div className="text-4xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="text-sm text-purple-200">Hours</div>
            </div>
            <div className="text-4xl font-bold text-white">:</div>
            <div>
              <div className="text-4xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="text-sm text-purple-200">Minutes</div>
            </div>
            <div className="text-4xl font-bold text-white">:</div>
            <div>
              <div className="text-4xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div className="text-sm text-purple-200">Seconds</div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {hasEntered ? (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-white">You're Entered!</h2>
              <p className="text-purple-200">
                The winner will get a 5-10% share of the community game's profits as a thank you for supporting MCP.
              </p>
              <p className="text-purple-300 font-semibold">
                Follow along on the live stream!
              </p>
              {address && (
                <div className="bg-white/5 rounded-lg p-4 mt-4">
                  <p className="text-sm text-purple-300 font-mono break-all">{address}</p>
                </div>
              )}
            </div>
          ) : isConnected && address ? (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Enter the Draw</h2>
              <p className="text-purple-200">
                Enter free to win 5-10% of profits from tonight's tournament
              </p>
              <button
                onClick={handleEnterRaffle}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                {isLoading ? 'Entering...' : '🎲 Enter Draw'}
              </button>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-purple-300 font-mono break-all">{address}</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Welcome to Max Craic Poker</h2>
              <p className="text-purple-200 text-lg">
                Your cozy onchain poker home!
              </p>
              <button
                onClick={handleConnectWallet}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
              >
                <span>🔗</span>
                <span>Connect & Play</span>
              </button>
              <p className="text-sm text-purple-300">
                ...or don't have a wallet yet?
              </p>
              <p className="text-xs text-purple-400">
                We recommend using Coinbase Smart Wallet for lower transaction costs, convenience and stronger security!
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
            Enter Free
          </span>
          <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
            Win Profits
          </span>
          <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
            Watch Live
          </span>
          <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
            Share for Bonus
          </span>
        </div>
      </div>
    </div>
  );
}