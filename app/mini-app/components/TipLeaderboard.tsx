'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  totalAmount: number;
  tipCount: number;
  lastTipTimestamp: number;
}

interface TipLeaderboardProps {
  sessionId: string;
  limit?: number;
}

export default function TipLeaderboard({ sessionId, limit = 10 }: TipLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalTippers, setTotalTippers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    async function fetchLeaderboard() {
      try {
        const res = await fetch(`/api/tips/leaderboard?sessionId=${sessionId}&limit=${limit}`);
        const data = await res.json();

        if (data.success) {
          setLeaderboard(data.leaderboard);
          setTotalTippers(data.totalTippers);
        }
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [sessionId, limit]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 border border-pink-400/30">
        <p className="text-pink-200 text-center text-sm">Loading leaderboard...</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 border border-pink-400/30">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-pink-400" />
          <h3 className="text-white font-bold text-lg">Tip Leaderboard</h3>
        </div>
        <p className="text-pink-200 text-center text-sm">No tips yet! Be the first to support the stream.</p>
      </div>
    );
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-pink-300';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  return (
    <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-6 border border-pink-400/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-pink-400" />
          <h3 className="text-white font-bold text-lg">Tip Leaderboard</h3>
        </div>
        <div className="flex items-center gap-1 text-pink-200 text-sm">
          <TrendingUp className="w-4 h-4" />
          <span>{totalTippers} tipper{totalTippers !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.walletAddress}
            className="bg-white/5 rounded-lg p-3 flex items-center justify-between hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className={`font-bold text-lg min-w-[2rem] ${getRankColor(entry.rank)}`}>
                {getRankEmoji(entry.rank)}
              </span>
              <div>
                <p className="text-white font-mono text-sm">
                  {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                </p>
                <p className="text-pink-200/60 text-xs">
                  {entry.tipCount} tip{entry.tipCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg">
                ${(entry.totalAmount / 100).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalTippers > limit && (
        <p className="text-pink-200/60 text-xs text-center mt-3">
          Showing top {limit} of {totalTippers} tippers
        </p>
      )}
    </div>
  );
}
