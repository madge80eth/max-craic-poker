'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/miniapp-sdk';

export default function MiniApp() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Initialize SDK
  useEffect(() => {
    sdk.ready().then(() => {
      setIsSDKLoaded(true);
    });
  }, []);

  // Get wallet address when SDK is ready
  useEffect(() => {
    if (isSDKLoaded) {
      const address = sdk.context?.user?.walletAddress;
      if (address) {
        setWalletAddress(address);
        checkEntryStatus(address);
      }
    }
  }, [isSDKLoaded]);

  // Timer countdown
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
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function checkEntryStatus(address: string) {
    try {
      const response = await fetch(`/api/status?wallet=${address}`);
      const data = await response.json();
      if (data.hasEntered) {
        setHasEntered(true);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  }

  async function handleConnect() {
    setIsLoading(true);
    setError(null);

    try {
      const address = sdk.context?.user?.walletAddress;
      if (!address) {
        throw new Error('No wallet found. Make sure you are logged into Farcaster.');
      }
      setWalletAddress(address);
      await checkEntryStatus(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEnterRaffle() {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
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

  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <img 
            src="/mcp-logo.png" 
            alt="Max Craic Poker" 
            className="w-32 h-32 mx-auto rounded-full"
          />
          <h1 className="text-4xl font-bold text-white">Max Craic Poker</h1>
          <p className="text-purple-200">Community-Backed Tournament Draw</p>
        </div>

        {/* Timer */}
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

        {/* Main Action Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {!walletAddress ? (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Connect to Enter</h2>
              <p className="text-purple-200">
                Connect your wallet to enter the community draw and win 5% of tournament profits
              </p>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                {isLoading ? 'Connecting...' : '🔗 Connect & Play'}
              </button>
            </div>
          ) : hasEntered ? (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-white">You're Entered!</h2>
              <p className="text-purple-200">
                You're in the draw for tonight's tournament. Winner announced when timer hits zero!
              </p>
              <div className="bg-white/5 rounded-lg p-4 mt-4">
                <p className="text-sm text-purple-300 font-mono break-all">{walletAddress}</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white">Enter the Draw</h2>
              <p className="text-purple-200">
                Enter free to win 5% of profits from tonight's tournament + 5% bonus for sharing
              </p>
              <button
                onClick={handleEnterRaffle}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                {isLoading ? 'Entering...' : '🎲 Enter Draw'}
              </button>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-purple-300 font-mono break-all">{walletAddress}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Info Pills */}
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
            Enter Free
          </span>
          <span className="bg-white/10 backdrop-blur-sm text-purple-100 px-4 py-2 rounded-full text-sm border border-white/20">
            Win 5% Profits
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