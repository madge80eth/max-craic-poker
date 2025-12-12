'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Receipt, TrendingUp, Calendar } from 'lucide-react';

interface PayoutRecord {
  id: string;
  date: string;
  tournament: string;
  percentage: number;
  usdcAmount: number;
  basescanUrl: string;
  position: number;
  createdAt: number;
}

export default function PayoutsPage() {
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayoutRecords();
  }, []);

  const fetchPayoutRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/payout-records');
      const data = await response.json();

      if (data.success) {
        setRecords(data.records || []);
      } else {
        setError('Failed to load payout records');
      }
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Error loading payouts');
    } finally {
      setLoading(false);
    }
  };

  const getPositionEmoji = (position: number) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  const getPositionText = (position: number) => {
    const suffixes = ['st', 'nd', 'rd', 'th', 'th', 'th'];
    return `${position}${suffixes[position - 1] || 'th'}`;
  };

  const shortenAddress = (url: string) => {
    // Extract transaction hash from Basescan URL
    const match = url.match(/0x[a-fA-F0-9]{64}/);
    if (match) {
      const hash = match[0];
      return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
    }
    return 'View';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/mcp-logo.png" alt="MCP Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-3xl font-bold text-white">Winner Payouts</h1>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="text-blue-300 text-lg">Loading payouts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src="/mcp-logo.png" alt="MCP Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-3xl font-bold text-white">Winner Payouts</h1>
        </div>

        {/* Subtitle */}
        <p className="text-center text-blue-200 mb-8 text-sm">
          Verified onchain transactions • All payouts are public and transparent
        </p>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && records.length === 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 text-center">
            <Receipt className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">No Payouts Yet</h2>
            <p className="text-blue-200 text-sm">
              Winner payouts will appear here after tournaments complete.
            </p>
          </div>
        )}

        {/* Payout Records */}
        {records.length > 0 && (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-5 border border-white/20 hover:border-purple-400/50 transition-all hover:shadow-xl hover:shadow-purple-500/20"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">
                      {getPositionEmoji(record.position)}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">
                        {getPositionText(record.position)} Place
                      </div>
                      <div className="flex items-center gap-2 text-blue-300 text-xs">
                        <Calendar className="w-3 h-3" />
                        {formatDate(record.date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-2xl">
                      ${record.usdcAmount.toFixed(2)}
                    </div>
                    <div className="text-blue-300 text-xs">USDC</div>
                  </div>
                </div>

                {/* Tournament Info */}
                <div className="bg-black/20 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-xs font-semibold">Tournament</span>
                  </div>
                  <div className="text-white text-sm font-medium">
                    {record.tournament}
                  </div>
                </div>

                {/* Percentage Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-purple-600/30 border border-purple-500/50 rounded-lg px-3 py-1.5">
                    <span className="text-purple-200 text-xs font-semibold">
                      {record.percentage.toFixed(1)}% Share
                    </span>
                  </div>
                </div>

                {/* Basescan Link */}
                <a
                  href={record.basescanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span className="text-sm">View on BaseScan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono opacity-80">
                      {shortenAddress(record.basescanUrl)}
                    </span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>

                {/* Verification Badge */}
                <div className="mt-3 flex items-center justify-center gap-2 text-green-400 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Verified Onchain</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Note */}
        {records.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-blue-300 text-xs opacity-70">
              All transactions are recorded on Base blockchain and publicly verifiable
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
