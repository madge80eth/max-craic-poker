'use client';

import { useAccount, useConnect } from 'wagmi';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Clock, Trophy, Wallet, Flame } from 'lucide-react';
import Link from 'next/link';
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import NotificationPrompt from '@/components/NotificationPrompt';

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
  const [streamHasPassed, setStreamHasPassed] = useState(false);

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
    fetch('/api/tournaments')
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
      // Stream considered "passed" 24 hours after start time (aligns with home page logic)
      const twentyFourHoursAfterStream = streamTime + (24 * 60 * 60 * 1000);

      if (now > twentyFourHoursAfterStream) {
        setStreamHasPassed(true);
        setTimeUntilStream('');
      } else if (difference > 0) {
        setStreamHasPassed(false);
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
        setStreamHasPassed(false);
        setTimeUntilStream('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [streamStartTime]);

  async function handleEnterDraw(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!address || isEntering) return;

    setIsEntering(true);

    // Check if this is 3rd streak entry
    const willActivateStreak = userStats?.currentStreak === 2;

    try {
      // Submit entry with 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'farcaster'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
      } else {
        // Handle error response
        console.error('Entry failed:', data);
        alert(data.error || 'Failed to enter draw. Please try again.');
      }
    } catch (error: any) {
      console.error('Entry error:', error);
      if (error.name === 'AbortError') {
        alert('Request timed out. Please check your connection and try again.');
      } else {
        alert('Failed to enter draw. Please try again.');
      }
    } finally {
      setIsEntering(false);
    }
  }

  // REMOVED: Share bonus feature (no longer offering +2% bonus for sharing)
  // Previous implementation tracked shares via /api/share endpoint
  // Equity calculations now based only on: base entry + streak bonus + membership bonus

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            {winners ? 'Draw Results' : 'Enter the Draw'}
          </h1>
          <p className="text-blue-200">
            {winners ? 'Winners have been selected' : 'Free entry • Win profit shares'}
          </p>
        </div>

        {/* Message for when winners exist - stream is over */}
        {winners && streamHasPassed && (
          <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/30">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-white">Previous Draw Winners</h3>
              </div>
              <p className="text-blue-200 text-sm leading-relaxed">
                Get notified when the next stream goes live and catch up on highlights in the Media tab
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <Link href="/mini-app/media">
                  <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all">
                    📺 Watch Highlights
                  </button>
                </Link>
                <NotificationPrompt />
              </div>
            </div>
          </div>
        )}

        {/* Past Stream Message (when NO winners yet) */}
        {streamHasPassed && !winners && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-300" />
                <h3 className="text-lg font-bold text-white">Last Stream</h3>
              </div>
              <p className="text-blue-200 text-sm mb-3">
                {streamStartTime?.toLocaleString('en-GB', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-white/80 text-sm">Catch up on stream highlights in the Media tab</p>
            </div>
          </div>
        )}

        {/* Countdown (only show if stream upcoming and no winners yet) */}
        {!streamHasPassed && !winners && streamStartTime && timeUntilStream && (
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
        {tournaments.length > 0 && !hasEntered && !winners && (
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

        {/* Entry Section (only show if no winners drawn yet) */}
        {!hasEntered && !winners && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            {streamHasPassed ? (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full bg-gray-600 text-white/60 font-bold py-4 px-6 rounded-lg cursor-not-allowed"
                >
                  Draw Closed
                </button>
                <p className="text-blue-200 text-xs text-center">
                  This draw has ended. Check back for the next stream!
                </p>
              </div>
            ) : !isConnected ? (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full bg-gray-600 text-white/60 font-bold py-4 px-6 rounded-lg cursor-not-allowed"
                >
                  Connect Wallet First
                </button>
                <p className="text-blue-200 text-xs text-center">
                  Go to the <Link href="/mini-app/home" className="underline font-semibold">Home</Link> tab to connect your wallet
                </p>
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

                {/* Free Entry Disclaimer */}
                <div className="bg-blue-900/30 border border-blue-400/20 rounded-lg p-3 mt-3">
                  <p className="text-blue-200/80 text-xs leading-relaxed text-center">
                    <strong>FREE Entry:</strong> No purchase necessary. All community members can enter. Members receive bonus tickets.
                  </p>
                </div>

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
                  Winners earn 3-6% base profit share
                </p>
              </>
            )}
          </div>
        )}

        {/* Winners Display */}
        {winners && winners.length > 0 && (
          <div className="space-y-4">
            {/* Winners Announced Header */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-blue-300" />
                <h2 className="text-lg font-bold text-white">Draw Complete</h2>
              </div>
              <p className="text-white/70 text-xs text-center">6 winners selected</p>
            </div>

            {/* User Winner Notification */}
            {isUserWinner && (
              <div className="bg-green-500/20 rounded-xl p-4 border border-green-400/40">
                <p className="text-green-200 text-sm font-semibold text-center">
                  ✓ You won! Check your assignment below
                </p>
              </div>
            )}

            {/* Winners List - Compact */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <div className="space-y-3">
                {winners.map((winner, idx) => {
                  const isCurrentUser = address && winner.walletAddress.toLowerCase() === address.toLowerCase();
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-green-500/20 border border-green-400/40'
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg flex-shrink-0">
                            {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'}
                          </span>
                          <p className="text-white/60 text-xs font-mono">
                            {winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}
                            {isCurrentUser && <span className="ml-1 text-green-300">(You)</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold text-sm">{winner.finalPercentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <p className="text-white/90 text-xs pl-8">{winner.assignedTournament}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REMOVED: "Watch Stream" button - stream is embedded on home page when active */}

            <Link
              href="/mini-app/stats"
              className="block w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center text-sm"
            >
              View Your Stats
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

              {/* Streak Status Display */}
              {userStats && (
                <div className="bg-white/10 rounded-lg p-3 border border-white/20 mb-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Flame className={`w-5 h-5 ${userStats.currentStreak === 3 ? 'text-orange-300' : 'text-blue-300'}`} />
                    <p className="text-white text-sm font-semibold">
                      Streak: {userStats.currentStreak}/3 consecutive entries
                    </p>
                  </div>
                  {userStats.currentStreak === 3 && (
                    <p className="text-orange-200 text-xs font-semibold mt-1">
                      🔥 Your next win gets 1.5x multiplier! 🔥
                    </p>
                  )}
                  {userStats.currentStreak === 2 && (
                    <p className="text-yellow-200 text-xs mt-1">
                      💪 One more entry to activate 1.5x bonus!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* REMOVED: Share bonus CTA - no longer offering +2% bonus for sharing */}

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

      {/* Notification Prompt - show after entering */}
      {hasEntered && !winners && (
        <NotificationPrompt message="Get notified when winners are announced & the stream starts" />
      )}
    </div>
  );
}
