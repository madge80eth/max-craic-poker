'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

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

export default function PreviousWinners() {
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const response = await fetch('/api/admin/payout-records');
        const data = await response.json();

        if (data.success) {
          setRecords(data.records || []);
        }
      } catch (error) {
        console.error('Failed to fetch payout records:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-3">🏆 Previous Winners</h2>
        <p className="text-blue-200 text-sm">Loading...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-3">🏆 Previous Winners</h2>
        <p className="text-blue-200 text-sm">
          Verified payout records will appear here when tournaments cash and winners are paid.
        </p>
      </div>
    );
  }

  const getPositionEmoji = (position: number) => {
    const emojis = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅'];
    return emojis[position - 1] || '🏅';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-4">🏆 Previous Winners</h2>
      <p className="text-blue-200 text-sm mb-4">
        Transparent payout history - all transactions verified on Base blockchain
      </p>

      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="bg-gradient-to-r from-green-500/10 to-blue-500/10 backdrop-blur-sm rounded-lg p-4 border border-green-400/20"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getPositionEmoji(record.position)}</span>
                  <span className="text-white font-bold text-sm">
                    {record.percentage.toFixed(1)}% • ${record.usdcAmount.toFixed(2)} USDC
                  </span>
                </div>
                <p className="text-blue-200 text-xs leading-relaxed">
                  {record.tournament}
                </p>
                <p className="text-blue-300/60 text-xs mt-1">
                  {formatDate(record.date)}
                </p>
              </div>

              <a
                href={record.basescanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Verify</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {records.length > 5 && (
        <p className="text-blue-300/60 text-xs text-center mt-4">
          Showing {records.length} verified payout{records.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
