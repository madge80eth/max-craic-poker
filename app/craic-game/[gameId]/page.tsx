'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Trophy,
  Clock,
  Shield,
  Coins,
  BadgeCheck,
  Loader2,
  Wallet,
  Play,
  Share2,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Image
} from 'lucide-react';
import GlowButton from '@/components/craic/ui/GlowButton';
import NeonBadge from '@/components/craic/ui/NeonBadge';
import { CraicGameConfig, CraicGameStatus, estimateGameTime } from '@/lib/craic/types';

interface GameLobbyState {
  config: CraicGameConfig | null;
  status: CraicGameStatus;
  players: { address: string; name: string; seatIndex: number }[];
  loading: boolean;
  error?: string;
}

export default function GameLobby() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [state, setState] = useState<GameLobbyState>({
    config: null,
    status: 'waiting',
    players: [],
    loading: true,
  });
  const [joining, setJoining] = useState(false);
  const [sybilChecks, setSybilChecks] = useState<{
    checking: boolean;
    passed: boolean;
    results: Record<string, { passed: boolean }>;
    failedChecks: string[];
  }>({
    checking: false,
    passed: true,
    results: {},
    failedChecks: [],
  });
  const [showInfo, setShowInfo] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect
  useEffect(() => {
    if (isConnected || isConnecting) return;
    const isMiniApp = typeof window !== 'undefined' && ((window as any).farcaster || (window as any).base);
    if (isMiniApp && connectors.length > 0) {
      const miniAppConnector = connectors.find(c =>
        c.id === 'farcasterMiniApp' || c.id === 'coinbaseWallet'
      );
      if (miniAppConnector) {
        setIsConnecting(true);
        connect({ connector: miniAppConnector }, {
          onSettled: () => setIsConnecting(false)
        });
      }
    }
  }, [isConnected, isConnecting, connectors, connect]);

  // Fetch game state
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/craic/state?gameId=${gameId}`);
        const data = await res.json();
        if (data.success) {
          setState({
            config: data.config,
            status: data.status,
            players: data.players || [],
            loading: false,
          });
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: data.error || 'Game not found',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch game:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load game',
        }));
      }
    };

    fetchGame();
    const interval = setInterval(fetchGame, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const handleJoin = async () => {
    if (!address || !sybilChecks.passed) return;
    setJoining(true);

    try {
      const res = await fetch('/api/craic/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId: address }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/game/${gameId}/play?playerId=${address}`);
      } else {
        alert(data.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      alert('Failed to join game');
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/game/${gameId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my poker game!',
          text: `Join my Craic Protocol poker game with a ${formatUSDC(state.config?.prizePool || 0)} prize pool!`,
          url,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const formatUSDC = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const isHost = address && state.config?.host.toLowerCase() === address.toLowerCase();
  const isAlreadyJoined = state.players.some(p => p.address.toLowerCase() === address?.toLowerCase());

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-400" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (state.error || !state.config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Game Not Found</h2>
          <p className="text-gray-400 mb-4">This game may have ended or been cancelled.</p>
          <Link href="/">
            <GlowButton variant="ghost">Back to Lobby</GlowButton>
          </Link>
        </div>
      </div>
    );
  }

  const estimatedTime = estimateGameTime(state.config.startingStack, state.config.blindSpeed);

  return (
    <div className="min-h-screen pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Game Lobby</h1>
              <p className="text-xs text-gray-500 font-mono">{gameId.slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                showInfo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
            >
              <Share2 className="w-5 h-5 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Prize Pool Hero */}
        <div className="text-center py-8 bg-gradient-to-b from-yellow-500/10 to-transparent rounded-3xl border border-yellow-500/20">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prize Pool</div>
          <div className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            {formatUSDC(state.config.prizePool)}
          </div>
          <div className="mt-3">
            <NeonBadge variant={state.status === 'waiting' ? 'green' : 'orange'} size="lg" glow>
              {state.status.toUpperCase()}
            </NeonBadge>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
            <div className="text-xs text-gray-400">Players</div>
            <div className="text-sm font-bold">{state.players.length}/{state.config.maxPlayers}</div>
          </div>
          <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-purple-400" />
            <div className="text-xs text-gray-400">Duration</div>
            <div className="text-sm font-bold">~{estimatedTime} min</div>
          </div>
          <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <div className="text-xs text-gray-400">Stack</div>
            <div className="text-sm font-bold">{state.config.startingStack.toLocaleString()}</div>
          </div>
        </div>

        {/* Sybil Requirements */}
        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/30">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">Entry Requirements</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {state.config.sybilOptions.nftGating.enabled && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">NFT Required</span>
                </div>
                {sybilChecks.checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : sybilChecks.results.nft?.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
            {state.config.sybilOptions.bondMechanic.enabled && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">{formatUSDC(state.config.sybilOptions.bondMechanic.amount || 0)} Bond</span>
                </div>
                {sybilChecks.checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : sybilChecks.results.bond?.passed !== false ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
            {state.config.sybilOptions.coinbaseVerification.enabled && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Coinbase Verified</span>
                </div>
                {sybilChecks.checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : sybilChecks.results.coinbase?.passed !== false ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
            {!state.config.sybilOptions.nftGating.enabled &&
             !state.config.sybilOptions.bondMechanic.enabled &&
             !state.config.sybilOptions.coinbaseVerification.enabled && (
              <div className="text-sm text-gray-500">No requirements - anyone can join</div>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/30">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">Players</span>
            </div>
          </div>
          <div className="p-4">
            {state.players.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No players yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {state.players.map((player, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{player.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{player.address.slice(0, 6)}...{player.address.slice(-4)}</div>
                      </div>
                    </div>
                    {i === 0 && (
                      <NeonBadge variant="gold" size="sm">Host</NeonBadge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Game Info Panel */}
        {showInfo && (
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 p-4">
            <h3 className="font-semibold mb-3">Game Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Blind Structure</span>
                <span className="capitalize">{state.config.blindSpeed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Starting Stack</span>
                <span>{state.config.startingStack.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Players</span>
                <span>{state.config.maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bond Amount</span>
                <span>{state.config.bondAmount > 0 ? formatUSDC(state.config.bondAmount) : 'None'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-gray-800/50 pb-safe">
        <div className="max-w-md mx-auto">
          {!isConnected ? (
            <GlowButton
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
              variant="primary"
              size="lg"
              fullWidth
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect Wallet to Join
            </GlowButton>
          ) : sybilChecks.checking ? (
            <GlowButton variant="ghost" size="lg" fullWidth disabled>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Checking Requirements...
            </GlowButton>
          ) : !sybilChecks.passed && sybilChecks.failedChecks.length > 0 ? (
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {sybilChecks.failedChecks[0]}
              </p>
              <GlowButton variant="danger" size="lg" fullWidth disabled>
                Cannot Join
              </GlowButton>
            </div>
          ) : isAlreadyJoined ? (
            <GlowButton
              onClick={() => router.push(`/game/${gameId}/play?playerId=${address}`)}
              variant="secondary"
              size="lg"
              fullWidth
            >
              <Play className="w-5 h-5 mr-2" />
              Enter Game
            </GlowButton>
          ) : (
            <GlowButton
              onClick={handleJoin}
              variant="primary"
              size="lg"
              fullWidth
              loading={joining}
              glow
            >
              {joining ? 'Joining...' : 'Join Game'}
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}
