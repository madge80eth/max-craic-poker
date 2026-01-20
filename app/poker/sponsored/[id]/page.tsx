'use client';

import { useState, useEffect, use } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  DollarSign,
  Users,
  ArrowLeft,
  Loader2,
  Wallet,
  CheckCircle,
  Play,
  Shield,
  Clock,
} from 'lucide-react';
import {
  SponsoredTournament,
  CONTRACTS,
  ERC20_ABI,
  SPONSORED_TOURNAMENT_ABI,
  centsToUsdc,
} from '@/lib/poker/sponsored-types';
import { ClientGameState } from '@/lib/poker/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SponsoredTournamentPage({ params }: PageProps) {
  const { id: tournamentId } = use(params);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const [tournament, setTournament] = useState<SponsoredTournament | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'view' | 'approve' | 'join' | 'done'>('view');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contract writes
  const { writeContract: approveUsdc, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: enterTournament, data: enterHash, isPending: isEntering } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: isEnterConfirming, isSuccess: isEnterConfirmed } = useWaitForTransactionReceipt({
    hash: enterHash,
  });

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

  // Set default player name
  useEffect(() => {
    if (address && !playerName) {
      setPlayerName(`Player_${address.slice(2, 6)}`);
    }
  }, [address, playerName]);

  // Fetch tournament data
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/poker/sponsored/${tournamentId}?playerId=${address || ''}`);
        const data = await res.json();

        if (data.success) {
          setTournament(data.tournament);
          setGameState(data.gameState);
        }
      } catch (error) {
        console.error('Failed to fetch tournament:', error);
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournament();
      const interval = setInterval(fetchTournament, 2000);
      return () => clearInterval(interval);
    }
  }, [tournamentId, address]);

  // Handle approve confirmation
  useEffect(() => {
    if (isApproveConfirmed) {
      setStep('join');
      handleEnterOnChain();
    }
  }, [isApproveConfirmed]);

  // Handle enter confirmation
  useEffect(() => {
    if (isEnterConfirmed) {
      setStep('done');
    }
  }, [isEnterConfirmed]);

  const handleJoinTournament = async () => {
    if (!address || selectedSeat === null || !tournament) return;

    setError(null);
    setJoining(true);

    try {
      // If contract is deployed, do on-chain approval + entry
      if (CONTRACTS.SPONSORED_TOURNAMENT !== '0x0000000000000000000000000000000000000000') {
        setStep('approve');

        // Approve USDC spend for bond
        const bondUsdc = centsToUsdc(tournament.bondAmount);
        approveUsdc({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.SPONSORED_TOURNAMENT, bondUsdc],
        });
      } else {
        // Contract not deployed - just update backend
        const res = await fetch(`/api/poker/sponsored/${tournamentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'enter',
            playerId: address,
            playerName,
            seatIndex: selectedSeat,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Failed to join');
          setJoining(false);
          return;
        }

        setTournament(data.tournament);
        setStep('done');
      }
    } catch (err) {
      console.error('Join tournament error:', err);
      setError(err instanceof Error ? err.message : 'Failed to join');
      setJoining(false);
    }
  };

  const handleEnterOnChain = () => {
    if (!tournament || selectedSeat === null) return;

    enterTournament({
      address: CONTRACTS.SPONSORED_TOURNAMENT,
      abi: SPONSORED_TOURNAMENT_ABI,
      functionName: 'enterTournament',
      args: [tournamentId as `0x${string}`, BigInt(selectedSeat)],
    });
  };

  const handlePlayGame = () => {
    if (!tournament) return;
    router.push(`/poker/${tournament.tableId}?playerId=${address}&playerName=${encodeURIComponent(playerName)}`);
  };

  const isPlayerJoined =
    tournament && address && tournament.players.some(p => p.wallet.toLowerCase() === address.toLowerCase());

  const availableSeats =
    tournament &&
    Array.from({ length: tournament.maxPlayers }, (_, i) => i).filter(
      seat => !tournament.players.some(p => p.seatIndex === seat)
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-4">
        <Link
          href="/poker/sponsored"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
        <div className="text-center mt-12">
          <p className="text-gray-400">Tournament not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-800/50">
        <Link
          href="/poker/sponsored"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">${(tournament.prizePool / 100).toFixed(0)} Tournament</h1>
              <p className="text-gray-400 text-xs">
                {tournament.playerCount}/{tournament.maxPlayers} players •{' '}
                ${(tournament.bondAmount / 100).toFixed(0)} bond
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs font-medium rounded-full uppercase ${
              tournament.status === 'sponsored'
                ? 'bg-emerald-500/20 text-emerald-400'
                : tournament.status === 'active'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {tournament.status}
          </span>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Prize Info */}
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-yellow-400">Trustless Payouts</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">1st Place Wins</p>
              <p className="text-lg font-bold text-white">
                ${(Math.floor((tournament.prizePool * 65) / 100) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">+ bond back</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">2nd Place Wins</p>
              <p className="text-lg font-bold text-white">
                ${(Math.floor((tournament.prizePool * 35) / 100) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">+ bond back</p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Players ({tournament.playerCount}/{tournament.maxPlayers})
          </h2>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: tournament.maxPlayers }, (_, seatIndex) => {
              const player = tournament.players.find(p => p.seatIndex === seatIndex);
              const isYou = player && address && player.wallet.toLowerCase() === address.toLowerCase();

              return (
                <div
                  key={seatIndex}
                  onClick={() => {
                    if (!player && !isPlayerJoined && tournament.status === 'sponsored') {
                      setSelectedSeat(seatIndex);
                    }
                  }}
                  className={`p-3 rounded-xl text-center transition-all ${
                    player
                      ? 'bg-gray-800/50 border border-gray-700/50'
                      : selectedSeat === seatIndex
                      ? 'bg-yellow-500/20 border-2 border-yellow-500 cursor-pointer'
                      : tournament.status === 'sponsored' && !isPlayerJoined
                      ? 'bg-gray-800/30 border border-dashed border-gray-700/50 cursor-pointer hover:border-yellow-500/50'
                      : 'bg-gray-800/30 border border-dashed border-gray-700/50'
                  }`}
                >
                  {player ? (
                    <>
                      <div
                        className={`w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center text-sm font-bold ${
                          isYou
                            ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                            : 'bg-gradient-to-br from-purple-500 to-pink-500'
                        }`}
                      >
                        {(player.name || player.wallet.slice(2, 4)).charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-medium truncate">
                        {player.name || `${player.wallet.slice(0, 6)}...`}
                      </p>
                      {isYou && <p className="text-[10px] text-yellow-400">You</p>}
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-gray-700/50 flex items-center justify-center">
                        <span className="text-xs text-gray-500">#{seatIndex + 1}</span>
                      </div>
                      <p className="text-xs text-gray-500">Empty</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Area */}
        {!isConnected ? (
          <div className="space-y-2">
            {connectors.map(connector => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect to Join
              </button>
            ))}
          </div>
        ) : isPlayerJoined ? (
          tournament.status === 'active' || tournament.status === 'sponsored' ? (
            <button
              onClick={handlePlayGame}
              className="w-full p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-2xl font-semibold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5" />
              {tournament.status === 'active' ? 'Play Now' : 'Join Table'}
            </button>
          ) : (
            <div className="p-4 bg-gray-800/50 rounded-xl text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 font-medium">You're in!</p>
              <p className="text-gray-400 text-sm">Waiting for more players...</p>
            </div>
          )
        ) : tournament.status === 'sponsored' ? (
          step === 'view' ? (
            <div className="space-y-4">
              {/* Player Name */}
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <label className="block text-xs text-gray-400 mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  className="w-full bg-gray-900/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  placeholder="Enter your name"
                  maxLength={15}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/30">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Join Button */}
              <button
                onClick={handleJoinTournament}
                disabled={selectedSeat === null || joining}
                className="w-full p-4 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-2xl font-semibold text-lg shadow-lg shadow-yellow-500/25 transition-all flex items-center justify-center gap-3"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : selectedSeat === null ? (
                  'Select a Seat'
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Join (${(tournament.bondAmount / 100).toFixed(0)} Bond)
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-500">
                Bond is fully refundable - you get it back after the game
              </p>
            </div>
          ) : step === 'approve' ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
              <p className="font-semibold mb-2">Approving USDC</p>
              <p className="text-gray-400 text-sm">Confirm in your wallet</p>
            </div>
          ) : step === 'join' ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
              <p className="font-semibold mb-2">Joining Tournament</p>
              <p className="text-gray-400 text-sm">Confirm bond deposit</p>
            </div>
          ) : step === 'done' ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="font-semibold mb-2">You're In!</p>
              <button
                onClick={handlePlayGame}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl font-semibold"
              >
                Join Table
              </button>
            </div>
          ) : null
        ) : (
          <div className="p-4 bg-gray-800/50 rounded-xl text-center">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">Tournament not open for entry</p>
          </div>
        )}

        {/* Completed Tournament Results */}
        {tournament.status === 'completed' && (
          <div className="mt-6 p-4 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20">
            <h3 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Final Results
            </h3>

            <div className="space-y-2">
              {tournament.winner && (
                <div className="flex justify-between items-center p-2 bg-yellow-500/10 rounded-lg">
                  <span className="text-yellow-400 font-medium">🥇 1st Place</span>
                  <span className="text-white">
                    {tournament.winner.slice(0, 6)}...{tournament.winner.slice(-4)}
                    <span className="text-emerald-400 ml-2">
                      +${((tournament.winnerPayout || 0) / 100).toFixed(2)}
                    </span>
                  </span>
                </div>
              )}

              {tournament.second && (
                <div className="flex justify-between items-center p-2 bg-gray-500/10 rounded-lg">
                  <span className="text-gray-400 font-medium">🥈 2nd Place</span>
                  <span className="text-white">
                    {tournament.second.slice(0, 6)}...{tournament.second.slice(-4)}
                    <span className="text-emerald-400 ml-2">
                      +${((tournament.secondPayout || 0) / 100).toFixed(2)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
