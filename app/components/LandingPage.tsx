'use client';

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
    accent: 'text-violet-400',
    borderColor: 'border-violet-500/15 hover:border-violet-500/30',
    dot: 'bg-emerald-400',
    dealClass: 'animate-deal-1',
  },
  {
    id: 'home-game',
    name: 'Home Game',
    tagline: 'Community poker, trustless settlement',
    status: 'LIVE',
    accent: 'text-teal-400',
    borderColor: 'border-teal-500/15 hover:border-teal-500/30',
    dot: 'bg-emerald-400',
    dealClass: 'animate-deal-2',
  },
  {
    id: 'live-staking',
    name: 'Live Staking',
    tagline: 'Portable reputation. Trustless backing.',
    status: 'COMING SOON',
    accent: 'text-white/30',
    borderColor: 'border-white/5 hover:border-white/10',
    dot: 'bg-zinc-500',
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {features.map((f) => (
        <div key={f.title} className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <f.icon className={`w-4 h-4 ${iconColor} mb-2.5`} />
          <h4 className="font-medium text-[13px] text-zinc-200">{f.title}</h4>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function BaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H0C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-300 tracking-tight">
            Craic Protocol
          </span>
          <div className="hidden sm:flex items-center gap-5 text-xs text-zinc-500">
            <button onClick={() => scrollTo('products')} className="hover:text-zinc-200 transition-colors">
              Products
            </button>
            <a
              href="https://warpcast.com/maxcraicpoker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              Farcaster
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-14">
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/[0.03] rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-2xl mx-auto text-center mb-14">
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.15] animate-fade-up">
            Poker infrastructure
            <br />
            <span className="text-zinc-500">for onchain communities</span>
          </h1>
          <p className="mt-5 text-sm text-zinc-500 max-w-md mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.15s' }}>
            Creator monetization. Trustless home games. Portable player reputation.
            Three products, one protocol, zero rake.
          </p>
        </div>

        {/* ── Dealt Cards ──────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 sm:gap-4 px-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => scrollTo(p.id)}
              className={`${p.dealClass} group text-left flex-1 rounded-xl border ${p.borderColor} bg-zinc-900/40 p-5 sm:p-6 transition-all duration-300 hover:bg-zinc-900/70`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">
                  {p.status}
                </span>
              </div>
              <h3 className={`text-base font-semibold ${p.status === 'COMING SOON' ? 'text-zinc-500' : 'text-zinc-100'}`}>
                {p.name}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                {p.tagline}
              </p>
              <div className={`mt-4 flex items-center gap-1.5 text-[11px] font-medium ${p.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                Learn more <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        <p className="relative z-10 mt-10 text-xs text-zinc-600 max-w-sm mx-auto text-center leading-relaxed animate-fade-up-delay">
          Three products. Different parts of the poker value chain. All settling on Base.
        </p>
      </section>

      {/* ── Product Sections ────────────────────────────────── */}
      <div id="products" className="scroll-mt-20" />

      {/* Max Craic Poker */}
      <section id="max-craic-poker" className="py-20 md:py-28 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">Live</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Max Craic Poker
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed text-[15px]">
                A creator monetization and engagement platform built around streaming
                online poker. Viewers enter free daily raffles for a share of tournament
                profits, paid out automatically in USDC on Base.
              </p>
              <p className="mt-3 text-zinc-500 leading-relaxed text-sm">
                Hand of the Hour competitions, tipping, memberships, and video content
                keep the community engaged between sessions. The creator plays, the
                community profits.
              </p>
              <div className="mt-8">
                <a href="https://maxcraicpoker.com" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  maxcraicpoker.com
                </a>
              </div>
            </div>
            <FeatureGrid features={mcpFeatures} iconColor="text-violet-400/60" />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-zinc-800/50" /></div>

      {/* Home Game */}
      <section id="home-game" className="py-20 md:py-28 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">Live</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Home Game
              </h2>
              <p className="mt-4 text-zinc-400 leading-relaxed text-[15px]">
                Trustless 6-handed no-limit hold&apos;em for onchain communities.
                Host a private tournament, gate it with NFTs or Coinbase verification,
                and let the smart contract handle the payouts.
              </p>
              <p className="mt-3 text-zinc-500 leading-relaxed text-sm">
                Sponsored tournaments let brands fund prize pools for their community.
                Multi-table tournaments scale up to 18 players with automatic table
                balancing. Zero rake. Zero trust required.
              </p>
              <div className="mt-8">
                <a href="/poker"
                   className="inline-flex items-center gap-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors">
                  <Tv className="w-3.5 h-3.5" />
                  Open lobby
                </a>
              </div>
            </div>
            <FeatureGrid features={homeGameFeatures} iconColor="text-teal-400/60" />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-zinc-800/50" /></div>

      {/* Live Staking */}
      <section id="live-staking" className="py-20 md:py-28 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-medium">Coming soon</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-400">
                Live Staking
              </h2>
              <p className="mt-4 text-zinc-500 leading-relaxed text-[15px]">
                Your poker results, verified on-chain. Build a portable reputation
                that follows you across platforms. Smart contract settlement means
                backers and players both get a fair deal, automatically.
              </p>
              <p className="mt-3 text-zinc-600 leading-relaxed text-sm">
                The $500M+ staking market currently runs on trust and spreadsheets.
                We&apos;re building the infrastructure to fix that.
              </p>
              <div className="mt-8">
                <a href="https://warpcast.com/maxcraicpoker" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
                  <AtSign className="w-3.5 h-3.5" />
                  Follow on Farcaster for updates
                </a>
              </div>
            </div>
            <div className="opacity-40">
              <FeatureGrid features={liveStakingFeatures} iconColor="text-blue-400/40" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/50 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-xs text-zinc-600">Craic Protocol</span>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span>Built on</span>
              <BaseLogo className="w-4 h-4" />
              <span className="text-[#0052FF] font-medium">Base</span>
            </div>
            <a
              href="https://warpcast.com/maxcraicpoker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Farcaster
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
