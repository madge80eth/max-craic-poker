'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, BarChart3, TrendingUp, Trophy, Flame } from 'lucide-react';

interface UserStats {
  totalEntries: number;
  tournamentsAssigned: number;
  currentStreak: number;
}

export default function MorePage() {
  const { address } = useAccount();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        const res = await fetch(`/api/user-stats?address=${address}`);
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Stats fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [address]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-6 space-y-4">

        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">More</h1>
          <p className="text-blue-200 text-sm">Stats, info & resources</p>
        </div>

        {/* Info Card - Link to How It Works */}
        <Link
          href="/mini-app/info"
          className="block bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">How It Works</h3>
              <p className="text-blue-200 text-xs">Learn about draws, prizes & bonuses</p>
            </div>
          </div>
        </Link>

        {/* Stats Section */}
        {address && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-300" />
              Your Stats
            </h3>

            {isLoading ? (
              <div className="text-blue-200 text-sm">Loading...</div>
            ) : stats ? (
              <div className="space-y-3">
                {/* Raffles Entered */}
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-500/20 p-1.5 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-blue-300" />
                    </div>
                    <span className="text-white/80 text-sm">Raffles Entered</span>
                  </div>
                  <span className="text-white font-bold">{stats.totalEntries}</span>
                </div>

                {/* Tournaments Assigned */}
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-500/20 p-1.5 rounded-lg">
                      <Trophy className="w-4 h-4 text-purple-300" />
                    </div>
                    <span className="text-white/80 text-sm">Tournaments Won</span>
                  </div>
                  <span className="text-white font-bold">{stats.tournamentsAssigned}</span>
                </div>

                {/* Current Streak */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${stats.currentStreak === 3 ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
                      <Flame className={`w-4 h-4 ${stats.currentStreak === 3 ? 'text-orange-300' : 'text-gray-300'}`} />
                    </div>
                    <span className="text-white/80 text-sm">Current Streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-bold">{stats.currentStreak}/3</span>
                    {stats.currentStreak === 3 && <span>🔥</span>}
                  </div>
                </div>

                {/* Streak Bonus Info */}
                {stats.currentStreak === 3 && (
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-2 border border-orange-400/30">
                    <p className="text-orange-200 text-xs font-semibold text-center">
                      🔥 Streak Active! 1.5x multiplier on wins!
                    </p>
                  </div>
                )}

                {stats.currentStreak === 2 && (
                  <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-400/30">
                    <p className="text-blue-200 text-xs text-center">
                      💪 One more entry for 1.5x bonus!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-blue-200/60 text-sm">No stats yet - enter a draw!</div>
            )}
          </div>
        )}

        {/* Leaderboard Link */}
        <Link
          href="/mini-app/leaderboard"
          className="block bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Leaderboard</h3>
              <p className="text-blue-200 text-xs">See top community members</p>
            </div>
          </div>
        </Link>

        {/* Coming Soon Placeholder */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 text-center">
          <p className="text-white/40 text-xs">More features coming soon...</p>
        </div>

      </div>
    </div>
  );
}
