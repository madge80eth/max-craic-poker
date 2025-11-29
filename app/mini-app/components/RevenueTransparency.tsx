'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';

interface RevenueStats {
  totalVolume: number;
  totalTips: number;
  totalMemberships: number;
  platformCut: number;
  transactionCount: number;
  activeMemberships: number;
}

export default function RevenueTransparency() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/revenue');
        const data = await res.json();

        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Revenue stats fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-400/30">
        <p className="text-green-200 text-center text-sm">Loading revenue stats...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-400/30">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-green-400" />
        <h3 className="text-white font-bold text-lg">Platform Transparency</h3>
      </div>

      <p className="text-green-100 text-sm mb-4">
        We believe in full transparency. Here's our total platform activity:
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-green-200/60 text-xs">Total Volume</span>
          </div>
          <p className="text-white font-bold text-lg">
            ${(stats.totalVolume / 100).toFixed(2)}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-pink-400" />
            <span className="text-pink-200/60 text-xs">Tips</span>
          </div>
          <p className="text-white font-bold text-lg">
            ${(stats.totalTips / 100).toFixed(2)}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-200/60 text-xs">Members</span>
          </div>
          <p className="text-white font-bold text-lg">
            {stats.activeMemberships}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-blue-200/60 text-xs">Transactions</span>
          </div>
          <p className="text-white font-bold text-lg">
            {stats.transactionCount}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
        <p className="text-blue-200 text-xs text-center">
          💡 Platform takes 2% to cover infrastructure costs. All transactions are onchain and verifiable on Base.
        </p>
      </div>
    </div>
  );
}
