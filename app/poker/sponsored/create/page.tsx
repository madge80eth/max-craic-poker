'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseUnits } from 'viem';
import {
  Trophy,
  DollarSign,
  Users,
  ArrowLeft,
  Loader2,
  Wallet,
  Info,
  CheckCircle,
} from 'lucide-react';
import {
  CONTRACTS,
  ERC20_ABI,
  SPONSORED_TOURNAMENT_ABI,
  centsToUsdc,
} from '@/lib/poker/sponsored-types';

export default function CreateSponsoredTournament() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const [bondAmount, setBondAmount] = useState(1000); // $10 default
  const [prizePool, setPrizePool] = useState(5000); // $50 default
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'setup' | 'approve' | 'create' | 'done'>('setup');
  const [error, setError] = useState<string | null>(null);
  const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contract writes
  const { writeContract: approveUsdc, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: createTournament, data: createHash, isPending: isCreating } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  const { isLoading: isCreateConfirming, isSuccess: isCreateConfirmed } = useWaitForTransactionReceipt({
    hash: createHash,
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
      setPlayerName(`Sponsor_${address.slice(2, 6)}`);
    }
  }, [address, playerName]);

  // Handle approve confirmation
  useEffect(() => {
    if (isApproveConfirmed) {
      setStep('create');
    }
  }, [isApproveConfirmed]);

  // Handle create confirmation
  useEffect(() => {
    if (isCreateConfirmed && createdTournamentId) {
      setStep('done');
    }
  }, [isCreateConfirmed, createdTournamentId]);

  const handleCreateTournament = async () => {
    if (!address) return;

    setError(null);

    try {
      // First, create tournament in backend
      const res = await fetch('/api/poker/sponsored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: address,
          creatorName: playerName,
          bondAmount,
          prizePool,
          maxPlayers,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to create tournament');
        return;
      }

      setCreatedTournamentId(data.tournamentId);

      // If contract is deployed, do on-chain approval + sponsorship
      if (CONTRACTS.SPONSORED_TOURNAMENT !== '0x0000000000000000000000000000000000000000') {
        setStep('approve');

        // Approve USDC spend
        const prizePoolUsdc = centsToUsdc(prizePool);
        approveUsdc({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.SPONSORED_TOURNAMENT, prizePoolUsdc],
        });
      } else {
        // Contract not deployed yet - skip on-chain steps
        setStep('done');
      }
    } catch (err) {
      console.error('Create tournament error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
  };

  const handleSponsorOnChain = () => {
    if (!createdTournamentId) return;

    const prizePoolUsdc = centsToUsdc(prizePool);

    createTournament({
      address: CONTRACTS.SPONSORED_TOURNAMENT,
      abi: SPONSORED_TOURNAMENT_ABI,
      functionName: 'sponsorTournament',
      args: [createdTournamentId as `0x${string}`, prizePoolUsdc],
    });
  };

  // Calculate payouts
  const winnerPayout = Math.floor((prizePool * 65) / 100);
  const secondPayout = Math.floor((prizePool * 35) / 100);

  if (!isConnected) {
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
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
            <Trophy className="w-8 h-8 opacity-50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect to Create</h2>
          <p className="text-gray-400 text-sm mb-4">Connect your wallet to sponsor a tournament</p>

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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <Link
          href="/poker/sponsored"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>

        <h1 className="text-2xl font-bold">Create Sponsored Game</h1>
        <p className="text-gray-400 text-sm mt-1">Set up a prize pool tournament</p>
      </div>

      <div className="px-4 pb-8">
        {step === 'setup' && (
          <div className="space-y-6">
            {/* Prize Pool */}
            <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-3 h-3 text-yellow-400" />
                Prize Pool (USDC)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  value={prizePool / 100}
                  onChange={e => setPrizePool(Math.max(10, parseFloat(e.target.value) || 0) * 100)}
                  className="flex-1 bg-gray-900/50 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500/50 border border-gray-700/50"
                  min="10"
                  step="5"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[25, 50, 100, 250].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setPrizePool(amount * 100)}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      prizePool === amount * 100
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Bond Amount */}
            <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-emerald-400" />
                Player Bond (Refundable)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  value={bondAmount / 100}
                  onChange={e => setBondAmount(Math.max(1, parseFloat(e.target.value) || 0) * 100)}
                  className="flex-1 bg-gray-900/50 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-gray-700/50"
                  min="1"
                  step="1"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[5, 10, 25, 50].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBondAmount(amount * 100)}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      bondAmount === amount * 100
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Players */}
            <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3 h-3 text-purple-400" />
                Max Players
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(count => (
                  <button
                    key={count}
                    onClick={() => setMaxPlayers(count)}
                    className={`flex-1 py-3 text-lg font-semibold rounded-xl transition-colors ${
                      maxPlayers === count
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Preview */}
            <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20">
              <h3 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Payout Structure
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">1st Place</span>
                  <span className="text-white font-semibold">
                    ${(winnerPayout / 100).toFixed(2)} + bond back
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">2nd Place</span>
                  <span className="text-white font-semibold">
                    ${(secondPayout / 100).toFixed(2)} + bond back
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">3rd-{maxPlayers}th</span>
                  <span className="text-white font-semibold">Bond returned</span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateTournament}
              className="w-full p-4 bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 rounded-2xl font-semibold text-lg shadow-lg shadow-yellow-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Trophy className="w-5 h-5" />
              Create & Fund Tournament
              <span className="text-yellow-200/80 text-sm">
                (${(prizePool / 100).toFixed(0)})
              </span>
            </button>

            <p className="text-center text-xs text-gray-500">
              You'll deposit ${(prizePool / 100).toFixed(2)} USDC as the prize pool
            </p>
          </div>
        )}

        {step === 'approve' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Approving USDC</h2>
            <p className="text-gray-400 text-sm mb-4">
              Please confirm the approval transaction in your wallet
            </p>
            {isApproveConfirming && (
              <p className="text-yellow-400 text-sm">Waiting for confirmation...</p>
            )}

            {isApproveConfirmed && (
              <button
                onClick={handleSponsorOnChain}
                disabled={isCreating || isCreateConfirming}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-500 rounded-xl font-semibold"
              >
                {isCreating || isCreateConfirming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Sponsoring...
                  </>
                ) : (
                  'Sponsor Tournament'
                )}
              </button>
            )}
          </div>
        )}

        {step === 'create' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Creating Tournament</h2>
            <p className="text-gray-400 text-sm mb-4">
              Please confirm the sponsorship transaction
            </p>

            <button
              onClick={handleSponsorOnChain}
              disabled={isCreating || isCreateConfirming}
              className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-500 rounded-xl font-semibold disabled:opacity-50"
            >
              {isCreating || isCreateConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  Confirming...
                </>
              ) : (
                'Confirm Sponsorship'
              )}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Tournament Created!</h2>
            <p className="text-gray-400 text-sm mb-6">
              Your ${(prizePool / 100).toFixed(0)} tournament is ready for players
            </p>

            <div className="space-y-3">
              <Link
                href={`/poker/sponsored/${createdTournamentId}`}
                className="block w-full p-4 bg-gradient-to-r from-yellow-600 to-orange-500 rounded-xl font-semibold text-center"
              >
                View Tournament
              </Link>

              <Link
                href="/poker/sponsored"
                className="block w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl font-semibold text-center transition-colors"
              >
                Back to Lobby
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
