'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, CreditCard, Calendar, Award, Gift, ExternalLink } from 'lucide-react';

interface CreatorMetrics {
  volume90d: number;
  uniqueWallets90d: number;
  transactionCount90d: number;
  activeMonths: number;
}

interface TierOverride {
  tier: 1 | 2 | 3 | 4;
  expiresAt: number;
  reason: string;
}

interface Creator {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  tierOverride?: TierOverride;
  isFounder: boolean;
  metrics: CreatorMetrics;
  lastTierRecalculation: number;
}

interface GrantDistribution {
  id: string;
  timestamp: number;
  totalGrantAmount: number;
  founderShareAmount: number;
  perFounderAmount: number;
  founderCount: number;
  status: 'pending' | 'distributed' | 'failed';
  distributedAt?: number;
  notes?: string;
}

export default function TierDashboard() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [grants, setGrants] = useState<GrantDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreatorData();
    if (creator?.isFounder) {
      loadGrantData();
    }
  }, []);

  async function loadCreatorData() {
    try {
      // Get creator data from super-admin endpoint
      // For now, defaulting to max-craic-poker creator
      const res = await fetch('/api/super-admin/creators');
      const data = await res.json();

      if (data.creators && data.creators.length > 0) {
        setCreator(data.creators[0]); // Default to first creator
      }
    } catch (error) {
      console.error('Failed to load creator data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGrantData() {
    try {
      const res = await fetch('/api/admin/distribute-grant');
      const data = await res.json();

      if (data.success) {
        setGrants(data.distributions || []);
      }
    } catch (error) {
      console.error('Failed to load grant data:', error);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
        <p className="text-blue-200 mt-4">Loading tier data...</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="text-center py-12">
        <p className="text-blue-200">No creator data available</p>
      </div>
    );
  }

  const tierInfo = getTierInfo(creator.tier);
  const nextRecalc = new Date(creator.lastTierRecalculation + (90 * 24 * 60 * 60 * 1000));
  const monthlyVolume = creator.metrics.volume90d / 3;
  const totalGrantEarnings = grants
    .filter(g => g.status === 'distributed')
    .reduce((sum, g) => sum + g.perFounderAmount, 0);

  return (
    <div className="space-y-6">
      {/* Tier Overview */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Current Tier: {creator.tier}</h2>
            </div>
            <p className="text-purple-100">{tierInfo.description}</p>
          </div>
          {creator.isFounder && (
            <div className="bg-yellow-500/20 border border-yellow-300 rounded-lg px-4 py-2">
              <p className="text-yellow-100 text-sm font-semibold">🎖️ FOUNDER</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-purple-200 text-sm">Your Split</p>
            <p className="text-3xl font-bold">{tierInfo.creatorPercent}%</p>
          </div>
          <div>
            <p className="text-purple-200 text-sm">Platform Fee</p>
            <p className="text-3xl font-bold">{tierInfo.platformPercent}%</p>
          </div>
        </div>

        {creator.tierOverride && (
          <div className="mt-4 bg-white/10 rounded-lg p-3">
            <p className="text-sm text-purple-100">
              🎁 <strong>Tier Override Active:</strong> {creator.tierOverride.reason === 'founder' ? 'Founder Program (6 months)' : 'Strategic Advisor (Permanent)'}
            </p>
            {creator.tierOverride.reason === 'founder' && (
              <p className="text-xs text-purple-200 mt-1">
                Expires: {new Date(creator.tierOverride.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Monthly Volume (Avg)"
          value={`$${(monthlyVolume / 100).toFixed(2)}`}
          subtitle="90-day average"
          color="purple"
        />
        <MetricCard
          icon={Users}
          label="Unique Wallets"
          value={creator.metrics.uniqueWallets90d}
          subtitle="Last 90 days"
          color="blue"
        />
        <MetricCard
          icon={CreditCard}
          label="Transactions"
          value={creator.metrics.transactionCount90d}
          subtitle="Last 90 days"
          color="green"
        />
        <MetricCard
          icon={Calendar}
          label="Active Months"
          value={creator.metrics.activeMonths}
          subtitle="Out of 3 months"
          color="orange"
        />
      </div>

      {/* Tier Requirements */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-bold text-white mb-4">Tier Requirements</h3>
        <div className="space-y-3">
          <TierRequirement
            tier={1}
            requirement="$50K+ monthly volume"
            current={monthlyVolume}
            threshold={5000000}
            creatorTier={creator.tier}
          />
          <TierRequirement
            tier={2}
            requirement="$20-50K monthly volume"
            current={monthlyVolume}
            threshold={2000000}
            creatorTier={creator.tier}
          />
          <TierRequirement
            tier={3}
            requirement="$5-20K monthly volume"
            current={monthlyVolume}
            threshold={500000}
            creatorTier={creator.tier}
          />
          <TierRequirement
            tier={4}
            requirement="<$5K monthly volume"
            current={monthlyVolume}
            threshold={0}
            creatorTier={creator.tier}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-blue-200">
            <strong>Next Recalculation:</strong> {nextRecalc.toLocaleDateString()} (Quarterly)
          </p>
          <p className="text-xs text-blue-300 mt-1">
            Anti-gaming: Tiers 1-3 require 10+ unique wallets, 20+ transactions, 1+ active month
          </p>
        </div>
      </div>

      {/* Founder Grant Earnings */}
      {creator.isFounder && (
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-6 border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Founder Grant Earnings</h3>
          </div>

          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-200 mb-1">Total Earnings from Grants</p>
            <p className="text-3xl font-bold text-white">${(totalGrantEarnings / 100).toFixed(2)}</p>
            <p className="text-xs text-yellow-300 mt-1">{grants.filter(g => g.status === 'distributed').length} distributions received</p>
          </div>

          {grants.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-sm font-semibold text-yellow-200 mb-2">Recent Distributions:</p>
              {grants.map(grant => (
                <div key={grant.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        ${(grant.perFounderAmount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-blue-300">
                        {grant.notes || 'Platform Grant'}
                      </p>
                      <p className="text-xs text-blue-400">
                        {new Date(grant.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      grant.status === 'distributed'
                        ? 'bg-green-500/20 text-green-300'
                        : grant.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {grant.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-yellow-300">No grant distributions yet</p>
          )}

          <div className="mt-4 pt-4 border-t border-yellow-500/20">
            <p className="text-xs text-yellow-200">
              💡 As a founder, you receive 10% of all platform grants, split equally among founders.
            </p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-200 mb-2">How Tiers Work</h4>
        <ul className="text-xs text-blue-300 space-y-1">
          <li>• Tiers are calculated based on your 90-day rolling average monthly volume</li>
          <li>• Higher tiers = you keep more revenue (90% at Tier 1 vs 75% at Tier 4)</li>
          <li>• Recalculated quarterly to reward consistent performance</li>
          <li>• Founders get Tier 1 (90/10) for 6 months, then tier-based on performance</li>
          <li>• Build volume, engage your community, and move up tiers!</li>
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: {
  icon: any;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: 'from-purple-600/20 to-purple-700/20 border-purple-500/30',
    blue: 'from-blue-600/20 to-blue-700/20 border-blue-500/30',
    green: 'from-green-600/20 to-green-700/20 border-green-500/30',
    orange: 'from-orange-600/20 to-orange-700/20 border-orange-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-xl p-4 border`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-white" />
        <p className="text-sm text-blue-200">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-blue-300 mt-1">{subtitle}</p>
    </div>
  );
}

function TierRequirement({ tier, requirement, current, threshold, creatorTier }: {
  tier: number;
  requirement: string;
  current: number;
  threshold: number;
  creatorTier: number;
}) {
  const isCurrentTier = tier === creatorTier;
  const meetsRequirement = tier === 4 || current >= threshold;
  const tierSplits = {
    1: '90/10',
    2: '85/15',
    3: '80/20',
    4: '75/25'
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${
      isCurrentTier
        ? 'bg-purple-600/30 border border-purple-400'
        : 'bg-white/5 border border-white/10'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          isCurrentTier
            ? 'bg-purple-600 text-white'
            : 'bg-white/10 text-blue-200'
        }`}>
          {tier}
        </div>
        <div>
          <p className={`font-semibold ${isCurrentTier ? 'text-white' : 'text-blue-200'}`}>
            Tier {tier} ({tierSplits[tier as keyof typeof tierSplits]})
          </p>
          <p className="text-xs text-blue-300">{requirement}</p>
        </div>
      </div>
      {isCurrentTier && (
        <div className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
          CURRENT
        </div>
      )}
    </div>
  );
}

function getTierInfo(tier: 1 | 2 | 3 | 4) {
  const info = {
    1: { creatorPercent: 90, platformPercent: 10, description: 'Elite - $50K+ monthly volume' },
    2: { creatorPercent: 85, platformPercent: 15, description: 'Pro - $20-50K monthly volume' },
    3: { creatorPercent: 80, platformPercent: 20, description: 'Rising - $5-20K monthly volume' },
    4: { creatorPercent: 75, platformPercent: 25, description: 'Starter - Building your audience' }
  };
  return info[tier];
}
