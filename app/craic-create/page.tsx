'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Trophy,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  X,
  Copy,
  ExternalLink,
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

function getSteps(gameType: GameType | null): { id: WizardStep; title: string }[] {
  const steps: { id: WizardStep; title: string }[] = [
    { id: 'type', title: 'Game Type' },
  ];
  if (gameType === 'sponsored') {
    steps.push({ id: 'prize', title: 'Prize Pool' });
    steps.push({ id: 'fund', title: 'Fund' });
  }
  steps.push({ id: 'settings', title: 'Settings' });
  steps.push({ id: 'sybil', title: 'Protection' });
  steps.push({ id: 'confirm', title: 'Confirm' });
  return steps;
}

const CONTRACT_DEPLOYED = CONTRACTS.SPONSORED_TOURNAMENT !== '0x0000000000000000000000000000000000000000';

// Escrow address for off-chain funding
const ESCROW_ADDRESS = '0xCc7659fbE122AcdE826725cf3a4cd5dfD72763F0';

type FundingPhase = 'idle' | 'approving' | 'approved' | 'depositing' | 'deposited' | 'error';

function CreateGameLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading...</span>
      </div>
    </div>
  );
}

export default function CreateGamePage() {
  return (
    <Suspense fallback={<CreateGameLoading />}>
      <CreateGameWizard />
    </Suspense>
  );
}

function CreateGameWizard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const [fundingPhase, setFundingPhase] = useState<FundingPhase>('idle');
  const [fundingError, setFundingError] = useState<string | null>(null);
  const [sponsoredTournamentId, setSponsoredTournamentId] = useState<string | null>(null);
  const [sponsoredTableId, setSponsoredTableId] = useState<string | null>(null);

  // Off-chain funding state
  const [copied, setCopied] = useState(false);
  const [fundingConfirmed, setFundingConfirmed] = useState(false);
  const [fundingTxHash, setFundingTxHash] = useState<string | null>(null);
  const [checkingFunding, setCheckingFunding] = useState(false);

  const { writeContract: writeApprove, data: approveTxHash, isPending: isApproving } = useWriteContract();
  const { writeContract: writeSponsor, data: sponsorTxHash, isPending: isSponsoring } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: sponsorConfirmed } = useWaitForTransactionReceipt({ hash: sponsorTxHash });

  const STEPS = getSteps(gameType);
  const stepIndex = STEPS.findIndex(s => s.id === step);

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

  useEffect(() => {
    if (approveConfirmed && fundingPhase === 'approving') {
      setFundingPhase('approved');
    }
  }, [approveConfirmed, fundingPhase]);

  useEffect(() => {
    if (sponsorConfirmed && fundingPhase === 'depositing') {
      setFundingPhase('deposited');
    }
  }, [sponsorConfirmed, fundingPhase]);

  const goNext = async () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex].id;

      // For sponsored games, skip Fund step entirely - create tournament and redirect to /fund-game
      if (nextStep === 'fund' && gameType === 'sponsored' && !CONTRACT_DEPLOYED) {
        setCreating(true);
        try {
          const creatorId = address || urlPlayerId;
          const playerName = urlPlayerName || (address ? `Player_${address.slice(2, 6)}` : 'Player');

          const res = await fetch('/api/poker/sponsored', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creatorId,
              creatorName: playerName,
              prizePool: form.prizePool,
              bondAmount: 0,
              maxPlayers: 6,
              startingStack: form.startingStack,
              blindSpeed: form.blindSpeed,
            }),
          });
          const data = await res.json();

          if (data.success) {
            // Redirect to standalone fund page immediately
            router.push(
              `/fund-game?tournamentId=${encodeURIComponent(data.tournamentId)}&tableId=${encodeURIComponent(data.tableId)}&amount=${form.prizePool}&playerId=${encodeURIComponent(creatorId || '')}&playerName=${encodeURIComponent(playerName)}`
            );
            return;
          } else {
            setFundingError(data.error || 'Failed to create tournament');
          }
        } catch (err) {
          setFundingError(err instanceof Error ? err.message : 'Network error');
        } finally {
          setCreating(false);
        }
        return;
      }

      setStep(nextStep);
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

  const createSponsoredBackend = async () => {
    // For sponsored games, we need a wallet address for USDC transactions
    const creatorId = address || urlPlayerId;
    if (!creatorId) {
      setFundingError('Wallet not connected. Please connect your wallet for sponsored games.');
      return;
    }
    if (sponsoredTournamentId) return; // Already created

    try {
      const res = await fetch('/api/poker/sponsored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          creatorName: urlPlayerName || (address ? `Player_${address.slice(2, 6)}` : 'Player'),
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
        setFundingError(null); // Clear any previous error
      } else {
        // Ignore /pipeline errors - they're from wagmi, not relevant to off-chain flow
        if (data.error && !data.error.includes('/pipeline')) {
          setFundingError(data.error);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      // Ignore /pipeline errors - they're from wagmi background RPC calls
      if (!errMsg.includes('/pipeline')) {
        setFundingError(errMsg);
      }
    }
  };

  useEffect(() => {
    if (step === 'fund' && !sponsoredTournamentId && !fundingError) {
      createSponsoredBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, address, urlPlayerId, fundingError]);

  // Redirect to standalone fund page once tournament is created (avoids wagmi interference)
  useEffect(() => {
    if (step === 'fund' && sponsoredTournamentId && sponsoredTableId && !CONTRACT_DEPLOYED) {
      const playerId = address || urlPlayerId;
      const playerName = urlPlayerName || (address ? `Player_${address.slice(2, 6)}` : 'Player');
      router.push(
        `/fund-game?tournamentId=${encodeURIComponent(sponsoredTournamentId)}&tableId=${encodeURIComponent(sponsoredTableId)}&amount=${form.prizePool}&playerId=${encodeURIComponent(playerId || '')}&playerName=${encodeURIComponent(playerName)}`
      );
    }
  }, [step, sponsoredTournamentId, sponsoredTableId, address, urlPlayerId, urlPlayerName, form.prizePool, router]);

  // Copy escrow address to clipboard
  const copyEscrowAddress = async () => {
    try {
      await navigator.clipboard.writeText(ESCROW_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Clear /pipeline errors automatically - they're from wagmi, not relevant to off-chain flow
  useEffect(() => {
    if (fundingError && fundingError.includes('/pipeline')) {
      setFundingError(null);
    }
  }, [fundingError]);

  // Poll for funding confirmation (off-chain flow)
  useEffect(() => {
    if (step !== 'fund' || !sponsoredTournamentId || fundingConfirmed || CONTRACT_DEPLOYED) {
      return;
    }

    const checkFunding = async () => {
      setCheckingFunding(true);
      try {
        const res = await fetch(
          `/api/poker/check-funding?tournamentId=${encodeURIComponent(sponsoredTournamentId)}&amount=${form.prizePool}`
        );
        const data = await res.json();
        if (data.funded) {
          setFundingConfirmed(true);
          setFundingTxHash(data.txHash || null);
        }
      } catch (err) {
        console.error('Error checking funding:', err);
      } finally {
        setCheckingFunding(false);
      }
    };

    // Check immediately
    checkFunding();

    // Then poll every 5 seconds
    const interval = setInterval(checkFunding, 5000);
    return () => clearInterval(interval);
  }, [step, sponsoredTournamentId, fundingConfirmed, form.prizePool]);

  const handleCreate = async () => {
    const playerId = urlPlayerId || address;
    const playerName = urlPlayerName || (address ? `Player_${address.slice(2, 6)}` : 'Player');
    if (!playerId) return;
    setCreating(true);
    try {
      if (gameType === 'sponsored' && sponsoredTableId) {
        router.push(`/poker/${sponsoredTableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`);
      } else {
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
  const canCreateFreeGame = urlPlayerId && urlPlayerName;

  // Wallet connect screen - modal style
  if (!isConnected && !canCreateFreeGame) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-sm shadow-2xl">
          <div className="p-6 text-center">
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
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-sm shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {stepIndex > 0 && (
              <button
                onClick={goBack}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-lg font-bold">Create Game</h3>
              <p className="text-xs text-gray-500">Step {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/poker')}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-4 pt-3 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-emerald-500' : 'bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
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
                for your community. Great for practice or community nights.
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
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold">Sponsored</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Fund a USDC prize pool for the tournament. Smart contract handles
                trustless payouts to winners. Zero rake, 100% goes to players.
              </p>
            </button>
          </div>
        )}

        {/* Step: Prize Pool */}
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
              <label className="text-sm font-medium text-gray-300">Amount (USDC)</label>
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
                <div className="text-sm font-medium text-gray-300 mb-3">Payout Structure</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> 1st Place (65%)
                    </span>
                    <span className="font-bold">{formatUSDC(Math.floor(form.prizePool * 0.65))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">2nd Place (35%)</span>
                    <span className="font-bold">{formatUSDC(Math.floor(form.prizePool * 0.35))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-400 font-medium text-sm">0% Platform Fee</p>
                  <p className="text-gray-400 text-xs mt-1">
                    100% of the prize pool goes to winners via smart contract.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Fund Escrow */}
        {step === 'fund' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Fund Prize Pool</h2>
                <p className="text-sm text-gray-400">Send {formatUSDC(form.prizePool)} USDC to escrow</p>
              </div>
            </div>

            {/* Setting up tournament */}
            {!sponsoredTournamentId && !fundingError && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up tournament...</span>
              </div>
            )}

            {/* Error state */}
            {fundingError && (
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{fundingError}</span>
                </div>
                <button
                  onClick={() => {
                    setFundingError(null);
                    createSponsoredBackend();
                  }}
                  className="mt-2 w-full py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Ready to fund - show address */}
            {sponsoredTournamentId && !fundingConfirmed && (
              <div className="space-y-4">
                {/* Amount to send */}
                <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-1">Send exactly</div>
                    <div className="text-3xl font-black text-yellow-400">{formatUSDC(form.prizePool)}</div>
                    <div className="text-sm text-gray-500 mt-1">USDC on Base</div>
                  </div>
                </div>

                {/* Escrow address */}
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <div className="text-sm text-gray-400 mb-2">To this address:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-white bg-gray-900/50 px-3 py-2 rounded-lg truncate">
                      {ESCROW_ADDRESS}
                    </code>
                    <button
                      onClick={copyEscrowAddress}
                      className={`p-2 rounded-lg transition-colors ${
                        copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  {copied && (
                    <div className="text-xs text-emerald-400 mt-2">Address copied!</div>
                  )}
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-400 font-medium text-sm">How to fund</p>
                      <ol className="text-gray-400 text-xs mt-2 space-y-1 list-decimal list-inside">
                        <li>Copy the address above</li>
                        <li>Open your wallet (Coinbase, MetaMask, etc.)</li>
                        <li>Send {formatUSDC(form.prizePool)} USDC on Base network</li>
                        <li>Wait for confirmation below</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Waiting for confirmation */}
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <div className="flex items-center gap-3">
                    {checkingFunding ? (
                      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-300">Waiting for payment...</div>
                      <div className="text-xs text-gray-500">Auto-detects when USDC arrives</div>
                    </div>
                  </div>
                </div>

                {/* View on Basescan link */}
                <a
                  href={`https://basescan.org/address/${ESCROW_ADDRESS}#tokentxns`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View escrow on Basescan
                </a>
              </div>
            )}

            {/* Funding confirmed */}
            {fundingConfirmed && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-emerald-400 font-medium">Prize pool funded!</p>
                    <p className="text-gray-400 text-sm mt-0.5">{formatUSDC(form.prizePool)} USDC received</p>
                  </div>
                </div>

                {fundingTxHash && (
                  <a
                    href={`https://basescan.org/tx/${fundingTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View transaction on Basescan
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Settings */}
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

            {/* Game Info */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
                <Users className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs text-gray-500">Players</div>
                <div className="text-sm font-semibold">6 Max</div>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
                <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                <div className="text-xs text-gray-500">Starting</div>
                <div className="text-sm font-semibold">{form.startingStack.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                <div className="text-xs text-gray-500">Est. Time</div>
                <div className="text-sm font-semibold">~{estimatedTime}m</div>
              </div>
            </div>

            {/* Scheduled Start */}
            <div className={`p-4 rounded-xl border transition-all ${
              scheduledStart ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-gray-800/30 border-gray-700/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${scheduledStart ? 'text-yellow-400' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-sm">Schedule Start</div>
                    <div className="text-xs text-gray-500">Set a specific start time</div>
                  </div>
                </div>
                <button
                  onClick={() => setScheduledStart(!scheduledStart)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    scheduledStart ? 'bg-yellow-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    scheduledStart ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {scheduledStart && (
                <div className="grid grid-cols-2 gap-3 mt-4">
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.sybilOptions.nftGating.enabled ? 'bg-purple-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.sybilOptions.coinbaseVerification.enabled ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
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
                    <span className="px-3 py-1 text-sm font-medium rounded-lg bg-emerald-500/20 text-emerald-400">Play for Fun</span>
                  ) : (
                    <span className="px-3 py-1 text-sm font-medium rounded-lg bg-yellow-500/20 text-yellow-400">Sponsored</span>
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
                    <span className="px-3 py-1 text-sm font-medium rounded-lg bg-purple-500/20 text-purple-400">NFT Required</span>
                  )}
                  {form.sybilOptions.coinbaseVerification.enabled && (
                    <span className="px-3 py-1 text-sm font-medium rounded-lg bg-blue-500/20 text-blue-400">Coinbase Verified</span>
                  )}
                  {!form.sybilOptions.nftGating.enabled && !form.sybilOptions.coinbaseVerification.enabled && (
                    <span className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-500/20 text-gray-400">None</span>
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
            {address && (
              <div className="p-4 bg-gray-800/20 rounded-xl border border-gray-700/30">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Connected Wallet</span>
                  <span className="font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Footer Actions - inside modal */}
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          {step === 'type' ? (
            <div className="text-center text-sm text-gray-500">
              Select a game type to continue
            </div>
          ) : step === 'fund' ? (
            <button
              onClick={goNext}
              disabled={CONTRACT_DEPLOYED ? fundingPhase !== 'deposited' : !fundingConfirmed}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {(CONTRACT_DEPLOYED ? fundingPhase !== 'deposited' : !fundingConfirmed) ? (
                'Waiting for payment...'
              ) : (
                <>Continue <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          ) : step !== 'confirm' ? (
            <button
              onClick={goNext}
              disabled={step === 'prize' && form.prizePool < 100}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-700 disabled:to-gray-600 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
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
