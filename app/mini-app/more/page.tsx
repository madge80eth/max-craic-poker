'use client';

import Link from 'next/link';
import { Info, BarChart3 } from 'lucide-react';

export default function MorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">More</h1>
          <p className="text-blue-200 text-sm">Additional resources and information</p>
        </div>

        {/* Cards Grid */}
        <div className="flex flex-col items-center gap-6">
          {/* Leaderboard Card */}
          <Link
            href="/mini-app/leaderboard"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all group w-64"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Leaderboard</h3>
                <p className="text-blue-200 text-sm">See top entries and tournament assignments</p>
              </div>
            </div>
          </Link>

          {/* Info Card */}
          <Link
            href="/mini-app/info"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 hover:bg-white/15 transition-all group w-64"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Info className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Info</h3>
                <p className="text-blue-200 text-sm">Learn how Max Craic Poker works, prize structure, and contact information</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Placeholder for future options */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center">
          <p className="text-white/60 text-sm">More features coming soon...</p>
        </div>

      </div>
    </div>
  );
}
