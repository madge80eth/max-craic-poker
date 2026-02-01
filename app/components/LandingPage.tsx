'use client';

import Image from 'next/image';
import {
  ArrowRight,
  ExternalLink,
  Tv,
  Users,
  TrendingUp,
  Ticket,
  DollarSign,
  Trophy,
  Heart,
  Shield,
  Coins,
  BadgeCheck,
  FileText,
  Lock,
  AtSign,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const products = [
  {
    id: 'max-craic-poker',
    name: 'Max Craic Poker',
    tagline: 'Turn viewers into stakeholders',
    status: 'LIVE',
    accent: 'text-purple-400',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    dot: 'bg-emerald-400',
    dealClass: 'animate-deal-1',
  },
  {
    id: 'home-game',
    name: 'Home Game',
    tagline: 'Community poker, trustless settlement',
    status: 'LIVE',
    accent: 'text-emerald-400',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    dot: 'bg-emerald-400',
    dealClass: 'animate-deal-2',
  },
  {
    id: 'live-staking',
    name: 'Live Staking',
    tagline: 'Portable reputation. Trustless backing.',
    status: 'COMING SOON',
    accent: 'text-gray-500',
    border: 'border-white/5 hover:border-white/10',
    dot: 'bg-gray-500',
    dealClass: 'animate-deal-3',
  },
];

const mcpFeatures = [
  { icon: Ticket, title: 'Daily Raffle Draw', desc: 'Enter free, win a share when the creator cashes tournaments' },
  { icon: DollarSign, title: 'USDC Payouts', desc: 'Winners paid automatically on Base. No tokens, no points.' },
  { icon: Trophy, title: 'Hand of the Hour', desc: 'Best poker hand each hour wins bonus raffle tickets' },
  { icon: Heart, title: 'Tipping & Memberships', desc: 'Tip the stream, subscribe for perks, climb the leaderboard' },
];

const homeGameFeatures = [
  { icon: Shield, title: 'Sybil Protected', desc: 'Coinbase verification, NFT gating, Farcaster, .base.eth' },
  { icon: Users, title: '6-Max Tables', desc: 'Real-time no-limit hold\'em with up to 6 players per table' },
  { icon: Coins, title: 'Bonding Mechanism', desc: 'Refundable USDC deposits keep games honest' },
  { icon: Trophy, title: 'Multi-Table Tournaments', desc: '18-player MTTs with automatic table balancing' },
];

const liveStakingFeatures = [
  { icon: BadgeCheck, title: 'On-Chain Credentials', desc: 'Verified tournament results stored on Base' },
  { icon: TrendingUp, title: 'Portable Reputation', desc: 'Your track record follows you across platforms' },
  { icon: FileText, title: 'Smart Settlements', desc: 'Automated backer/player splits via smart contract' },
  { icon: Lock, title: 'Trustless Staking', desc: 'No middlemen. Stake and settle peer-to-peer.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function FeatureGrid({ features, iconColor }: { features: typeof mcpFeatures; iconColor: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {features.map((f) => (
        <div key={f.title} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <f.icon className={`w-5 h-5 ${iconColor} mb-3`} />
          <h4 className="font-medium text-sm text-white/90">{f.title}</h4>
          <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white antialiased">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#09090b]/70 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/mcp-logo.png"
              alt="Craic Protocol"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-sm font-semibold text-white/80 tracking-tight">
              Craic Protocol
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-5 text-xs text-white/40">
            <button onClick={() => scrollTo('products')} className="hover:text-white/80 transition-colors">
              Products
            </button>
            <a
              href="https://warpcast.com/maxcraicpoker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              Farcaster
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero — The Deal ────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-14">
        {/* Single subtle ambient glow */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/[0.04] rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-3xl mx-auto text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-6 animate-fade-up">
            Built on Base
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Poker infrastructure
            <br />
            <span className="text-white/40">for onchain communities</span>
          </h1>
        </div>

        {/* ── Dealt Cards ──────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 px-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => scrollTo(p.id)}
              className={`${p.dealClass} group text-left rounded-2xl border ${p.border} bg-white/[0.02] backdrop-blur-sm p-6 md:p-7 transition-all duration-300 hover:bg-white/[0.04]`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-medium">
                  {p.status}
                </span>
              </div>
              <h3 className={`text-lg font-semibold ${p.status === 'COMING SOON' ? 'text-white/50' : 'text-white/90'}`}>
                {p.name}
              </h3>
              <p className="mt-1.5 text-sm text-white/30 leading-relaxed">
                {p.tagline}
              </p>
              <div className={`mt-5 flex items-center gap-1.5 text-xs font-medium ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                Learn more <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        {/* Subtext after cards land */}
        <p className="relative z-10 mt-12 text-sm text-white/25 max-w-lg mx-auto text-center leading-relaxed animate-fade-up-delay">
          Three products addressing different parts of the poker value chain.
          Zero rake. One protocol.
        </p>
      </section>

      {/* ── Product Sections ────────────────────────────────── */}
      <div id="products" className="scroll-mt-20" />

      {/* Max Craic Poker */}
      <section id="max-craic-poker" className="py-24 md:py-32 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-medium">Live</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Max Craic Poker
              </h2>
              <p className="mt-4 text-white/40 leading-relaxed">
                A creator monetization and engagement platform built around live
                poker. Viewers enter free daily raffles for a share of tournament
                profits — paid out automatically in USDC on Base.
              </p>
              <p className="mt-3 text-white/25 leading-relaxed text-sm">
                Hand of the Hour competitions, tipping, memberships, and video
                content keep the community engaged between sessions. The creator
                plays, the community profits.
              </p>
              <div className="mt-8">
                <a href="https://maxcraicpoker.com" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  maxcraicpoker.com
                </a>
              </div>
            </div>
            <FeatureGrid features={mcpFeatures} iconColor="text-purple-400/70" />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-white/[0.04]" />
      </div>

      {/* Home Game */}
      <section id="home-game" className="py-24 md:py-32 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-medium">Live</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Home Game
              </h2>
              <p className="mt-4 text-white/40 leading-relaxed">
                Trustless 6-handed no-limit hold&apos;em for onchain communities.
                Host a private tournament, gate it with NFTs or Coinbase
                verification, and let the smart contract handle the payouts.
              </p>
              <p className="mt-3 text-white/25 leading-relaxed text-sm">
                Sponsored tournaments let brands fund prize pools for their
                community. Multi-table tournaments scale up to 18 players with
                automatic table balancing. Zero rake. Zero trust required.
              </p>
              <div className="mt-8">
                <a href="/poker"
                   className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Tv className="w-3.5 h-3.5" />
                  Open lobby
                </a>
              </div>
            </div>
            <FeatureGrid features={homeGameFeatures} iconColor="text-emerald-400/70" />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-white/[0.04]" />
      </div>

      {/* Live Staking */}
      <section id="live-staking" className="py-24 md:py-32 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-medium">Coming soon</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white/60">
                Live Staking
              </h2>
              <p className="mt-4 text-white/30 leading-relaxed">
                Your poker results, verified on-chain. Build a portable reputation
                that follows you across platforms. Smart contract settlement means
                backers and players both get a fair deal — automatically.
              </p>
              <p className="mt-3 text-white/20 leading-relaxed text-sm">
                The $500M+ staking market currently runs on trust and spreadsheets.
                We&apos;re building the infrastructure to fix that.
              </p>
              <div className="mt-8">
                <a href="https://warpcast.com/maxcraicpoker" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-sm font-medium text-white/30 hover:text-white/50 transition-colors">
                  <AtSign className="w-3.5 h-3.5" />
                  Follow on Farcaster for updates
                </a>
              </div>
            </div>
            <div className="opacity-40">
              <FeatureGrid features={liveStakingFeatures} iconColor="text-blue-400/50" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <div className="flex items-center gap-2">
            <Image src="/mcp-logo.png" alt="Craic Protocol" width={20} height={20} className="rounded opacity-50" />
            <span>Craic Protocol</span>
          </div>
          <span>
            Powered by <span className="text-blue-400/60 font-medium">Base</span>
          </span>
          <a
            href="https://warpcast.com/maxcraicpoker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition-colors"
          >
            Farcaster
          </a>
        </div>
      </footer>
    </div>
  );
}
