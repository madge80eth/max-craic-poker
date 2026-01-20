'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Trophy,
  Shield,
  Plus,
  Loader2,
  Wallet,
  ChevronRight,
  Sparkles,
  Clock,
  Zap
} from 'lucide-react';
import GlowButton from './components/ui/GlowButton';
import NeonBadge from './components/ui/NeonBadge';
import { CraicGameInfo } from '@/lib/craic/types';

export default function CraicLobby() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const [games, setGames] = useState<CraicGameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect Farcaster/Base wallet
  useEffect(() => {
    if (isConnected || isConnecting) return;

    const isMiniApp = typeof window !== 'undefined' &&
      ((window as any).farcaster || (window as any).base);

    if (isMiniApp && connectors.length > 0) {
      const miniAppConnector = connectors.find(c =>
        c.id === 'farcasterMiniApp' ||
        c.id === 'coinbaseWallet' ||
        c.name.toLowerCase().includes('farcaster') ||
        c.name.toLowerCase().includes('coinbase')
      );
      if (miniAppConnector) {
        setIsConnecting(true);
        connect({ connector: miniAppConnector }, {
          onSettled: () => setIsConnecting(false)
        });
      }
    }
  }, [isConnected, isConnecting, connectors, connect]);

  // Fetch active games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/craic/games');
        const data = await res.json();
        if (data.success) setGames(data.games || []);
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatUSDC = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  return (
    <div className="min-h-screen pb-safe">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative px-4 pt-12 pb-8">
          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-4">
              <span className="text-4xl">♠</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1">
              <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                CRAIC PROTOCOL
              </span>
            </h1>
            <p className="text-gray-400 text-sm max-w-xs">
              Trustless poker nights for web3 communities
            </p>

            {/* 0% Fee Badge */}
            <div className="mt-4">
              <NeonBadge variant="gold" size="lg" glow>
                0% Platform Fee
              </NeonBadge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        {!isConnected ? (
          /* Connect Wallet */
          <div className="mt-8">
            <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-3xl p-8 border border-gray-700/50 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Connect to Play</h2>
              <p className="text-gray-400 text-sm mb-6">
                Connect your wallet to host or join games
              </p>

              {isConnecting ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {connectors.map((connector) => (
                    <GlowButton
                      key={connector.id}
                      onClick={() => connect({ connector })}
                      variant="primary"
                      fullWidth
                    >
                      <Wallet className="w-5 h-5" />
                      Connect {connector.name}
                    </GlowButton>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30 text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Sybil</div>
                <div className="text-xs font-semibold">Protected</div>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Payouts</div>
                <div className="text-xs font-semibold">Trustless</div>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Tables</div>
                <div className="text-xs font-semibold">6 Max</div>
              </div>
            </div>

            {/* Create Game CTA */}
            <Link href="/create">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 to-purple-600/20 border border-emerald-500/30 p-6 mb-6 group hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />

                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Plus className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-lg">Host a Game</span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Create a private poker night for your community
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                    <ChevronRight className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Active Games */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Your Active Games
                </h2>
                <span className="text-xs text-gray-500">{games.length} games</span>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-500" />
                  <p className="text-sm text-gray-500">Loading games...</p>
                </div>
              ) : games.length === 0 ? (
                <div className="py-12 text-center bg-gray-800/20 rounded-2xl border border-dashed border-gray-700/50">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/50 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm mb-1">No active games</p>
                  <p className="text-gray-500 text-xs">
                    Host a game or join via an invite link
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <Link
                      key={game.gameId}
                      href={`/game/${game.gameId}`}
                      className="block"
                    >
                      <div className="p-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-xl border border-gray-700/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/30 to-purple-600/30 flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-sm">
                                  {formatUSDC(game.prizePool)} Prize Pool
                                </span>
                                <NeonBadge variant={game.status === 'waiting' ? 'green' : 'orange'} size="sm">
                                  {game.status}
                                </NeonBadge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {game.playerCount}/{game.maxPlayers}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {game.blindSpeed}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="mt-8 p-4 bg-gray-800/20 rounded-2xl border border-gray-700/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">How it works</h3>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>• Host deposits prize pool in USDC</li>
                    <li>• Players join via private link</li>
                    <li>• Optional: NFT gating, bonds, Coinbase verification</li>
                    <li>• Smart contract pays winners automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-600">
              <p>Built on Base • 0% Platform Fee • Public Good</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
