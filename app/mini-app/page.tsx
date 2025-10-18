'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Trophy, Clock, ExternalLink } from 'lucide-react';
import { sdk } from '@farcaster/frame-sdk';

interface Tournament {
  name: string;
  buyIn: string;
}

interface Winner {
  place: number;
  walletAddress: string;
  tournament: string;
  tournamentBuyIn: string;
  profitShare: number;
}

export default function MiniApp() {
  const { address, isConnected } = useAccount();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [userWinnerInfo, setUserWinnerInfo] = useState<Winner | null>(null);

  // Call sdk.actions.ready() to dismiss Farcaster splash screen
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('SDK ready error:', error);
      }
    };
    initSDK();
  }, []);

  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then(data => {
        setTournaments(Array.isArray(data) ? data : data.tournaments || []);
      });
  }, []);

  useEffect(() => {
    if (!address) return;

    const checkStatus = async () => {
      const res = await fetch(`/api/status?wallet=${address}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.hasEntered) {
          setHasEntered(true);
        }
        setTimeRemaining(data.timeRemaining);
        setWinners(data.winners);
        setUserWinnerInfo(data.winnerInfo);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [address]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleEnter = async () => {
    if (!address || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'farcaster'
        })
      });

      const data = await res.json();
      if (data.success) {
        setHasEntered(true);
      }
    } catch (error) {
      console.error('Entry error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const getPlaceEmoji = (place: number) => {
    if (place === 1) return '🥇';
    if (place === 2) return '🥈';
    if (place === 3) return '🥉';
    return '🏆';
  };

  const getPlaceGradient = (place: number) => {
    if (place === 1) return 'from-yellow-500 to-orange-500';
    if (place === 2) return 'from-gray-400 to-gray-500';
    if (place === 3) return 'from-amber-600 to-amber-700';
    return 'from-blue-600 to-purple-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-white mb-2">Max Craic Poker</h1>
          <p className="text-blue-200">Community-Backed Tournaments</p>
        </div>

        {/* Timer */}
        {timeRemaining > 0 && !winners && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-300" />
              <p className="text-white/80 text-sm">Draw in</p>
            </div>
            <p className="text-3xl font-bold text-white">{formatTime(timeRemaining)}</p>
          </div>
        )}

        {/* Winners Display */}
        {winners && winners.length > 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🎉 Winners Drawn! 🎉</h2>
              <p className="text-blue-200">Congratulations to our community winners</p>
            </div>

            {winners.map((winner) => (
              <div
                key={winner.place}
                className={`bg-gradient-to-r ${getPlaceGradient(winner.place)} rounded-lg p-6 border border-white/20`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getPlaceEmoji(winner.place)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {winner.place === 1 ? '1st' : winner.place === 2 ? '2nd' : '3rd'} Place
                      </h3>
                      <p className="text-white/90 font-mono text-sm">
                        {winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{winner.profitShare}%</p>
                    <p className="text-white/80 text-xs">profit share</p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white font-semibold mb-1">{winner.tournament}</p>
                  <p className="text-white/80 text-sm">Buy-in: {winner.tournamentBuyIn}</p>
                </div>
              </div>
            ))}

            {/* User-specific message */}
            {userWinnerInfo && (
              <div className="bg-green-600/20 backdrop-blur-sm rounded-lg p-6 border border-green-400/30">
                <div className="text-center">
                  <div className="text-5xl mb-3">🎊</div>
                  <h3 className="text-2xl font-bold text-white mb-2">You Won!</h3>
                  <p className="text-green-200 mb-4">
                    You placed {userWinnerInfo.place === 1 ? '1st' : userWinnerInfo.place === 2 ? '2nd' : '3rd'} and 
                    earned {userWinnerInfo.profitShare}% profit share
                  </p>
                  <p className="text-white/80 text-sm">
                    If this tournament cashes, you'll receive your share via USDC
                  </p>
                </div>
              </div>
            )}

            {/* Stream CTA */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-3 text-center">Watch Live</h3>
              <p className="text-white/80 mb-4 text-center text-sm">
                Join the stream to see how the community tournaments unfold!
              </p>
              <a
                href="https://retake.tv/live/68b58fa755320f51930c9081"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Watch Live Stream
              </a>
            </div>
          </div>
        )}

        {/* Tournaments Display - Only show before winners drawn */}
        {!winners && tournaments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Upcoming Tournaments</h2>
            <div className="space-y-3">
              {tournaments.map((tournament, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 flex items-center justify-between"
                >
                  <p className="text-white font-semibold text-sm">{tournament.name}</p>
                  <p className="text-blue-300 text-lg font-bold">{tournament.buyIn}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entry Section */}
        {!winners && !hasEntered && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-center mb-4">
              {isConnected && address ? (
                <>
                  <p className="text-white/80 mb-2">Connected Wallet:</p>
                  <p className="text-white font-mono text-sm">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </>
              ) : (
                <p className="text-white/80">Connecting wallet...</p>
              )}
            </div>
            <button
              onClick={handleEnter}
              disabled={isLoading || !isConnected}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all"
            >
              {isLoading ? 'Entering...' : 'Enter the Draw'}
            </button>
            <p className="text-white/60 text-xs text-center mt-3">
              Winners earn 6%, 5%, or 4% profit share
            </p>
          </div>
        )}

        {/* Entered Confirmation */}
        {!winners && hasEntered && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 border border-white/20 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">You're Entered!</h2>
              <p className="text-white/90">
                You'll be randomly assigned to a tournament when winners are drawn.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-3 text-center">Join the Stream</h3>
              <p className="text-white/80 mb-4 text-center text-sm">
                Come watch the community tournaments unfold live!
              </p>
              <a
                href="https://retake.tv/live/68b58fa755320f51930c9081"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Watch Live Stream
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}