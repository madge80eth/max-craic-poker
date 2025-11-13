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
  const [hasWinners, setHasWinners] = useState(false);

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

    async function checkWinners() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.winners && Array.isArray(data.winners) && data.winners.length > 0) {
          setHasWinners(true);
        }
      } catch (error) {
        console.error('Winners check error:', error);
      }
    }

    fetchStats();
    fetchNextStream();
    checkWinners();
  }, [address]);

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/mcp-logo.png" alt="MCP Logo" className="w-12 h-12 object-contain" />
            <Trophy className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Your MCP Stats</h1>
          <p className="text-blue-200 text-sm mb-6">Connect your wallet to view your stats and progress</p>
          <Link
            href="/mini-app/draw"
            className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:opacity-90 transition text-sm"
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
      <div className="max-w-md mx-auto pt-6 space-y-4">

        {/* Header with Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/mcp-logo.png" alt="MCP Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold text-white">Your MCP Stats</h1>
          </div>
          <p className="text-blue-200 text-sm">Track your community participation</p>
        </div>

        {/* Stats Cards */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
          <div className="space-y-4">

            {/* Raffles Entered */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-300" />
                </div>
                <span className="text-white/80 text-sm">Raffles Entered</span>
              </div>
              <span className="text-white font-bold text-xl">{stats?.totalEntries || 0}</span>
            </div>

            {/* Tournaments Assigned */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-300" />
                </div>
                <span className="text-white/80 text-sm">Tournaments Assigned</span>
              </div>
              <span className="text-white font-bold text-xl">{stats?.tournamentsAssigned || 0}</span>
            </div>

            {/* Current Streak */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${stats?.currentStreak === 3 ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}>
                  <Flame className={`w-5 h-5 ${stats?.currentStreak === 3 ? 'text-orange-300' : 'text-gray-300'}`} />
                </div>
                <span className="text-white/80 text-sm">Current Streak</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-xl">
                  {stats?.currentStreak || 0}/3
                </span>
                {stats?.currentStreak === 3 && <span className="text-xl">🔥</span>}
              </div>
            </div>

            {/* Streak Bonus Info */}
            {stats?.currentStreak === 3 && (
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-3 border border-orange-400/30">
                <p className="text-orange-200 text-xs font-semibold text-center">
                  🔥 Streak Active! Your next win gets 1.5x multiplier! 🔥
                </p>
              </div>
            )}

            {stats?.currentStreak === 2 && (
              <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-400/30">
                <p className="text-blue-200 text-xs text-center">
                  💪 One more entry to activate 1.5x streak bonus!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Next Draw Info (only show if no winners) */}
        {!hasWinners && nextStreamTime && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="text-center">
              <h3 className="text-base font-bold text-white mb-1">Next Draw</h3>
              <p className="text-blue-200 text-lg font-semibold">{nextStreamTime}</p>
              <p className="text-white/60 text-xs mt-1">Winners announced 30 mins before stream</p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link
          href="/mini-app/draw"
          className="block w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition text-center text-sm"
        >
          {hasWinners ? 'View Draw Results →' : 'Enter Next Draw →'}
        </Link>

        {/* Info Card */}
        <div className="bg-purple-500/10 backdrop-blur-lg rounded-xl p-4 border border-purple-400/20">
          <h3 className="text-white font-semibold mb-2 text-sm">How It Works</h3>
          <ul className="text-blue-200 text-xs space-y-1.5">
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
