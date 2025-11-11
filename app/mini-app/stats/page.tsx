'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { TrendingUp, Trophy, Flame } from 'lucide-react';
import Link from 'next/link';

interface UserStats {
  totalEntries: number;
  tournamentsAssigned: number;
  currentStreak: number;
}

export default function StatsPage() {
  const { address } = useAccount();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [nextStreamTime, setNextStreamTime] = useState<string>('');
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

    async function fetchNextStream() {
      try {
        const res = await fetch('/tournaments.json');
        const data = await res.json();
        if (data.streamStartTime) {
          const streamDate = new Date(data.streamStartTime);
          setNextStreamTime(streamDate.toLocaleString('en-GB', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }));
        }
      } catch (error) {
        console.error('Stream time fetch error:', error);
      }
    }

    fetchStats();
    fetchNextStream();
  }, [address]);

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Trophy className="w-20 h-20 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Your MCP Stats</h1>
          <p className="text-blue-200 mb-6">Connect your wallet to view your stats and progress</p>
          <Link
            href="/mini-app/draw"
            className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition"
          >
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your MCP Stats</h1>
          <p className="text-blue-200">Track your community participation</p>
        </div>

        {/* Stats Cards */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="space-y-6">

            {/* Raffles Entered */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-300" />
                </div>
                <span className="text-white/80">Raffles Entered</span>
              </div>
              <span className="text-white font-bold text-2xl">{stats?.totalEntries || 0}</span>
            </div>

            {/* Tournaments Assigned */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <Trophy className="w-6 h-6 text-purple-300" />
                </div>
                <span className="text-white/80">Tournaments Assigned</span>
              </div>
              <span className="text-white font-bold text-2xl">{stats?.tournamentsAssigned || 0}</span>
            </div>

            {/* Current Streak */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${stats?.currentStreak === 3 ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
                  <Flame className={`w-6 h-6 ${stats?.currentStreak === 3 ? 'text-orange-300' : 'text-gray-300'}`} />
                </div>
                <span className="text-white/80">Current Streak</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-2xl">
                  {stats?.currentStreak || 0}/3
                </span>
                {stats?.currentStreak === 3 && <span className="text-2xl">🔥</span>}
              </div>
            </div>

            {/* Streak Bonus Info */}
            {stats?.currentStreak === 3 && (
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-4 border border-orange-400/30">
                <p className="text-orange-200 text-sm font-semibold text-center">
                  🔥 Streak Active! Your next win gets 1.5x multiplier! 🔥
                </p>
              </div>
            )}

            {stats?.currentStreak === 2 && (
              <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                <p className="text-blue-200 text-sm text-center">
                  💪 One more entry to activate 1.5x streak bonus!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Next Draw Info */}
        {nextStreamTime && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-2">Next Draw</h3>
              <p className="text-blue-200 text-xl font-semibold">{nextStreamTime}</p>
              <p className="text-white/60 text-sm mt-2">Winners announced 30 mins before stream</p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link
          href="/mini-app/draw"
          className="block w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-4 px-6 rounded-lg hover:opacity-90 transition text-center"
        >
          Enter Next Draw →
        </Link>

        {/* Info Card */}
        <div className="bg-purple-500/10 backdrop-blur-lg rounded-xl p-5 border border-purple-400/20">
          <h3 className="text-white font-semibold mb-2">How It Works</h3>
          <ul className="text-blue-200 text-sm space-y-2">
            <li>• Enter each draw for free</li>
            <li>• 6 winners selected per stream</li>
            <li>• Win up to 12% profit share</li>
            <li>• Streak bonus: 3 consecutive entries = 1.5x multiplier</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
