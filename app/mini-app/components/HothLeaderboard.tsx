'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  wallet: string;
  correctPredictions: number;
}

export default function HothLeaderboard() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isTopThree, setIsTopThree] = useState(false);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/hoth/results');
        const data = await response.json();

        if (data.leaderboard && data.leaderboard.length > 0) {
          setLeaderboard(data.leaderboard);

          // Check if current user is in top 3
          if (address) {
            const userInTop3 = data.leaderboard.some((entry: LeaderboardEntry) =>
              entry.wallet.toLowerCase() === address.toLowerCase()
            );
            setIsTopThree(userInTop3);
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    }

    fetchLeaderboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [address]);


  // Don't show if no leaderboard data
  if (leaderboard.length === 0) {
    return null;
  }

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-400/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <div>
          <h2 className="text-white font-bold text-2xl">Hand of the Hour Winners</h2>
          <p className="text-yellow-200 text-sm">Top predictors from today's stream</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3 mb-6">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = address && entry.wallet.toLowerCase() === address.toLowerCase();

          return (
            <div
              key={entry.wallet}
              className={`bg-gradient-to-r ${
                isCurrentUser
                  ? 'from-green-600/30 to-emerald-600/30 border-green-400'
                  : 'from-white/5 to-white/10 border-white/20'
              } border rounded-xl p-4 flex items-center justify-between transition-all hover:scale-102`}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {getMedalEmoji(index)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`font-mono font-bold ${isCurrentUser ? 'text-green-300' : 'text-white'}`}>
                      {entry.wallet.slice(0, 8)}...{entry.wallet.slice(-6)}
                    </div>
                    {isCurrentUser && (
                      <span className="bg-green-500/30 text-green-300 text-xs px-2 py-1 rounded-full font-semibold">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-yellow-200 text-sm">
                    {entry.correctPredictions} correct prediction{entry.correctPredictions !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner Message */}
      {isTopThree && address && (
        <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl p-5 border border-purple-400/30 text-center">
          <div className="text-yellow-400 text-4xl mb-2">🎉</div>
          <h3 className="text-white font-bold text-lg mb-1">Congratulations!</h3>
          <p className="text-purple-200 text-sm">
            You're in the top 3! Prizes will be distributed at the end of stream.
          </p>
        </div>
      )}

      {/* Not in Top 3 Message */}
      {!isTopThree && address && (
        <div className="bg-blue-500/20 border border-blue-400 rounded-xl p-4 text-center">
          <p className="text-blue-200 text-sm">
            Better luck next stream! Keep predicting to climb the leaderboard.
          </p>
        </div>
      )}
    </div>
  );
}
