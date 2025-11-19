'use client';

import Link from 'next/link';
import { Info, Gamepad2 } from 'lucide-react';

export default function MorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-8 space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">More</h1>
          <p className="text-blue-200 text-sm">Explore features and information</p>
        </div>

        {/* Grid of Options */}
        <div className="grid grid-cols-2 gap-4">

          {/* Info Card */}
          <Link
            href="/mini-app/info"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all group"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-full group-hover:scale-110 transition-transform">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">Info</h3>
                <p className="text-blue-200 text-xs">How it works & contact</p>
              </div>
            </div>
          </Link>

          {/* Community Game Card */}
          <Link
            href="/mini-app/community-game"
            className="bg-gradient-to-br from-purple-600 to-pink-600 backdrop-blur-lg rounded-xl p-6 border border-pink-400/30 hover:from-purple-700 hover:to-pink-700 transition-all group relative overflow-hidden"
          >
            {/* Coming Soon Badge */}
            <div className="absolute top-2 right-2 bg-yellow-400 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
              SOON
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">Community Game</h3>
                <p className="text-pink-100 text-xs">Compete for prizes & equity</p>
              </div>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
