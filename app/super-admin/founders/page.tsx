'use client';

import { useState, useEffect } from 'react';
import { Award, UserPlus, RefreshCw, Gift, CheckCircle, XCircle } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  tier: number;
  isFounder: boolean;
  tierOverride?: {
    tier: number;
    expiresAt: number;
    reason: string;
  };
  walletAddress: string;
  createdAt: number;
}

interface GrantDistribution {
  id: string;
  timestamp: number;
  totalGrantAmount: number;
  founderShareAmount: number;
  perFounderAmount: number;
  founderCount: number;
  status: string;
  notes?: string;
}

export default function FounderManagementPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [founders, setFounders] = useState<Creator[]>([]);
  const [grants, setGrants] = useState<GrantDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState('');
  const [founderType, setFounderType] = useState<'standard' | 'strategic_advisor'>('standard');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantNotes, setGrantNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [creatorsRes, foundersRes, grantsRes] = await Promise.all([
        fetch('/api/super-admin/creators'),
        fetch('/api/admin/set-founder'),
        fetch('/api/admin/distribute-grant')
      ]);

      const creatorsData = await creatorsRes.json();
      const foundersData = await foundersRes.json();
      const grantsData = await grantsRes.json();

      if (creatorsData.creators) setCreators(creatorsData.creators);
      if (foundersData.founders) setFounders(foundersData.founders);
      if (grantsData.distributions) setGrants(grantsData.distributions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addFounder() {
    if (!selectedCreator) {
      alert('Please select a creator');
      return;
    }

    try {
      const res = await fetch('/api/admin/set-founder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreator,
          isFounder: true,
          founderType
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        loadData();
        setSelectedCreator('');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    }
  }

  async function removeFounder(creatorId: string) {
    if (!confirm('Remove founder status? This will remove tier override.')) return;

    try {
      const res = await fetch('/api/admin/set-founder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          isFounder: false
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Founder status removed`);
        loadData();
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    }
  }

  async function createGrant() {
    const amountCents = parseFloat(grantAmount) * 100;
    if (!amountCents || amountCents <= 0) {
      alert('Please enter a valid grant amount');
      return;
    }

    try {
      const res = await fetch('/api/admin/distribute-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalGrantAmount: amountCents,
          notes: grantNotes || 'Platform Grant'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        loadData();
        setGrantAmount('');
        setGrantNotes('');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    }
  }

  async function recalculateTiers() {
    if (!confirm('Recalculate tiers for all creators?')) return;

    try {
      const res = await fetch('/api/admin/tier-recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        loadData();
      }
    } catch (error) {
      alert(`❌ Error: ${error}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const totalGrantsDistributed = grants
    .filter(g => g.status === 'distributed')
    .reduce((sum, g) => sum + g.founderShareAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Founder Management</h1>
          <p className="text-blue-200">Manage founder status and grant distributions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Founder Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Founders */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6" />
                Current Founders ({founders.length})
              </h2>

              {founders.length === 0 ? (
                <p className="text-blue-200">No founders yet</p>
              ) : (
                <div className="space-y-3">
                  {founders.map(founder => (
                    <div key={founder.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-lg font-semibold text-white">{founder.name}</p>
                          <p className="text-sm text-blue-300">{founder.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Tier {founder.tier}
                          </div>
                          {founder.tierOverride && (
                            <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-200 px-3 py-1 rounded-full text-xs font-semibold">
                              {founder.tierOverride.reason === 'strategic_advisor' ? 'Permanent' : '6 Months'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-blue-400">
                          {founder.tierOverride?.reason === 'founder' && (
                            <>Expires: {new Date(founder.tierOverride.expiresAt).toLocaleDateString()}</>
                          )}
                          {founder.tierOverride?.reason === 'strategic_advisor' && (
                            <>Strategic Advisor (Permanent)</>
                          )}
                        </p>
                        <button
                          onClick={() => removeFounder(founder.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grant History */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-6 h-6" />
                Grant Distributions
              </h2>

              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-lg p-4 mb-4 border border-yellow-500/30">
                <p className="text-sm text-yellow-200 mb-1">Total Distributed to Founders</p>
                <p className="text-3xl font-bold text-white">${(totalGrantsDistributed / 100).toFixed(2)}</p>
              </div>

              {grants.length === 0 ? (
                <p className="text-blue-200">No grant distributions yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {grants.map(grant => (
                    <div key={grant.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            ${(grant.totalGrantAmount / 100).toFixed(2)} grant
                          </p>
                          <p className="text-xs text-blue-300">
                            Founder share: ${(grant.founderShareAmount / 100).toFixed(2)} ({grant.founderCount} founders)
                          </p>
                          <p className="text-xs text-blue-400">{grant.notes || 'Platform Grant'}</p>
                          <p className="text-xs text-blue-500">{new Date(grant.timestamp).toLocaleDateString()}</p>
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
              )}
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Add Founder */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add Founder
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-200 mb-2">Creator</label>
                  <select
                    value={selectedCreator}
                    onChange={(e) => setSelectedCreator(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">Select creator...</option>
                    {creators.filter(c => !c.isFounder).map(creator => (
                      <option key={creator.id} value={creator.id}>
                        {creator.name} ({creator.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-200 mb-2">Founder Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="radio"
                        value="standard"
                        checked={founderType === 'standard'}
                        onChange={() => setFounderType('standard')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Standard (6 months Tier 1)</span>
                    </label>
                    <label className="flex items-center gap-2 text-white">
                      <input
                        type="radio"
                        value="strategic_advisor"
                        checked={founderType === 'strategic_advisor'}
                        onChange={() => setFounderType('strategic_advisor')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Strategic Advisor (Permanent)</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={addFounder}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Add Founder
                </button>
              </div>
            </div>

            {/* Create Grant Distribution */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Distribute Grant
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-200 mb-2">Grant Amount ($)</label>
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                  <p className="text-xs text-blue-300 mt-1">10% will be distributed to founders</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-blue-200 mb-2">Notes (Optional)</label>
                  <input
                    type="text"
                    value={grantNotes}
                    onChange={(e) => setGrantNotes(e.target.value)}
                    placeholder="Base Foundation Grant Q1 2025"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <button
                  onClick={createGrant}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Create Distribution
                </button>
              </div>
            </div>

            {/* Recalculate Tiers */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Tier Recalculation
              </h3>

              <p className="text-sm text-blue-200 mb-4">
                Force recalculate tiers for all creators based on their 90-day metrics.
              </p>

              <button
                onClick={recalculateTiers}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Recalculate All Tiers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
