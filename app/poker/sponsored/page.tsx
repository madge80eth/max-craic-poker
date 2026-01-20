'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  DollarSign,
  Users,
  Plus,
  Loader2,
  Wallet,
  ArrowLeft,
  Shield,
  Sparkles,
} from 'lucide-react';
import { SponsoredTournament } from '@/lib/poker/sponsored-types';

export default function SponsoredTournamentLobby() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const [tournaments, setTournaments] = useState<SponsoredTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect Farcaster wallet
  useEffect(() => {
    if (isConnected || isConnecting) return;

    const isFarcaster = typeof window !== 'undefined' && (window as any).farcaster;

    if (isFarcaster && connectors.length > 0) {
      const farcasterConnector = connectors.find(
        c => c.id === 'farcasterMiniApp' || c.name.toLowerCase().includes('farcaster')
      );
      if (farcasterConnector) {
        setIsConnecting(true);
        connect(
          { connector: farcasterConnector },
          { onSettled: () => setIsConnecting(false) }
        );
      }
    }
  }, [isConnected, isConnecting, connectors, connect]);

  // Fetch tournaments
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch('/api/poker/sponsored');
        const data = await res.json();
        if (data.success) {
          setTournaments(data.tournaments);
        }
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
    const interval = setInterval(fetchTournaments, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sponsored':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'active':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'pending':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 via-transparent to-emerald-600/20" />

        <div className="relative px-4 pt-6 pb-4">
          <Link
            href="/poker"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Lobby</span>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sponsored Games</h1>
              <p className="text-yellow-400 text-xs font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                BONDED ENTRY • TRUSTLESS PAYOUTS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-8">
        {!isConnected ? (
          /* Connect Wallet Prompt */
          <div className="mt-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Trophy className="w-8 h-8 opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect to Play</h2>
            <p className="text-gray-400 text-sm mb-4">Connect your wallet to join sponsored tournaments</p>

            {isConnecting ? (
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="space-y-2 max-w-xs mx-auto">
                {connectors.map(connector => (
                  <button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* How It Works */}
            <div className="mb-6 p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20">
              <h3 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                How Sponsored Games Work
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Sponsors deposit a prize pool (held in smart contract)</li>
                <li>• Players deposit a refundable bond to enter</li>
                <li>• Play poker - winner takes 65%, 2nd gets 35% of prize</li>
                <li>• Everyone gets their bond back automatically</li>
              </ul>
            </div>

            {/* Create Tournament Button */}
            <Link
              href="/poker/sponsored/create"
              className="w-full mb-6 p-5 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 rounded-2xl font-semibold text-lg shadow-lg shadow-yellow-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Create Sponsored Game
            </Link>

            {/* Tournament List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Available Tournaments
                </h2>
                <span className="text-xs text-gray-500">{tournaments.length} games</span>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-500" />
                  <p className="text-sm text-gray-500">Loading tournaments...</p>
                </div>
              ) : tournaments.length === 0 ? (
                <div className="py-12 text-center bg-gray-800/20 rounded-2xl border border-dashed border-gray-700/50">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/50 flex items-center justify-center">
                    <Trophy className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-gray-400 text-sm mb-1">No sponsored games</p>
                  <p className="text-gray-500 text-xs">Create one to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tournaments.map(tournament => (
                    <Link
                      key={tournament.tournamentId}
                      href={`/poker/sponsored/${tournament.tournamentId}`}
                      className="block p-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-xl border border-gray-700/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              ${(tournament.prizePool / 100).toFixed(0)} Prize Pool
                            </div>
                            <div className="text-xs text-gray-500">
                              ${(tournament.bondAmount / 100).toFixed(0)} bond required
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-[10px] font-medium rounded-full uppercase ${getStatusColor(
                            tournament.status
                          )}`}
                        >
                          {tournament.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tournament.playerCount}/{tournament.maxPlayers} players
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          65/35 payout
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                          style={{
                            width: `${(tournament.playerCount / tournament.maxPlayers) * 100}%`,
                          }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Info Footer */}
            <div className="mt-8 text-center text-xs text-gray-600">
              <p>Smart contract payouts on Base • USDC</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
