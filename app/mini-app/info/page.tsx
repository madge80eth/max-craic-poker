'use client';

import Link from 'next/link';
import MembershipCard from '../components/MembershipCard';

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">

        <h1 className="text-3xl font-bold text-white text-center mb-6">How It Works</h1>

        {/* Membership Card - Shows subscribe or status */}
        <MembershipCard />

        {/* Community Game Card */}
        <Link href="/mini-app/community-game">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 backdrop-blur-sm rounded-lg p-6 border border-pink-400/30 hover:from-purple-700 hover:to-pink-700 transition-all cursor-pointer">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🎮</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-white">Community Game</h2>
                  <span className="bg-yellow-400 text-purple-900 text-xs font-bold px-2 py-0.5 rounded-full">COMING SOON</span>
                </div>
                <p className="text-pink-100 leading-relaxed text-sm">
                  New way to win! Compete before each stream for cash prizes and equity in future community games. Finish top 3 to claim guaranteed rewards.
                </p>
                <p className="text-pink-200 text-xs mt-2 font-semibold">
                  Tap to learn more →
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* The Draw */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-3">🎰 The Draw</h2>
          <p className="text-blue-200 leading-relaxed">
            Every stream, 6 winners are randomly selected from all entries.
          </p>
          <p className="text-blue-200 leading-relaxed mt-2">
            Each winner is assigned to one of 6 tournaments. If that tournament cashes, you get paid your share of the profit!
          </p>
          <p className="text-blue-200 leading-relaxed mt-3 text-sm">
            All tournaments are streamed live via Retake for full transparency.
          </p>
        </div>

        {/* Prize Structure */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">💰 Prize Structure</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white font-bold py-2">Position</th>
                  <th className="text-center text-white font-bold py-2">Base %</th>
                  <th className="text-center text-white font-bold py-2">With Bonuses</th>
                  <th className="text-right text-white font-bold py-2">Max %</th>
                </tr>
              </thead>
              <tbody className="text-blue-200">
                <tr className="border-b border-white/10">
                  <td className="py-3">1st 🥇</td>
                  <td className="text-center">6%</td>
                  <td className="text-center text-xs">+2% share, 1.5x streak</td>
                  <td className="text-right font-bold text-yellow-300">12%</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3">2nd 🥈</td>
                  <td className="text-center">5%</td>
                  <td className="text-center text-xs">+2% share, 1.5x streak</td>
                  <td className="text-right font-bold text-gray-300">10.5%</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3">3rd 🥉</td>
                  <td className="text-center">4.5%</td>
                  <td className="text-center text-xs">+2% share, 1.5x streak</td>
                  <td className="text-right font-bold text-amber-300">9.75%</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3">4th</td>
                  <td className="text-center">4%</td>
                  <td className="text-center text-xs">+2% share, 1.5x streak</td>
                  <td className="text-right font-bold text-blue-300">9%</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3">5th</td>
                  <td className="text-center">3.5%</td>
                  <td className="text-center text-xs">+2% share, 1.5x streak</td>
                  <td className="text-right font-bold text-blue-300">8.25%</td>
                </tr>
                <tr>
                  <td className="py-3">6th</td>
                  <td className="text-center">3%</td>
                  <td className="text-center text-xs">+2% share, 1.5x streak</td>
                  <td className="text-right font-bold text-blue-300">7.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bonuses */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">⚡ Bonuses</h2>

          <div className="space-y-4">
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-400/20">
              <h3 className="text-white font-bold mb-2">Sharing Bonus (+2%)</h3>
              <p className="text-blue-200 text-sm">
                Share the draw to unlock an extra +2% on your base profit share
              </p>
            </div>

            <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-400/20">
              <h3 className="text-white font-bold mb-2">Streak Bonus (1.5x multiplier) 🔥</h3>
              <p className="text-blue-200 text-sm">
                Enter 3 consecutive draws in a row to activate the streak multiplier
              </p>
            </div>
          </div>
        </div>

        {/* Example */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-lg p-6 border border-purple-400/30">
          <h2 className="text-xl font-bold text-white mb-3">📊 Example</h2>
          <p className="text-blue-200 text-sm mb-3">
            You're drawn 1st, you shared the draw, and you're on a 3-draw streak. Your assigned tournament cashes $500 profit.
          </p>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-white text-sm">
              Your payout: <span className="font-mono">6% + 2% = 8% × 1.5 = 12% × $500 = </span>
              <span className="font-bold text-green-300 text-lg">$60</span>
            </p>
          </div>
        </div>

        {/* Free to Enter */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-3">🎁 Free to Enter</h2>
          <p className="text-blue-200 leading-relaxed">
            Always free. No purchase necessary. Transparent profit sharing.
          </p>
        </div>

        {/* On Base */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-3">🔗 On Base</h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Built on Base - low fees, instant payouts, and fully onchain. Your profit shares are sent directly to your wallet via USDC when tournaments cash.
          </p>
        </div>

      </div>
    </div>
  );
}
