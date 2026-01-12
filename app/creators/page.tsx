import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP One-Pager | Max Craic Poker',
  description: 'Monetisation & Engagement for Poker Creators - A companion app for poker content creators',
};

export default function CreatorsPage() {
  return (
    <div className="bg-[#0A0A0A] text-[#F5F5F5] min-h-screen">
      <div className="max-w-2xl mx-auto p-8">

        {/* Header */}
        <header className="mb-8">
          <div className="text-sm font-mono text-[#00D26A] tracking-widest uppercase mb-4">Max Craic Poker</div>
          <h1 className="text-4xl font-bold leading-tight mb-3">
            Monetisation <span className="text-[#00D26A]">&</span> Engagement for <span className="text-[#00D26A]">Poker Creators</span>
          </h1>
          <p className="text-lg text-gray-400">A companion app for poker content creators</p>
        </header>

        {/* Problem */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-l-4 border-red-500 p-5 rounded-r-lg mb-8">
          <div className="text-xs uppercase tracking-wider text-red-500 mb-3">The Problem</div>
          <p className="text-sm mb-3">Poker creators keep getting screwed by platforms they don't control:</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-red-500">✕</span>
              <span><strong>Ad revenue collapse.</strong> <span className="text-gray-500">Nick Eastwood went from £20 to £2 per video overnight.</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500">✕</span>
              <span><strong>Platform dependency.</strong> <span className="text-gray-500">One ToS change and your income disappears.</span></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500">✕</span>
              <span><strong>Payment processor risk.</strong> <span className="text-gray-500">PayPal freezes, chargebacks, holds on your money.</span></span>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-wider text-[#00D26A] mb-3">Why MCP?</div>
          <div className="bg-[#141414] rounded-lg border border-[#222] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#333]">
                    <th className="text-left p-2.5 text-gray-400 font-normal"></th>
                    <th className="p-2.5 text-gray-500 font-normal text-center">YT</th>
                    <th className="p-2.5 text-gray-500 font-normal text-center">Twitch</th>
                    <th className="p-2.5 text-gray-500 font-normal text-center">X</th>
                    <th className="p-2.5 text-gray-500 font-normal text-center">Patreon</th>
                    <th className="p-2.5 text-[#00D26A] font-bold text-center">MCP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#222]">
                    <td className="p-2.5 text-gray-300">Memberships</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="p-2.5 text-gray-300">Tips</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="p-2.5 text-gray-300">Exclusive Content</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-gray-400 text-center">✓</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                  <tr className="border-b border-[#222] bg-[#0d1f0d]">
                    <td className="p-2.5 text-gray-300">Equity Giveaways</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                  <tr className="border-b border-[#222] bg-[#0d1f0d]">
                    <td className="p-2.5 text-gray-300">Engagement Games</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                  <tr className="border-b border-[#222]">
                    <td className="p-2.5 text-gray-300">Direct Payments</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-gray-300">No Freeze Risk</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-red-500 text-center">✗</td>
                    <td className="p-2.5 text-center text-base">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-2.5 border-t border-[#333] text-center text-xs text-gray-500">
              Stop duct-taping 5 platforms together. One link. Everything works.
            </div>
          </div>
        </div>

        {/* Three Pillars */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-wider text-[#00D26A] mb-3">The Three Pillars</div>
          <div className="space-y-3">
            <div className="bg-[#141414] p-4 rounded-lg border border-[#222] flex gap-3">
              <div className="text-2xl">💵</div>
              <div>
                <div className="font-bold mb-0.5">Monetisation</div>
                <div className="text-sm text-gray-400">Tips, memberships, video sales. Multiple revenue streams, paid instantly in USDC. No PayPal freezes, no chargebacks.</div>
              </div>
            </div>
            <div className="bg-[#141414] p-4 rounded-lg border border-[#222] flex gap-3">
              <div className="text-2xl">🎯</div>
              <div>
                <div className="font-bold mb-0.5">Engagement</div>
                <div className="text-sm text-gray-400">Hand of the Hour voting, interactive features. Reasons for viewers to come back and stay connected between streams.</div>
              </div>
            </div>
            <div className="bg-[#141414] p-4 rounded-lg border border-[#222] flex gap-3">
              <div className="text-2xl">🤝</div>
              <div>
                <div className="font-bold mb-0.5">Incentive Alignment</div>
                <div className="text-sm text-gray-400">When you win, your community shares the upside. Automated giveaways with transparent, provable payouts.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Split */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-[#00D26A] mb-3">Revenue Split</div>
          <div className="bg-gradient-to-br from-[#0d1f0d] to-[#0a0a0a] border border-[#00D26A] rounded-lg overflow-hidden">
            <div className="p-5 text-center border-b border-[#00D26A]/30">
              <div className="text-xs uppercase tracking-wider text-[#00D26A] mb-1">Founding Creators</div>
              <div className="font-mono text-5xl font-bold text-[#00D26A]">90/10</div>
              <div className="text-sm text-gray-400 mt-1">You keep 90% for the first 6 months</div>
            </div>
            <div className="p-3 bg-[#0a0a0a]/50">
              <div className="text-xs text-center text-gray-400 mb-2">Founders also get:</div>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="bg-[#00D26A]/10 text-[#00D26A] px-2.5 py-1 rounded-full border border-[#00D26A]/30">Founder Badge</span>
                <span className="bg-[#00D26A]/10 text-[#00D26A] px-2.5 py-1 rounded-full border border-[#00D26A]/30">Share of Grant Funding</span>
                <span className="bg-[#00D26A]/10 text-[#00D26A] px-2.5 py-1 rounded-full border border-[#00D26A]/30">White Glove Support</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            After 6 months, split is based on your volume (75/25 up to 90/10). The more you make, the more you keep.
          </p>
        </div>

        {/* Footer */}
        <footer className="pt-4 border-t border-[#222] text-right">
          <a href="https://maxcraicpoker.com" className="text-[#00D26A] text-sm hover:underline">maxcraicpoker.com</a>
        </footer>

      </div>
    </div>
  );
}
