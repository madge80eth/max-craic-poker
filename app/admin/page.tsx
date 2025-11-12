'use client';

import { useState } from 'react';
import { Users, TrendingUp, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCurrentEntries = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/status');
      const data = await response.json();

      if (data.success) {
        setStats(data);
      } else {
        setError('Failed to fetch entries');
      }
    } catch (err) {
      setError('Error fetching data: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-blue-200">Manage draws and view current statistics</p>
        </div>

        {/* Current Draw Stats */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Current Draw</h2>
            </div>

            <button
              onClick={fetchCurrentEntries}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Get Entries Count'}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {stats && (
            <div className="space-y-4">
              {/* Total Entries Card */}
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-6 border border-blue-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm mb-1">Total Entries</p>
                    <p className="text-5xl font-bold text-white">{stats.totalEntries}</p>
                  </div>
                  <TrendingUp className="w-16 h-16 text-blue-300 opacity-50" />
                </div>
              </div>

              {/* Winners Info */}
              {stats.winners && stats.winners.length > 0 && (
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    🏆 Current Winners ({stats.winners.length})
                  </h3>
                  <div className="space-y-2">
                    {stats.winners.map((winner: any, index: number) => (
                      <div key={index} className="bg-white/10 rounded-lg p-3 text-sm">
                        <p className="text-white font-semibold">
                          Tournament {index + 1}: {winner.tournament || 'N/A'}
                        </p>
                        <p className="text-blue-200 text-xs mt-1 font-mono">
                          {winner.walletAddress}
                        </p>
                        {winner.percentage && (
                          <p className="text-yellow-300 text-xs mt-1">
                            Prize: {winner.percentage}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!stats.winners || stats.winners.length === 0 && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-blue-200 text-center">No winners drawn yet</p>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-blue-200 text-sm mb-1">Last Updated</p>
                  <p className="text-white font-semibold">{new Date().toLocaleString()}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-blue-200 text-sm mb-1">Status</p>
                  <p className="text-green-400 font-semibold">Active</p>
                </div>
              </div>
            </div>
          )}

          {!stats && !loading && (
            <div className="text-center py-8">
              <p className="text-blue-200">Click the button above to view current draw statistics</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/api/test-draw"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded-lg p-4 text-center transition-all"
            >
              <p className="text-white font-semibold mb-1">Run Test Draw</p>
              <p className="text-blue-200 text-sm">Execute draw selection</p>
            </a>

            <a
              href="/api/reset"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600/20 hover:bg-red-600/30 border border-red-400/30 rounded-lg p-4 text-center transition-all"
            >
              <p className="text-white font-semibold mb-1">Reset Draw</p>
              <p className="text-blue-200 text-sm">Clear current entries</p>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
