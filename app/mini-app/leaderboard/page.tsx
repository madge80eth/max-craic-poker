'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Trophy } from 'lucide-react';
import { WalletDisplay } from '../components/WalletDisplay';

interface LeaderboardEntry {
  walletAddress: string;
  totalEntries: number;
  lastEntry: string;
  rank: number;
}

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [address]);

  async function fetchLeaderboard() {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return now.toLocaleString('en-GB', { month: 'long' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Top Community Supporters
          </h1>
          <p className="text-blue-200 text-sm">{getCurrentMonth()} Leaderboard</p>
        </div>

        {isLoading ? (
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
                    <div className="text-2xl font-bold text-white w-12">
                      {entry.rank <= 3 ? (
                        <span>{entry.rank === 1 ? '🏆' : entry.rank === 2 ? '🥈' : '🥉'}</span>
                      ) : (
                        <span className="text-purple-300">#{entry.rank}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-mono text-sm">
                        <WalletDisplay address={entry.walletAddress} showFullOnHover={true} />
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
              <div className="bg-blue-600/20 rounded-lg p-5 border border-blue-400/30">
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
    </div>
  );
}
