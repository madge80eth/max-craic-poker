'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Shield,
  DollarSign,
  Image,
  Wallet,
  BadgeCheck,
  Loader2,
  Sparkles,
  Zap,
  Gamepad2,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  CreateGameFormState,
  DEFAULT_CREATE_FORM,
  BlindSpeed,
  estimateGameTime,
} from '@/lib/craic/types';
import {
  CONTRACTS,
  SPONSORED_TOURNAMENT_ABI,
  ERC20_ABI,
  centsToUsdc,
} from '@/lib/poker/sponsored-types';

type GameType = 'fun' | 'sponsored';
type WizardStep = 'type' | 'prize' | 'fund' | 'settings' | 'sybil' | 'confirm';

function getSteps(gameType: GameType | null): { id: WizardStep; title: string; icon: React.ReactNode }[] {
  const steps: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
    { id: 'type', title: 'Game Type', icon: <Gamepad2 className="w-5 h-5" /> },
  ];
  if (gameType === 'sponsored') {
    steps.push({ id: 'prize', title: 'Prize Pool', icon: <DollarSign className="w-5 h-5" /> });
    steps.push({ id: 'fund', title: 'Fund Escrow', icon: <Wallet className="w-5 h-5" /> });
  }
  steps.push({ id: 'settings', title: 'Game Settings', icon: <Clock className="w-5 h-5" /> });
  steps.push({ id: 'sybil', title: 'Sybil Protection', icon: <Shield className="w-5 h-5" /> });
  steps.push({ id: 'confirm', title: 'Confirm', icon: <Check className="w-5 h-5" /> });
  return steps;
}

const CONTRACT_DEPLOYED = CONTRACTS.SPONSORED_TOURNAMENT !== '0x0000000000000000000000000000000000000000';

type FundingPhase = 'idle' | 'approving' | 'approved' | 'depositing' | 'deposited' | 'error';

export default function CreateGameWizard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get player info from URL params (passed from /poker lobby)
  const urlPlayerId = searchParams.get('playerId');
  const urlPlayerName = searchParams.get('playerName');

  const [step, setStep] = useState<WizardStep>('type');
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [form, setForm] = useState<CreateGameFormState>(DEFAULT_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [scheduledStart, setScheduledStart] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Sponsored funding state
  const [fundingPhase, setFundingPhase] = useState<FundingPhase>('idle');
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [sponsoredTournamentId, setSponsoredTournamentId] = useState<string | null>(null);
  const [sponsoredTableId, setSponsoredTableId] = useState<string | null>(null);

  // Contract write hooks
  const { writeContract: writeApprove, data: approveTxHash, isPending: isApproving } = useWriteContract();
  const { writeContract: writeSponsor, data: sponsorTxHash, isPending: isSponsoring } = useWriteContract();

  // Wait for tx receipts
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: sponsorConfirmed } = useWaitForTransactionReceipt({ hash: sponsorTxHash });

  const STEPS = getSteps(gameType);
  const stepIndex = STEPS.findIndex(s => s.id === step);

  // Auto-connect in mini-app context
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

  // Track approval confirmation
  useEffect(() => {
    if (approveConfirmed && fundingPhase === 'approving') {
      setFundingPhase('approved');
    }
  }, [approveConfirmed, fundingPhase]);

  // Track sponsor confirmation
  useEffect(() => {
    if (sponsorConfirmed && fundingPhase === 'depositing') {
      setFundingPhase('deposited');
    }
  }, [sponsorConfirmed, fundingPhase]);

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].id);
    }
  };

  const goBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].id);
    } else {
      router.push('/poker');
    }
  };

  const selectGameType = (type: GameType) => {
    setGameType(type);
    if (type === 'fun') {
      setForm({ ...form, prizePool: 0 });
      setStep('settings');
    } else {
      setStep('prize');
    }
  };

  // Step 1 of funding: approve USDC spend
  const handleApproveUsdc = () => {
    if (!address || form.prizePool <= 0) return;
    setFundingError(null);
    setFundingPhase('approving');

    const usdcAmount = centsToUsdc(form.prizePool);

    try {
      writeApprove({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.SPONSORED_TOURNAMENT, usdcAmount],
      });
    } catch (err) {
      setFundingPhase('error');
      setFundingError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  // Step 2 of funding: deposit to contract
  const handleDepositToContract = () => {
    if (!sponsoredTournamentId || form.prizePool <= 0) return;
    setFundingError(null);
    setFundingPhase('depositing');

    const usdcAmount = centsToUsdc(form.prizePool);

    try {
      writeSponsor({
        address: CONTRACTS.SPONSORED_TOURNAMENT,
        abi: SPONSORED_TOURNAMENT_ABI,
        functionName: 'sponsorTournament',
        args: [sponsoredTournamentId as `0x${string}`, usdcAmount],
      });
    } catch (err) {
      setFundingPhase('error');
      setFundingError(err instanceof Error ? err.message : 'Deposit failed');
    }
  };

  // Create the backend tournament record (called when entering fund step)
  const createSponsoredBackend = async () => {
    if (!address || sponsoredTournamentId) return; // already created

    try {
      const res = await fetch('/api/poker/sponsored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: address,
          creatorName: `Player_${address.slice(2, 6)}`,
          prizePool: form.prizePool,
          bondAmount: 0,
          maxPlayers: 6,
          startingStack: form.startingStack,
          blindSpeed: form.blindSpeed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSponsoredTournamentId(data.tournamentId);
        setSponsoredTableId(data.tableId);
      } else {
        setFundingError(data.error || 'Failed to create tournament');
      }
    } catch (err) {
      setFundingError(err instanceof Error ? err.message : 'Network error');
    }
  };

  // When entering the fund step, create the backend record
  useEffect(() => {
    if (step === 'fund' && !sponsoredTournamentId && address) {
      createSponsoredBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, address]);

  const handleCreate = async () => {
    // Use URL params if available, otherwise fall back to wallet address
    const playerId = urlPlayerId || address;
    const playerName = urlPlayerName || (address ? `Player_${address.slice(2, 6)}` : 'Player');

    if (!playerId) return;
    setCreating(true);

    try {
      if (gameType === 'sponsored' && sponsoredTableId) {
        // Sponsored game already created in backend during fund step
        // Navigate directly to the table
        router.push(`/poker/${sponsoredTableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`);
      } else {
        // Fun game: create via /api/poker/create (no contract interaction)
        // Calculate scheduled start time if set
        let scheduledStartTime: number | undefined;
        if (scheduledStart && scheduledDate && scheduledTime) {
          const scheduled = new Date(`${scheduledDate}T${scheduledTime}:00Z`);
          scheduledStartTime = scheduled.getTime();
        }

        const res = await fetch('/api/poker/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: playerId,
            creatorName: playerName,
            tableName: `${playerName}'s Table`,
            startingChips: form.startingStack,
            blindIntervalMinutes: form.blindSpeed === 'turbo' ? 5 : form.blindSpeed === 'deep' ? 15 : 10,
            ...(scheduledStartTime ? { scheduledStartTime } : {}),
            ...(Object.values(form.sybilOptions).some((v: any) => v.enabled) ? { sybilResistance: form.sybilOptions } : {}),
          }),
        });
        const data = await res.json();
        if (data.success) {
          router.push(`/poker/${data.tableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`);
        } else {
          alert(data.error || 'Failed to create game');
        }
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const estimatedTime = estimateGameTime(form.startingStack, form.blindSpeed);
  const formatUSDC = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // For free games, allow guests (via URL params). Sponsored games require wallet.
  const canCreateFreeGame = urlPlayerId && urlPlayerName;

  // Wallet connect screen - only show for sponsored games without a connected wallet
  if (!isConnected && !canCreateFreeGame) {
    return (
      <div className="min-h-screen bg-[#0d1117] pb-safe flex items-center justify-center p-4">
        <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 text-center max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
          <p className="text-gray-400 text-sm mb-6">Connect a wallet or go back to lobby</p>
          {isConnecting ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Connect {connector.name}
                </button>
              ))}
              <button
                onClick={() => router.push('/poker')}
                className="w-full py-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-400 font-medium transition-colors"
              >
                Back to Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Create Game</h1>
              <p className="text-xs text-gray-500">Step {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-3">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-emerald-500' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Step: Game Type */}
        {step === 'type' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">What kind of game?</h2>
                <p className="text-sm text-gray-400">Choose how your tournament works</p>
              </div>
            </div>

            <button
              onClick={() => selectGameType('fun')}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                gameType === 'fun'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-semibold">Play for Fun</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                No prize pool, no money on the line. Just a straight-up poker tournament
                for your community. Great for practice, community nights, or settling
                arguments about who actually plays better.
              </p>
            </button>

            <button
              onClick={() => selectGameType('sponsored')}
              className={`w-full text-left p-5 rounded-2xl border transition-all ${
                gameType === 'sponsored'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Megaphone className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold">Sponsored</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Fund a USDC prize pool for the tournament. You set the amount, the smart
                contract handles payouts to the top 2 finishers. Zero rake, 100% of the
                pool goes to players.
              </p>
            </button>
          </div>
        )}

        {/* Step: Prize Pool (sponsored only) */}
        {step === 'prize' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Prize Pool</h2>
                <p className="text-sm text-gray-400">How much USDC for the winners?</p>
              </div>
            </div>

            {/* Prize Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Prize Pool (USDC)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">$</span>
                <input
                  type="number"
                  value={form.prizePool / 100 || ''}
                  onChange={(e) => setForm({ ...form, prizePool: parseFloat(e.target.value) * 100 || 0 })}
                  className="w-full pl-10 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white text-2xl font-bold font-mono focus:outline-none focus:border-yellow-500/50"
                  placeholder="0"
                  min={1}
                  step={1}
                />
              </div>
              <div className="flex gap-2">
                {[25, 50, 100, 250].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setForm({ ...form, prizePool: amount * 100 })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.prizePool === amount * 100
                        ? 'bg-yellow-500 text-gray-900'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Structure Preview */}
            {form.prizePool > 0 && (
              <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="text-sm font-medium text-gray-300 mb-3">Payout Structure (6 players)</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-medium">1st Place (65%)</span>
                    <span className="font-bold">{formatUSDC(Math.floor(form.prizePool * 0.65))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">2nd Place (35%)</span>
                    <span className="font-bold">{formatUSDC(Math.floor(form.prizePool * 0.35))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">3rd-6th Place</span>
                    <span className="text-gray-500">$0</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  {/* NOTE: Platform fee hook. Change this copy and add fee deduction when ready. */}
                  <p className="text-emerald-400 font-medium text-sm">0% Platform Fee</p>
                  <p className="text-gray-400 text-xs mt-1">
                    100% of the prize pool goes to winners. Smart contract on Base handles trustless payouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Fund Escrow (sponsored only) */}
        {step === 'fund' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Fund the Escrow</h2>
                <p className="text-sm text-gray-400">Deposit {formatUSDC(form.prizePool)} USDC to the contract</p>
              </div>
            </div>

            {!CONTRACT_DEPLOYED ? (
              /* Contract not deployed yet -- skip on-chain, continue with backend-only */
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium text-sm">Contract not deployed yet</p>
                      <p className="text-gray-400 text-xs mt-1">
                        The escrow contract has not been deployed to Base. Your game will be created
                        without on-chain escrow. Prize pool tracking is handled by the backend.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Prize Pool</span>
                    <span className="text-yellow-400 font-bold text-lg">{formatUSDC(form.prizePool)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Contract deployed -- do on-chain funding */
              <div className="space-y-4">
                {/* Step 1: Approve */}
                <div className={`p-4 rounded-xl border transition-all ${
                  fundingPhase === 'approved' || fundingPhase === 'depositing' || fundingPhase === 'deposited'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : fundingPhase === 'approving'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-gray-800/30 border-gray-700/30'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {fundingPhase === 'approved' || fundingPhase === 'depositing' || fundingPhase === 'deposited' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : fundingPhase === 'approving' || isApproving ? (
                      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs text-gray-500">1</div>
                    )}
                    <div>
                      <div className="text-sm font-medium">Approve USDC</div>
                      <div className="text-xs text-gray-500">Allow the contract to spend {formatUSDC(form.prizePool)}</div>
                    </div>
                  </div>
                  {fundingPhase === 'idle' && (
                    <button
                      onClick={handleApproveUsdc}
                      disabled={isApproving || !sponsoredTournamentId}
                      className="w-full mt-2 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-400 text-gray-900 font-semibold rounded-xl transition-colors text-sm"
                    >
                      {!sponsoredTournamentId ? 'Setting up...' : 'Approve USDC'}
                    </button>
                  )}
                </div>

                {/* Step 2: Deposit */}
                <div className={`p-4 rounded-xl border transition-all ${
                  fundingPhase === 'deposited'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : fundingPhase === 'depositing'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-gray-800/30 border-gray-700/30'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {fundingPhase === 'deposited' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : fundingPhase === 'depositing' || isSponsoring ? (
                      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs text-gray-500">2</div>
                    )}
                    <div>
                      <div className="text-sm font-medium">Deposit to Contract</div>
                      <div className="text-xs text-gray-500">Transfer {formatUSDC(form.prizePool)} to escrow</div>
                    </div>
                  </div>
                  {fundingPhase === 'approved' && (
                    <button
                      onClick={handleDepositToContract}
                      disabled={isSponsoring}
                      className="w-full mt-2 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-400 text-gray-900 font-semibold rounded-xl transition-colors text-sm"
                    >
                      Deposit {formatUSDC(form.prizePool)}
                    </button>
                  )}
                </div>

                {/* Error display */}
                {fundingError && (
                  <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{fundingError}</span>
                    </div>
                  </div>
                )}

                {/* Success */}
                {fundingPhase === 'deposited' && (
                  <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-emerald-400 font-medium text-sm">Prize pool funded</p>
                        <p className="text-gray-400 text-xs mt-0.5">{formatUSDC(form.prizePool)} USDC deposited to escrow contract</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Game Settings */}
        {step === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Game Settings</h2>
                <p className="text-sm text-gray-400">Configure your poker game</p>
              </div>
            </div>

            {/* Starting Stack */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Starting Stack</label>
              <input
                type="number"
                value={form.startingStack}
                onChange={(e) => setForm({ ...form, startingStack: parseInt(e.target.value) || 1500 })}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white text-lg font-mono focus:outline-none focus:border-emerald-500/50"
                min={500}
                max={10000}
                step={100}
              />
              <div className="flex gap-2">
                {[1000, 1500, 2000, 3000].map((stack) => (
                  <button
                    key={stack}
                    onClick={() => setForm({ ...form, startingStack: stack })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.startingStack === stack
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {stack.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Blind Speed */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Blind Structure</label>
              <div className="grid grid-cols-3 gap-3">
                {(['turbo', 'standard', 'deep'] as BlindSpeed[]).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setForm({ ...form, blindSpeed: speed })}
                    className={`p-4 rounded-xl border transition-all ${
                      form.blindSpeed === speed
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Zap className={`w-5 h-5 ${
                        speed === 'turbo' ? 'text-orange-400' :
                        speed === 'standard' ? 'text-emerald-400' :
                        'text-blue-400'
                      }`} />
                    </div>
                    <div className="text-sm font-semibold capitalize">{speed}</div>
                    <div className="text-xs text-gray-500">
                      {speed === 'turbo' ? '5 min' : speed === 'standard' ? '10 min' : '15 min'} levels
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Time */}
            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Estimated Game Time</span>
                <span className="text-emerald-400 font-bold">~{estimatedTime} minutes</span>
              </div>
            </div>

            {/* Scheduled Start */}
            <div className={`p-4 rounded-xl border transition-all ${
              scheduledStart
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-gray-800/30 border-gray-700/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-yellow-400" />
                  <div>
                    <span className="font-semibold">Schedule Start Time</span>
                    <p className="text-xs text-gray-500">Set a specific start time</p>
                  </div>
                </div>
                <button
                  onClick={() => setScheduledStart(!scheduledStart)}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    scheduledStart ? 'bg-yellow-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    scheduledStart ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {scheduledStart && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Date (UTC)</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Time (UTC)</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Sybil Protection */}
        {step === 'sybil' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Sybil Protection</h2>
                <p className="text-sm text-gray-400">Prevent multi-accounting</p>
              </div>
            </div>

            {/* NFT Gating */}
            <div className={`p-4 rounded-xl border transition-all ${
              form.sybilOptions.nftGating.enabled
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-gray-800/30 border-gray-700/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Image className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold">NFT Gating</span>
                </div>
                <button
                  onClick={() => setForm({
                    ...form,
                    sybilOptions: {
                      ...form.sybilOptions,
                      nftGating: { ...form.sybilOptions.nftGating, enabled: !form.sybilOptions.nftGating.enabled }
                    }
                  })}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    form.sybilOptions.nftGating.enabled ? 'bg-purple-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    form.sybilOptions.nftGating.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Require players to hold a specific NFT</p>
              {form.sybilOptions.nftGating.enabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="NFT Contract Address (0x...)"
                    value={form.sybilOptions.nftGating.contractAddress || ''}
                    onChange={(e) => setForm({
                      ...form,
                      sybilOptions: {
                        ...form.sybilOptions,
                        nftGating: { ...form.sybilOptions.nftGating, contractAddress: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm font-mono focus:outline-none focus:border-purple-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Token ID (optional, for ERC-1155)"
                    value={form.sybilOptions.nftGating.tokenId || ''}
                    onChange={(e) => setForm({
                      ...form,
                      sybilOptions: {
                        ...form.sybilOptions,
                        nftGating: { ...form.sybilOptions.nftGating, tokenId: e.target.value }
                      }
                    })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm font-mono focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              )}
            </div>

            {/* Coinbase Verification */}
            <div className={`p-4 rounded-xl border transition-all ${
              form.sybilOptions.coinbaseVerification.enabled
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-gray-800/30 border-gray-700/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold">Coinbase Verification</span>
                </div>
                <button
                  onClick={() => setForm({
                    ...form,
                    sybilOptions: {
                      ...form.sybilOptions,
                      coinbaseVerification: { enabled: !form.sybilOptions.coinbaseVerification.enabled }
                    }
                  })}
                  className={`w-12 h-6 rounded-full transition-all duration-200 ${
                    form.sybilOptions.coinbaseVerification.enabled ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    form.sybilOptions.coinbaseVerification.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-gray-400">Require Coinbase Verified Account attestation (EAS on Base)</p>
            </div>

            {/* No protection selected */}
            {!form.sybilOptions.nftGating.enabled && !form.sybilOptions.coinbaseVerification.enabled && (
              <div className="p-4 bg-gray-800/20 rounded-xl border border-dashed border-gray-700/50 text-center">
                <p className="text-gray-500 text-sm">No sybil protection selected</p>
                <p className="text-gray-600 text-xs mt-1">Anyone with a wallet can join</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Review & Create</h2>
                <p className="text-sm text-gray-400">Confirm your game settings</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
              {/* Game Type */}
              <div className="p-4 border-b border-gray-700/30">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Game Type</div>
                <div className="flex items-center gap-2">
                  {gameType === 'fun' ? (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400">Play for Fun</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">Sponsored</span>
                  )}
                </div>
              </div>

              {/* Game Settings */}
              <div className="p-4 border-b border-gray-700/30">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Game Settings</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Starting Stack</span>
                    <span className="font-semibold">{form.startingStack.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Blind Structure</span>
                    <span className="font-semibold capitalize">{form.blindSpeed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Est. Duration</span>
                    <span className="font-semibold">~{estimatedTime} min</span>
                  </div>
                </div>
              </div>

              {/* Sybil Protection */}
              <div className="p-4 border-b border-gray-700/30">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sybil Protection</div>
                <div className="flex flex-wrap gap-2">
                  {form.sybilOptions.nftGating.enabled && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">NFT Required</span>
                  )}
                  {form.sybilOptions.coinbaseVerification.enabled && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">Coinbase Verified</span>
                  )}
                  {!form.sybilOptions.nftGating.enabled &&
                   !form.sybilOptions.coinbaseVerification.enabled && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">None</span>
                  )}
                </div>
              </div>

              {/* Prize Pool */}
              <div className="p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Prize Pool</div>
                <div className="text-3xl font-black text-yellow-400">
                  {form.prizePool > 0 ? formatUSDC(form.prizePool) : 'No Prize'}
                </div>
                {form.prizePool > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    1st: {formatUSDC(Math.floor(form.prizePool * 0.65))} | 2nd: {formatUSDC(Math.floor(form.prizePool * 0.35))}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet info */}
            <div className="p-4 bg-gray-800/20 rounded-xl border border-gray-700/30">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Connected Wallet</span>
                <span className="font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0d1117]/95 backdrop-blur-lg border-t border-gray-800/50 pb-safe">
        <div className="max-w-md mx-auto">
          {step === 'type' ? (
            <div className="text-center text-sm text-gray-500">
              Select a game type to continue
            </div>
          ) : step === 'fund' ? (
            /* Fund step: continue only when funded or contract not deployed */
            <button
              onClick={goNext}
              disabled={CONTRACT_DEPLOYED && fundingPhase !== 'deposited'}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {CONTRACT_DEPLOYED && fundingPhase !== 'deposited' ? 'Complete funding above' : 'Continue'}
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : step !== 'confirm' ? (
            <button
              onClick={goNext}
              disabled={step === 'prize' && form.prizePool < 100}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Game...
                </>
              ) : (
                'Create Game'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
