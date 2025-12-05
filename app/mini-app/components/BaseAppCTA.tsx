'use client';

import { Sparkles, Download } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';

export default function BaseAppCTA() {
  const { isWebsite, ticketMultiplier } = useAppContext();

  // Only show on website (not Base app or Farcaster)
  if (!isWebsite) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-4 border border-blue-400/30 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="bg-white/20 rounded-lg p-2">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">
            Get 2x Raffle Tickets!
            <span className="bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-full">2x</span>
          </h3>
          <p className="text-blue-100 text-sm mb-3">
            Download the Base app to earn double tickets on every hand you play
          </p>
          <a
            href="https://www.base.org/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold text-sm py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Base App
          </a>
          <p className="text-blue-200/60 text-xs mt-2">
            Powered by Base • 2x tickets automatically applied in-app
          </p>
        </div>
      </div>
    </div>
  );
}
