'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import Link from 'next/link';
import {
  Users,
  Trophy,
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
import { formatUnits } from 'viem';
import { CraicGameInfo } from '@/lib/craic/types';
import { USDC_ADDRESS } from '@/lib/craic/types';

export default function CraicLobby() {
  const { address, isConnected } = useAccount();
  const { hasInjected, isConnecting, manualConnectors, connectWith } = useWalletConnect();
  const router = useRouter();
  const [games, setGames] = useState<CraicGameInfo[]>([]);
  const [loading, setLoading] = useState(true);

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

  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  const formatBuyIn = (game: CraicGameInfo) => {
    if (!game.buyInToken || game.buyInToken === '' || game.buyInAmount === '0') return 'Free';
    const isEth = game.buyInToken === ZERO_ADDR;
    const isUsdc = game.buyInToken.toLowerCase() === USDC_ADDRESS.toLowerCase();
    const decimals = isEth ? 18 : isUsdc ? 6 : 18;
    const symbol = isEth ? 'ETH' : isUsdc ? 'USDC' : game.buyInToken.slice(0, 6) + '…';
    const human = formatUnits(BigInt(game.buyInAmount), decimals);
    return `${human} ${symbol}`;
  };

  return (
    <div className="min-h-screen pb-safe">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative px-4 pt-12 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-4">
              <span className="text-4xl">&#9824;</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1">
              <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                CRAIC HOME GAME
              </span>
            </h1>
            <p className="text-gray-400 text-sm max-w-xs">
              Trustless poker nights for web3 communities
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        {!isConnected ? (
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
              ) : hasInjected ? (
                <GlowButton
                  onClick={() => connectWith('injected')}
                  variant="primary"
                  fullWidth
                >
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </GlowButton>
              ) : (
                <div className="space-y-3">
                  {manualConnectors.map((connector) => (
                    <GlowButton
                      key={connector.id}
                      onClick={() => connectWith(connector.id)}
                      variant="primary"
                      fullWidth
                    >
                      <Wallet className="w-5 h-5" />
                      {connector.name}
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
                <Zap className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Escrow</div>
                <div className="text-xs font-semibold">On-Chain</div>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30 text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-400" />
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
            <Link href="/craic-create">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 to-purple-600/20 border border-emerald-500/30 p-6 mb-6 group hover:border-emerald-500/50 transition-colors cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Plus className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-lg">Host a Game</span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Create a poker night for your community
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
                  Active Games
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
                      href={`/craic-game/${game.gameId}`}
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
                                  {formatBuyIn(game)}
                                </span>
                                <NeonBadge variant={game.status === 'waiting' ? 'green' : 'orange'} size="sm">
                                  {game.status}
                                </NeonBadge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {game.playerCount}/{game.maxPlayersPerTable}
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
                    <li>&#8226; Host creates a game with optional buy-in</li>
                    <li>&#8226; Players join &amp; buy-in goes to on-chain escrow</li>
                    <li>&#8226; Sponsors can add to the prize pool</li>
                    <li>&#8226; Smart contract pays winners automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-600">
              <p>Built on Base &bull; Trustless Escrow &bull; Public Good</p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 text-center">
                <button
                  onClick={async () => {
                    if (!confirm('Delete all games? This cannot be undone.')) return;
                    await fetch('/api/craic/games/clear', { method: 'DELETE' });
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-400 text-xs font-medium rounded-lg transition-colors"
                >
                  🧹 Clear Test Games
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
