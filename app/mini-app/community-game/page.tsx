'use client';

import Link from 'next/link';

export default function CommunityGamePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24 flex items-center justify-center">
      <div className="max-w-md mx-auto space-y-6 text-center">

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="/mcp-logo.png" alt="MCP Logo" className="w-12 h-12 object-contain" />
          <h1 className="text-3xl font-bold text-white">Community Game</h1>
        </div>

        {/* Under Construction */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-xl p-8 border border-yellow-400/30">
          <p className="text-6xl mb-4">🚧</p>
          <h2 className="text-2xl font-bold text-white mb-3">Under Construction</h2>
          <p className="text-yellow-100/80 text-sm">
            We're building something special. Check back soon!
          </p>
        </div>

        {/* Back to More Link */}
        <Link
          href="/mini-app/more"
          className="block w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center text-sm"
        >
          ← Back to More
        </Link>

      </div>
    </div>
  );
}
