'use client';

import { useAccount, useConnect } from 'wagmi';
import { Trophy, Ticket, Flame, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function CommunityGamePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-6 space-y-6">

        {/* Header */}
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/mcp-logo.png" alt="MCP Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-3xl font-bold text-white">Community Game</h1>
          </div>

          {/* Coming Soon Badge */}
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 text-sm font-bold px-4 py-2 rounded-full mb-3">
            COMING SOON
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 border border-pink-400/30 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Play. Win. Own.
          </h2>
          <p className="text-white/90 text-sm">
            A new way to compete and earn before every stream
          </p>
        </div>

        {/* How to Win Section */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg">How to Win</h3>

          <div className="grid grid-cols-1 gap-3">
            {/* Method 1: Enter Giveaway */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg flex-shrink-0">
                  <Ticket className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-base mb-1">Enter the Giveaway</h4>
                  <p className="text-blue-200 text-sm">
                    Free entry to win profit shares (current method)
                  </p>
                </div>
              </div>
            </div>

            {/* Method 2: Top 3 Finish */}
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-xl p-5 border border-orange-400/30">
              <div className="flex items-start gap-3">
                <div className="bg-orange-500/30 p-2 rounded-lg flex-shrink-0">
                  <Trophy className="w-5 h-5 text-orange-300" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
                    Finish Top 3
                    <span className="bg-yellow-400 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
                  </h4>
                  <p className="text-orange-100 text-sm">
                    Compete in community game to claim guaranteed prizes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Prizes Section */}
        <div className="space-y-3">
          <h3 className="text-white font-bold text-lg">The Prizes</h3>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 space-y-4">

            {/* Cash Prizes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💰</span>
                <h4 className="text-white font-semibold">Cash Prizes</h4>
              </div>
              <p className="text-blue-200 text-sm">
                Top 3 finishers win cash prizes before each stream
              </p>
            </div>

            {/* Equity Stake */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <h4 className="text-white font-semibold">Community Equity</h4>
              </div>
              <p className="text-blue-200 text-sm">
                Plus percentage equity in future community games
              </p>
            </div>

            {/* Timing */}
            <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400/30">
              <p className="text-purple-100 text-xs text-center font-medium">
                Games run before each stream session
              </p>
            </div>

          </div>
        </div>

        {/* Wallet Connection */}
        {!isConnected && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20">
            <p className="text-white/80 text-center mb-3 text-sm">Connect your wallet to get ready</p>
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect {connector.name}
              </button>
            ))}
          </div>
        )}

        {/* Under Construction Footer */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-400/30 text-center">
          <p className="text-yellow-200 text-sm font-semibold mb-1">🚧 Under Construction</p>
          <p className="text-yellow-100/80 text-xs">
            We're building something special. Stay tuned for launch details!
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
