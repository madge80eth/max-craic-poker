'use client';

import { useState } from 'react';
import { Video, Upload, Settings, DollarSign, TrendingUp } from 'lucide-react';
import MediaUpload from './components/MediaUpload';
import MembershipSettings from './components/MembershipSettings';
import TierDashboard from './components/TierDashboard';

type Tab = 'tier' | 'media' | 'membership' | 'revenue';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tier');

  const tabs = [
    { id: 'tier' as Tab, label: 'Tier & Performance', icon: TrendingUp },
    { id: 'media' as Tab, label: 'Media Upload', icon: Video },
    { id: 'membership' as Tab, label: 'Membership', icon: Settings },
    { id: 'revenue' as Tab, label: 'Revenue', icon: DollarSign }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-blue-200">Manage content, memberships, and revenue</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          {activeTab === 'tier' && <TierDashboard />}
          {activeTab === 'media' && <MediaUpload />}
          {activeTab === 'membership' && <MembershipSettings />}
          {activeTab === 'revenue' && (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Revenue Dashboard</h3>
              <p className="text-blue-200">Coming soon - View all revenue stats and transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
