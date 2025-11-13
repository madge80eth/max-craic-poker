'use client';

import { useAccount, useConnect } from 'wagmi';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Clock, Trophy, Wallet, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useComposeCast } from '@coinbase/onchainkit/minikit';

interface UserStats {
  totalEntries: number;
  tournamentsAssigned: number;
  currentStreak: number;
}

interface Tournament {
  name: string;
  buyIn: string;
}

interface Winner {
  walletAddress: string;
  position: number;
  assignedTournament: string;
  basePercentage: number;
  sharingBonus: number;
  streakMultiplier: number;
  finalPercentage: number;
  tournamentResult: string;
  payout: number;
}

export default function DrawPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { composeCast } = useComposeCast();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [streamStartTime, setStreamStartTime] = useState<Date | null>(null);
  const [timeUntilStream, setTimeUntilStream] = useState<string>('');
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [isUserWinner, setIsUserWinner] = useState(false);

  useEffect(() => {
    if (!address) return;

    async function fetchStats() {
      const res = await fetch(`/api/user-stats?address=${address}`);
      const data = await res.json();
      setUserStats(data);
    }

    async function checkEntry() {
      const res = await fetch(`/api/status?wallet=${address}`);
      const data = await res.json();
      if (data.success && data.hasEntered) {
        setHasEntered(true);
      }
      // Check for winners
      if (data.winners && Array.isArray(data.winners)) {
        setWinners(data.winners);
        // Check if current user is a winner
        if (address) {
          const userIsWinner = data.winners.some((w: Winner) =>
            w.walletAddress.toLowerCase() === address.toLowerCase()
          );
          setIsUserWinner(userIsWinner);
        }
      }
    }

    fetchStats();
    checkEntry();
  }, [address]);

  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then((data) => {
        setTournaments(data.tournaments || []);
        if (data.streamStartTime) {
          setStreamStartTime(new Date(data.streamStartTime));
        }
      });
  }, []);

  useEffect(() => {
    if (!streamStartTime) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const streamTime = streamStartTime.getTime();
      const difference = streamTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeUntilStream(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeUntilStream(`${hours}h ${minutes}m`);
        } else {
          setTimeUntilStream(`${minutes}m`);
        }
      } else {
        setTimeUntilStream('Stream is live!');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [streamStartTime]);

  async function handleEnterDraw() {
    if (!address || isEntering) return;

    setIsEntering(true);

    // Check if this is 3rd streak entry
    const willActivateStreak = userStats?.currentStreak === 2;

    try {
      // Submit entry
      const res = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'farcaster'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setHasEntered(true);

        // Trigger flame animation if streak activated
        if (willActivateStreak) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF6B35', '#F7931E', '#FDC830']
          });

          setTimeout(() => {
            alert('🔥 STREAK ACTIVE - 1.5X BONUS 🔥\n\nYour next win gets 50% extra profit share!');
          }, 500);
        }

        // Refresh stats
        const statsRes = await fetch(`/api/user-stats?address=${address}`);
        const newStats = await statsRes.json();
        setUserStats(newStats);
      }
    } catch (error) {
      console.error('Entry error:', error);
    } finally {
      setIsEntering(false);
    }
  }

  const handleShare = async () => {
    try {
      composeCast({
        text: "I just entered the Max Craic Poker community draw! 🎰\n\nWin poker tournament profit shares - paid in USDC onchain 💰",
        embeds: ['https://max-craic-poker.vercel.app/share']
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Enter the Draw</h1>
          <p className="text-blue-200">Free entry • Win profit shares</p>
        </div>

        {/* Countdown */}
        {streamStartTime && timeUntilStream && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-300" />
                <h3 className="text-lg font-bold text-white">Next Stream</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{timeUntilStream}</p>
              <p className="text-blue-200 text-sm">
                {streamStartTime.toLocaleString('en-GB', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        )}

        {/* Tournaments List */}
        {tournaments.length > 0 && !hasEntered && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Today's Tournaments</h2>
            <p className="text-blue-200 text-center text-sm mb-4">Winners get assigned to one of these</p>
            <div className="space-y-2">
              {tournaments.map((tournament, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-center justify-between"
                >
                  <p className="text-white text-sm">{tournament.name}</p>
                  <p className="text-blue-300 font-bold text-sm">{tournament.buyIn}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entry Section */}
        {!hasEntered && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-white/80 text-center mb-4">Connect wallet to enter</p>
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <button
                  onClick={handleEnterDraw}
                  disabled={isEntering}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all"
                >
                  {isEntering ? 'Entering...' : 'Enter Draw (Free)'}
                </button>

                {/* Streak Progress */}
                {userStats && (
                  <div className="mt-4 text-center">
                    {userStats.currentStreak === 2 && (
                      <p className="text-yellow-200 text-sm font-semibold">
                        ⚡ Next entry activates 1.5x streak bonus! 🔥
                      </p>
                    )}
                    {userStats.currentStreak === 3 && (
                      <p className="text-orange-200 text-sm font-semibold">
                        🔥 Streak Active - 1.5x bonus on your next win! 🔥
                      </p>
                    )}
                    {userStats.currentStreak < 2 && (
                      <p className="text-white/60 text-xs mt-2">
                        Streak progress: {userStats.currentStreak}/3 consecutive entries
                      </p>
                    )}
                  </div>
                )}

                <p className="text-white/60 text-xs text-center mt-4">
                  Winners earn 3-6% base profit share + bonuses
                </p>
              </>
            )}
          </div>
        )}

        {/* Winners Display */}
        {winners && winners.length > 0 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl p-6 border border-yellow-400/30">
              <div className="text-center mb-4">
                <Trophy className="w-12 h-12 text-white mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-white mb-1">Winners Announced! 🎉</h2>
                <p className="text-white/90 text-sm">Good luck in your assigned tournaments!</p>
              </div>
            </div>

            {isUserWinner && (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 border border-green-400/30">
                <div className="text-center">
                  <div className="text-5xl mb-3">🏆</div>
                  <h3 className="text-2xl font-bold text-white mb-2">You Won!</h3>
                  <p className="text-white/90 text-sm">Check your details below</p>
                </div>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 text-center">Draw Results</h3>
              <div className="space-y-3">
                {winners.map((winner, idx) => {
                  const isCurrentUser = address && winner.walletAddress.toLowerCase() === address.toLowerCase();
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg p-4 border ${
                        isCurrentUser
                          ? 'bg-green-500/20 border-green-400/40'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'}
                          </span>
                          <div>
                            <p className="text-white font-bold text-sm">
                              Position {winner.position}
                              {isCurrentUser && <span className="ml-2 text-green-300">(You!)</span>}
                            </p>
                            <p className="text-white/60 text-xs font-mono">
                              {winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold text-xl">{winner.finalPercentage.toFixed(1)}%</p>
                          <p className="text-white/60 text-xs">profit share</p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3 mb-2">
                        <p className="text-white text-sm font-semibold mb-1">📍 {winner.assignedTournament}</p>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-white/70">
                          <span>Base %:</span>
                          <span>{winner.basePercentage}%</span>
                        </div>
                        {winner.sharingBonus > 0 && (
                          <div className="flex justify-between text-yellow-300">
                            <span>✨ Sharing Bonus:</span>
                            <span>+{winner.sharingBonus}%</span>
                          </div>
                        )}
                        {winner.streakMultiplier > 1 && (
                          <div className="flex justify-between text-orange-300">
                            <span>🔥 Streak Multiplier:</span>
                            <span>×{winner.streakMultiplier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href="/mini-app/stats"
              className="block w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              View Your Stats →
            </Link>
          </div>
        )}

        {/* Entered Confirmation (only show if no winners yet) */}
        {hasEntered && !winners && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 border border-white/20 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">You're Entered!</h2>
              <p className="text-white/90 text-sm mb-4">
                You'll be assigned to a tournament when winners are drawn 30 mins before stream
              </p>

              {userStats?.currentStreak === 3 && (
                <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-400/30 mb-3">
                  <p className="text-orange-200 text-sm font-semibold">
                    🔥 Streak Active - Your next win gets 1.5x multiplier! 🔥
                  </p>
                </div>
              )}
            </div>

            {/* Share CTA */}
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl p-6 border border-yellow-400/30">
              <div className="flex items-start gap-3">
                <Share2 className="w-6 h-6 text-white flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Share for +2% Bonus!</h3>
                  <p className="text-white/90 text-sm mb-3">
                    Share this post and if you win, get an extra +2% on your profit share
                  </p>
                  <button
                    onClick={handleShare}
                    className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Now
                  </button>
                </div>
              </div>
            </div>

            {/* View Stats Link */}
            <Link
              href="/mini-app/stats"
              className="block w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              View Your Stats →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
