'use client';

import Image from 'next/image';
import GlowButton from '../craic-home/components/ui/GlowButton';
import NeonBadge from '../craic-home/components/ui/NeonBadge';
import {
  ChevronDown,
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
    description:
      'Creator monetization through live poker content. Viewers enter free raffles for profit-share in tournament results. Real USDC payouts.',
    color: 'purple' as const,
    icon: Tv,
    status: 'LIVE' as const,
  },
  {
    id: 'home-game',
    name: 'Home Game',
    tagline: 'Community poker, trustless settlement',
    description:
      'Trustless 6-handed tournaments for onchain communities. Smart contract payouts, sybil protection built in. Zero rake.',
    color: 'emerald' as const,
    icon: Users,
    status: 'LIVE' as const,
  },
  {
    id: 'live-staking',
    name: 'Live Staking',
    tagline: 'Portable reputation. Trustless backing.',
    description:
      'On-chain poker credentials and portable reputation. Smart contract settlement between players and backers.',
    color: 'blue' as const,
    icon: TrendingUp,
    status: 'COMING SOON' as const,
  },
];

const mcpFeatures = [
  {
    icon: Ticket,
    title: 'Daily Raffle Draw',
    desc: 'Enter free, win a share when the creator cashes tournaments',
  },
  {
    icon: DollarSign,
    title: 'USDC Payouts',
    desc: 'Winners paid automatically on Base. No tokens, no points.',
  },
  {
    icon: Trophy,
    title: 'Hand of the Hour',
    desc: 'Best poker hand each hour wins bonus raffle tickets',
  },
  {
    icon: Heart,
    title: 'Tipping & Memberships',
    desc: 'Tip the stream, subscribe for perks, climb the leaderboard',
  },
];

const homeGameFeatures = [
  {
    icon: Shield,
    title: 'Sybil Protected',
    desc: 'Coinbase verification, NFT gating, Farcaster, .base.eth',
  },
  {
    icon: Users,
    title: '6-Max Tables',
    desc: 'Real-time no-limit hold\'em with up to 6 players per table',
  },
  {
    icon: Coins,
    title: 'Bonding Mechanism',
    desc: 'Refundable USDC deposits keep games honest',
  },
  {
    icon: Trophy,
    title: 'Multi-Table Tournaments',
    desc: '18-player MTTs with automatic table balancing',
  },
];

const liveStakingFeatures = [
  {
    icon: BadgeCheck,
    title: 'On-Chain Credentials',
    desc: 'Verified tournament results stored on Base',
  },
  {
    icon: TrendingUp,
    title: 'Portable Reputation',
    desc: 'Your track record follows you across platforms',
  },
  {
    icon: FileText,
    title: 'Smart Settlements',
    desc: 'Automated backer/player splits via smart contract',
  },
  {
    icon: Lock,
    title: 'Trustless Staking',
    desc: 'No middlemen. Stake and settle peer-to-peer.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const colorMap = {
  purple: {
    iconBg: 'bg-purple-500/20',
    iconText: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/30',
    featureIcon: 'text-purple-400',
  },
  emerald: {
    iconBg: 'bg-emerald-500/20',
    iconText: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/30',
    featureIcon: 'text-emerald-400',
  },
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/30',
    featureIcon: 'text-blue-400',
  },
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/mcp-logo.png"
              alt="Craic Protocol"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent font-black tracking-tight text-lg">
              CRAIC PROTOCOL
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <button
              onClick={() => scrollTo('products')}
              className="hover:text-white transition-colors"
            >
              Products
            </button>
            <a
              href="https://warpcast.com/maxcraicpoker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400 transition-colors"
            >
              <AtSign className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Ambient blurs */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 w-60 h-60 bg-blue-500/5 rounded-full blur-[80px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <NeonBadge variant="purple" size="lg" glow>
            BUILT ON BASE
          </NeonBadge>

          <h1 className="mt-6 text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            <span className="text-white">Poker infrastructure</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              for onchain communities
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            From creator monetization to trustless home games to portable player
            reputation. Three products. One protocol. Zero rake.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <GlowButton
              variant="primary"
              size="lg"
              onClick={() => scrollTo('products')}
            >
              Explore Products
            </GlowButton>
            <GlowButton
              variant="ghost"
              size="lg"
              onClick={() => scrollTo('live-staking')}
            >
              Live Staking — Coming Soon
            </GlowButton>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-500" />
        </div>
      </section>

      {/* ── Product Cards ───────────────────────────────────── */}
      <section id="products" className="py-24 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl md:text-4xl font-black mb-4">
            The Ecosystem
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">
            Three products addressing different parts of the poker value chain —
            all settling on Base.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((product) => {
              const colors = colorMap[product.color];
              const Icon = product.icon;
              return (
                <button
                  key={product.id}
                  onClick={() => scrollTo(product.id)}
                  className={`group relative text-left bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30 ${colors.hoverBorder} rounded-2xl p-8 transition-all duration-300`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-5`}
                  >
                    <Icon className={`w-7 h-7 ${colors.iconText}`} />
                  </div>

                  <NeonBadge
                    variant={product.status === 'LIVE' ? 'green' : 'gray'}
                    size="sm"
                    glow={product.status === 'LIVE'}
                  >
                    {product.status}
                  </NeonBadge>

                  <h3 className="mt-3 text-xl font-bold">{product.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 italic">
                    {product.tagline}
                  </p>
                  <p className="mt-2 text-gray-400 text-sm leading-relaxed">
                    {product.description}
                  </p>

                  <div
                    className={`mt-5 flex items-center gap-2 ${colors.iconText} text-sm font-medium group-hover:gap-3 transition-all`}
                  >
                    Learn more <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Max Craic Poker Detail ──────────────────────────── */}
      <section
        id="max-craic-poker"
        className="py-24 px-6 border-t border-gray-800/50 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeonBadge variant="green" glow>
                LIVE
              </NeonBadge>
              <h2 className="mt-4 text-3xl md:text-4xl font-black">
                Max Craic Poker
              </h2>
              <p className="mt-4 text-gray-400 text-lg leading-relaxed">
                The original. A creator monetization and engagement platform
                built around live poker. Viewers enter free daily raffles for a
                share of tournament profits — paid out automatically in USDC on
                Base.
              </p>
              <p className="mt-3 text-gray-500 leading-relaxed">
                Hand of the Hour competitions, tipping, memberships, and video
                content keep the community engaged between sessions. The creator
                plays, the community profits.
              </p>
              <div className="mt-8">
                <a
                  href="https://maxcraicpoker.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GlowButton variant="secondary" size="md">
                    <ExternalLink className="w-4 h-4" />
                    Visit maxcraicpoker.com
                  </GlowButton>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {mcpFeatures.map((f) => (
                <div
                  key={f.title}
                  className="p-5 bg-gray-800/30 rounded-xl border border-gray-700/30"
                >
                  <f.icon className="w-6 h-6 text-purple-400 mb-3" />
                  <h4 className="font-semibold text-sm">{f.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Home Game Detail ────────────────────────────────── */}
      <section
        id="home-game"
        className="py-24 px-6 border-t border-gray-800/50 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeonBadge variant="green" glow>
                LIVE
              </NeonBadge>
              <h2 className="mt-4 text-3xl md:text-4xl font-black">
                Home Game
              </h2>
              <p className="mt-4 text-gray-400 text-lg leading-relaxed">
                Trustless 6-handed no-limit hold&apos;em for onchain
                communities. Host a private tournament, gate it with NFTs or
                Coinbase verification, and let the smart contract handle the
                payouts.
              </p>
              <p className="mt-3 text-gray-500 leading-relaxed">
                Sponsored tournaments let brands fund prize pools for their
                community. Multi-table tournaments scale up to 18 players with
                automatic table balancing. Zero rake. Zero trust required.
              </p>
              <div className="mt-8">
                <a href="/poker">
                  <GlowButton variant="primary" size="md">
                    <Users className="w-4 h-4" />
                    Open Lobby
                  </GlowButton>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {homeGameFeatures.map((f) => (
                <div
                  key={f.title}
                  className="p-5 bg-gray-800/30 rounded-xl border border-gray-700/30"
                >
                  <f.icon className="w-6 h-6 text-emerald-400 mb-3" />
                  <h4 className="font-semibold text-sm">{f.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Staking Detail ─────────────────────────────── */}
      <section
        id="live-staking"
        className="py-24 px-6 border-t border-gray-800/50 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <NeonBadge variant="gray">COMING SOON</NeonBadge>
              <h2 className="mt-4 text-3xl md:text-4xl font-black">
                Live Staking
              </h2>
              <p className="mt-4 text-gray-400 text-lg leading-relaxed">
                Your poker results, verified on-chain. Build a portable
                reputation that follows you across platforms. Smart contract
                settlement means backers and players both get a fair deal —
                automatically.
              </p>
              <p className="mt-3 text-gray-500 leading-relaxed">
                The $500M+ staking market currently runs on trust and
                spreadsheets. We&apos;re building the infrastructure to fix
                that.
              </p>
              <div className="mt-8">
                <a
                  href="https://warpcast.com/maxcraicpoker"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GlowButton variant="ghost" size="md">
                    <AtSign className="w-4 h-4" />
                    Follow on Farcaster for Updates
                  </GlowButton>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 opacity-60">
              {liveStakingFeatures.map((f) => (
                <div
                  key={f.title}
                  className="p-5 bg-gray-800/30 rounded-xl border border-gray-700/30"
                >
                  <f.icon className="w-6 h-6 text-blue-400 mb-3" />
                  <h4 className="font-semibold text-sm">{f.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/mcp-logo.png"
                alt="Craic Protocol"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-gray-400">Craic Protocol</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              Powered by{' '}
              <span className="font-semibold text-blue-400">Base</span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://warpcast.com/maxcraicpoker"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-purple-400 transition-colors"
              >
                <AtSign className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-600">
            Zero rake. Public good. Built on Base.
          </div>
        </div>
      </footer>
    </div>
  );
}
