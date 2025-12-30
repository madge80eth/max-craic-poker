'use client';

import { Coins, Users, Trophy, Home as HomeIcon, Gift } from 'lucide-react';
import Link from 'next/link';

export default function TokenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-3xl mx-auto space-y-6 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Coins className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">$MCP Token</h1>
          </div>
          <p className="text-2xl text-blue-200 mb-2">Max Craic Poker Community Token</p>
          <div className="inline-block px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 font-bold">🚀 Coming Soon</p>
          </div>
        </div>

        {/* Purpose Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Token Purpose
          </h2>
          <div className="space-y-3 text-blue-200">
            <div className="flex items-start gap-3">
              <span className="text-xl">🎰</span>
              <div>
                <p className="font-semibold text-white mb-1">Community Rewards</p>
                <p className="text-sm">Earn tokens by participating in streams and engaging with the community</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">💬</span>
              <div>
                <p className="font-semibold text-white mb-1">Live Chat Engagement</p>
                <p className="text-sm">Active stream participants earn rewards during tournaments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">🏠</span>
              <div>
                <p className="font-semibold text-white mb-1">Exclusive Access</p>
                <p className="text-sm">Token holders get priority access to special events and home games</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="font-semibold text-white mb-1">Built on Base</p>
                <p className="text-sm">Low fees, instant transfers, and onchain transparency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tokenomics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Tokenomics
          </h2>
          <div className="space-y-4">
            <div className="bg-purple-600/20 rounded-lg p-4 border border-purple-400/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-bold">Total Supply</p>
                <p className="text-2xl font-bold text-purple-300">1,000,000,000</p>
              </div>
              <p className="text-blue-200 text-xs">1 Billion $MCP tokens</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-blue-200 text-sm mb-1">Community Reserve</p>
                <p className="text-2xl font-bold text-white">70-80%</p>
                <p className="text-white/60 text-xs mt-1">For airdrops & rewards</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-blue-200 text-sm mb-1">Initial Liquidity</p>
                <p className="text-2xl font-bold text-white">20-30%</p>
                <p className="text-white/60 text-xs mt-1">Fair launch pool</p>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-lg p-6 border border-yellow-400/30">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Gift className="w-6 h-6 text-yellow-400" />
            How to Earn $MCP
          </h2>

          <div className="space-y-3">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">💬 Stream Chat Participation</p>
              <p className="text-blue-200 text-sm">
                Engage in live chat during tournament streams to earn tokens
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">🎰 Raffle Entries</p>
              <p className="text-blue-200 text-sm">
                Enter community draws and win tournament prizes
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">🏆 Leaderboard Rankings</p>
              <p className="text-blue-200 text-sm">
                Climb the monthly leaderboards for bonus token rewards
              </p>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">🏠 Exclusive Events</p>
              <p className="text-blue-200 text-sm">
                Top holders get access to private home game tournaments
              </p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ Technical Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-blue-200">Blockchain</span>
              <span className="text-white font-semibold">Base (Ethereum L2)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-blue-200">Token Standard</span>
              <span className="text-white font-semibold">ERC-20</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-blue-200">Decimals</span>
              <span className="text-white font-semibold">18</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-blue-200">Launch Method</span>
              <span className="text-white font-semibold">Fair Launch</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-blue-200">Liquidity Pool</span>
              <span className="text-white font-semibold">Uniswap V3 on Base</span>
            </div>
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center pt-6">
          <Link
            href="/mini-app"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-all"
          >
            <HomeIcon className="w-5 h-5" />
            Back to Mini App
          </Link>
          <p className="text-blue-200 text-sm mt-4">
            Keep participating—active community members will be rewarded!
          </p>
        </div>

      </div>
    </div>
  );
}
