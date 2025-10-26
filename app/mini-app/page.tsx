'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Trophy, Clock, ExternalLink, Share2, Home, BarChart3, Video, Info } from 'lucide-react';
import { sdk } from '@farcaster/frame-sdk';
import { useComposeCast } from '@coinbase/onchainkit/minikit';

interface Tournament {
  name: string;
  buyIn: string;
}

interface TournamentsData {
  streamStartTime: string;
  tournaments: Tournament[];
}

interface Winner {
  place: number;
  walletAddress: string;
  tournament: string;
  tournamentBuyIn: string;
  profitShare: number;
  hasShared?: boolean;
}

interface LeaderboardEntry {
  walletAddress: string;
  totalEntries: number;
  lastEntry: string;
  rank: number;
}

type TabType = 'home' | 'leaderboard' | 'media' | 'info';

export default function MiniApp() {
  const { address, isConnected } = useAccount();
  const { composeCast } = useComposeCast();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [userWinnerInfo, setUserWinnerInfo] = useState<Winner | null>(null);
  const [streamStartTime, setStreamStartTime] = useState<Date | null>(null);
  const [timeUntilStream, setTimeUntilStream] = useState<string>('');
  const [isStreamInFuture, setIsStreamInFuture] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // CRITICAL: Call sdk.actions.ready() to dismiss Farcaster splash screen
  // DO NOT REMOVE - Prevents purple screen hang on Farcaster
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

  // Load tournaments and stream start time
  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then((data: TournamentsData | Tournament[]) => {
        if (Array.isArray(data)) {
          // Old format - just tournaments array
          setTournaments(data);
        } else {
          // New format - object with streamStartTime and tournaments
          setTournaments(data.tournaments || []);
          if (data.streamStartTime) {
            setStreamStartTime(new Date(data.streamStartTime));
          }
        }
      });
  }, []);

  // Stream countdown timer with session state detection
  useEffect(() => {
    if (!streamStartTime) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const streamTime = streamStartTime.getTime();
      const difference = streamTime - now;

      // STATE DETECTION: Is this a NEW future session or a PAST session?
      if (difference > 0) {
        // FUTURE SESSION - Show countdown, stream is upcoming
        setIsStreamInFuture(true);

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

        // Auto-trigger draw 30 minutes before stream
        const thirtyMinsInMs = 30 * 60 * 1000;
        if (difference <= thirtyMinsInMs && difference > (thirtyMinsInMs - 60000) && !winners) {
          triggerAutoDraw();
        }
      } else {
        // PAST SESSION - Stream time has passed
        setIsStreamInFuture(false);
        // If winners exist, show them (session completed)
        // If no winners yet, stream is happening now
        setTimeUntilStream(winners ? '' : 'Stream is live!');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [streamStartTime, winners]);

  // Check user status
  useEffect(() => {
    if (!address) return;

    const checkStatus = async () => {
      const res = await fetch(`/api/status?wallet=${address}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.hasEntered) {
          setHasEntered(true);
        }
        setWinners(data.winners);
        setUserWinnerInfo(data.winnerInfo);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [address]);

  const triggerAutoDraw = async () => {
    try {
      console.log('Auto-triggering draw 30 mins before stream...');
      await fetch('/api/draw', { method: 'POST' });
    } catch (error) {
      console.error('Auto-draw error:', error);
    }
  };

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

  const handleShare = async () => {
    try {
      // Open native share dialog
      composeCast({
        text: "I just entered the Max Craic Poker community draw! 🎰\n\nWin poker tournament profit shares - paid in USDC onchain 💰",
        embeds: ['https://max-craic-poker.vercel.app/share']
      });

      // Record that user shared (for bonus calculation)
      if (address) {
        await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address })
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Fetch leaderboard when tab switches to leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const url = address ? `/api/leaderboard?wallet=${address}` : '/api/leaderboard';
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setLeaderboard(data.leaderboard);
        setUserRank(data.userRank);
      }
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
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

  const formatStreamTime = () => {
    if (!streamStartTime) return '';
    return streamStartTime.toLocaleString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatWalletAddress = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-white mb-2">Max Craic Poker</h1>
          <p className="text-blue-200">Community-Backed Tournaments</p>
        </div>

        {/* HOME TAB CONTENT */}
        {activeTab === 'home' && (
          <>

        {/* Stream Countdown - Only show for FUTURE streams when no winners yet */}
        {streamStartTime && isStreamInFuture && !winners && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-6 h-6 text-blue-300" />
                <h3 className="text-xl font-bold text-white">Next Live Stream</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">{timeUntilStream}</p>
              <p className="text-blue-200 text-sm">{formatStreamTime()}</p>
              <p className="text-white/60 text-xs mt-3">Winners announced 30 mins before stream</p>
            </div>
          </div>
        )}

        {/* Stream is LIVE banner - Past stream time, no winners yet (clickable) */}
        {streamStartTime && !isStreamInFuture && !winners && timeUntilStream && (
          <a
            href="https://retake.tv/live/68b58fa755320f51930c9081"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-2">{timeUntilStream}</p>
              <p className="text-blue-200 text-sm mb-2">{formatStreamTime()}</p>
              <p className="text-white/80 text-sm">👉 Click to watch live</p>
            </div>
          </a>
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
                    <span className="text-5xl">{getPlaceEmoji(winner.place)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {winner.place === 1 ? '1st' : winner.place === 2 ? '2nd' : '3rd'} Place
                      </h3>
                      <p className="text-white/90 font-mono text-sm">
                        {formatWalletAddress(winner.walletAddress)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-white mb-0">{winner.profitShare}%</p>
                    <p className="text-white/80 text-xs">profit share</p>
                    {winner.hasShared && (
                      <p className="text-green-300 text-xs mt-1 font-bold">+Share Bonus!</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-white font-semibold mb-1">{winner.tournament}</p>
                  <p className="text-white/80 text-sm">Buy-in: {winner.tournamentBuyIn}</p>
                </div>
              </div>
            ))}

            {/* User-specific winner message */}
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

            {/* Stream CTA for Winners */}
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

        {/* Tournaments Display - Only show for FUTURE streams (before winners drawn) */}
        {!winners && isStreamInFuture && tournaments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">What I'm Playing</h2>
            <p className="text-blue-200 text-center text-sm mb-4">Winners get assigned to one of these tournaments</p>
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

        {/* Entry Section - Only show for FUTURE streams */}
        {!winners && !hasEntered && isStreamInFuture && (
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

        {/* Entered Confirmation with Sharing Reminder - Only for FUTURE streams */}
        {!winners && hasEntered && isStreamInFuture && (
          <div className="space-y-4">
            {/* Entry Confirmation */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 border border-white/20 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">You're Entered!</h2>
              <p className="text-white/90 mb-4">
                You'll be randomly assigned to a tournament when winners are drawn.
              </p>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/80 text-sm">
                  Winners earn <span className="font-bold text-white">6%, 5%, or 4%</span> profit share
                </p>
              </div>
            </div>

            {/* Sharing Reminder - DOUBLE REWARDS */}
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-6 border border-yellow-400/30">
              <div className="flex items-start gap-3 mb-3">
                <Share2 className="w-6 h-6 text-white flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Share to DOUBLE Your Rewards!</h3>
                  <p className="text-white/90 text-sm mb-3">
                    Share this post and if you win, your profit share doubles:
                  </p>
                  <div className="bg-white/20 rounded-lg p-3 space-y-1 mb-4">
                    <p className="text-white font-bold">🥇 1st Place: 6% → <span className="text-yellow-200">12%</span></p>
                    <p className="text-white font-bold">🥈 2nd Place: 5% → <span className="text-yellow-200">10%</span></p>
                    <p className="text-white font-bold">🥉 3rd Place: 4% → <span className="text-yellow-200">8%</span></p>
                  </div>
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

            {/* Stream CTA */}
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
          </>
        )}

        {/* LEADERBOARD TAB CONTENT */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center">Community Leaderboard</h2>
            <p className="text-blue-200 text-center text-sm">Top participants in Max Craic Poker draws</p>

            {isLoadingLeaderboard ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 border border-white/20 text-center">
                <p className="text-white">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 border border-white/20 text-center">
                <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Entries Yet</h3>
                <p className="text-blue-200">Be the first to enter and claim the top spot!</p>
              </div>
            ) : (
              <>
                {leaderboard.map((entry) => (
                  <div
                    key={entry.walletAddress}
                    className={`rounded-lg p-5 border ${
                      entry.rank <= 3
                        ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-400/30'
                        : address?.toLowerCase() === entry.walletAddress.toLowerCase()
                        ? 'bg-blue-600/20 border-blue-400/30'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-white w-8">
                          {entry.rank <= 3 ? (
                            <span>{entry.rank === 1 ? '🏆' : entry.rank === 2 ? '🥈' : '🥉'}</span>
                          ) : (
                            <span className="text-purple-300">#{entry.rank}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-mono text-sm">
                            {formatWalletAddress(entry.walletAddress)}
                          </p>
                          <p className="text-blue-300 text-xs">
                            Last entry: {formatDate(entry.lastEntry)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{entry.totalEntries}</p>
                        <p className="text-blue-300 text-xs">entries</p>
                      </div>
                    </div>
                  </div>
                ))}

                {userRank && !userRank.isInTop20 && (
                  <div className="bg-blue-600/20 rounded-lg p-5 border border-blue-400/30 mt-4">
                    <div className="text-center">
                      <p className="text-white font-semibold mb-1">Your Rank</p>
                      <p className="text-3xl font-bold text-blue-300">#{userRank.rank}</p>
                      <p className="text-blue-200 text-sm">{userRank.totalEntries} entries</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* MEDIA TAB CONTENT */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center">Media Hub</h2>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 border border-white/20 text-center">
              <Video className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">Coming Soon</h3>
              <p className="text-blue-200 mb-2">Stream VODs and tournament highlights</p>
              <p className="text-white/60 text-sm">Watch past sessions and big moments!</p>
            </div>
          </div>
        )}

        {/* INFO TAB CONTENT */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white text-center">How It Works</h2>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-3">🎰 The Draw</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Enter the community draw for free. 3 winners are randomly selected and each assigned to a poker tournament. If that tournament cashes, you earn a share of the profit paid in USDC onchain.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">💰 Profit Shares</h3>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
                  <p className="text-white font-bold mb-1">🏆 1st Place</p>
                  <p className="text-blue-200 text-sm">6% profit share (12% if you share!)</p>
                </div>
                <div className="bg-gradient-to-r from-gray-400/10 to-gray-500/10 rounded-lg p-4 border border-gray-400/20">
                  <p className="text-white font-bold mb-1">🥈 2nd Place</p>
                  <p className="text-blue-200 text-sm">5% profit share (10% if you share!)</p>
                </div>
                <div className="bg-gradient-to-r from-amber-600/10 to-amber-700/10 rounded-lg p-4 border border-amber-600/20">
                  <p className="text-white font-bold mb-1">🥉 3rd Place</p>
                  <p className="text-blue-200 text-sm">4% profit share (8% if you share!)</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-3">📊 Past Payouts</h3>
              <p className="text-blue-200 text-sm text-center py-4">
                Payout history will appear here after first session
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-3">🔗 On Base</h3>
              <p className="text-blue-200 text-sm leading-relaxed">
                Built on Base - low fees, instant payouts, and fully onchain. Your profit shares are sent directly to your wallet via USDC when tournaments cash.
              </p>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-900 via-purple-900/95 to-transparent backdrop-blur-md border-t border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-around">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'home'
                    ? 'bg-purple-600 text-white'
                    : 'text-blue-300 hover:text-white'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-xs font-medium">Home</span>
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-purple-600 text-white'
                    : 'text-blue-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs font-medium">Leaderboard</span>
              </button>

              <button
                onClick={() => setActiveTab('media')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'media'
                    ? 'bg-purple-600 text-white'
                    : 'text-blue-300 hover:text-white'
                }`}
              >
                <Video className="w-5 h-5" />
                <span className="text-xs font-medium">Media</span>
              </button>

              <button
                onClick={() => setActiveTab('info')}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'info'
                    ? 'bg-purple-600 text-white'
                    : 'text-blue-300 hover:text-white'
                }`}
              >
                <Info className="w-5 h-5" />
                <span className="text-xs font-medium">Info</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}