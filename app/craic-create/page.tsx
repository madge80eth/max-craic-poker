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
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Trophy,
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

type FundingPhase = 'idle' | 'approving' | 'approved' | 'depositing' | 'deposited' | 'error';

function CreateGameLoading() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
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
    if (!address || sponsoredTournamentId) return;
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

  useEffect(() => {
    if (step === 'fund' && !sponsoredTournamentId && address) {
      createSponsoredBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, address]);

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

  // Wallet connect screen
  if (!isConnected && !canCreateFreeGame) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet className="w-8 h-8 text-white" />
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
                  className="w-full py-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl font-medium transition-colors border border-gray-600/50"
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
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors border border-gray-700/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Create Game</h1>
              <p className="text-xs text-gray-500">Step {stepIndex + 1} of {STEPS.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Centered Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6 px-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i < stepIndex ? 'bg-emerald-500 text-white' :
                  i === stepIndex ? 'bg-emerald-500 text-white' :
                  'bg-gray-800 text-gray-500 border border-gray-700'
                }`}>
                  {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-1 ${
                    i < stepIndex ? 'bg-emerald-500' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Card Container */}
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
            {/* Step: Game Type */}
            {step === 'type' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Gamepad2 className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">What kind of game?</h2>
                  <p className="text-sm text-gray-400 mt-1">Choose how your tournament works</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => selectGameType('fun')}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      gameType === 'fun'
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-gray-800/40 hover:bg-gray-800/60 border-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        gameType === 'fun' ? 'bg-emerald-500/30' : 'bg-gray-700/50'
                      }`}>
                        <Gamepad2 className={`w-5 h-5 ${gameType === 'fun' ? 'text-emerald-400' : 'text-gray-400'}`} />
                      </div>
                      <h3 className="text-base font-semibold">Play for Fun</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pl-13">
                      No prize pool, no money on the line. Great for practice or community nights.
                    </p>
                  </button>

                  <button
                    onClick={() => selectGameType('sponsored')}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      gameType === 'sponsored'
                        ? 'bg-yellow-500/20 border-yellow-500/50'
                        : 'bg-gray-800/40 hover:bg-gray-800/60 border-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        gameType === 'sponsored' ? 'bg-yellow-500/30' : 'bg-gray-700/50'
                      }`}>
                        <Trophy className={`w-5 h-5 ${gameType === 'sponsored' ? 'text-yellow-400' : 'text-gray-400'}`} />
                      </div>
                      <h3 className="text-base font-semibold">Sponsored</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed pl-13">
                      Fund a USDC prize pool. Smart contract handles trustless payouts. 0% rake.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step: Prize Pool */}
            {step === 'prize' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Prize Pool</h2>
                  <p className="text-sm text-gray-400 mt-1">How much USDC for the winners?</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Amount (USDC)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-semibold">$</span>
                      <input
                        type="number"
                        value={form.prizePool / 100 || ''}
                        onChange={(e) => setForm({ ...form, prizePool: parseFloat(e.target.value) * 100 || 0 })}
                        className="w-full pl-10 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        placeholder="0"
                        min={1}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 250].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setForm({ ...form, prizePool: amount * 100 })}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                          form.prizePool === amount * 100
                            ? 'bg-yellow-500 text-gray-900'
                            : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60 border border-gray-700/30'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  {form.prizePool > 0 && (
                    <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Payout Structure</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-400 font-medium flex items-center gap-2">
                            <Trophy className="w-4 h-4" /> 1st Place (65%)
                          </span>
                          <span className="font-bold">{formatUSDC(Math.floor(form.prizePool * 0.65))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 font-medium">2nd Place (35%)</span>
                          <span className="font-bold">{formatUSDC(Math.floor(form.prizePool * 0.35))}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-400 font-medium text-sm">0% Platform Fee</p>
                      <p className="text-gray-400 text-xs mt-0.5">100% goes to winners via smart contract</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Fund Escrow */}
            {step === 'fund' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <Wallet className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Fund Escrow</h2>
                  <p className="text-sm text-gray-400 mt-1">Deposit {formatUSDC(form.prizePool)} to the contract</p>
                </div>

                {!CONTRACT_DEPLOYED ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-400 font-medium text-sm">Contract not deployed</p>
                        <p className="text-gray-400 text-xs mt-1">Prize pool tracking is handled by the backend.</p>
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
                  <div className="space-y-3">
                    {/* Step 1: Approve */}
                    <div className={`p-4 rounded-xl border transition-all ${
                      fundingPhase === 'approved' || fundingPhase === 'depositing' || fundingPhase === 'deposited'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : fundingPhase === 'approving'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-gray-800/30 border-gray-700/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        {fundingPhase === 'approved' || fundingPhase === 'depositing' || fundingPhase === 'deposited' ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : fundingPhase === 'approving' || isApproving ? (
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">1</div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">Approve USDC</div>
                          <div className="text-xs text-gray-500">Allow contract to spend {formatUSDC(form.prizePool)}</div>
                        </div>
                      </div>
                      {fundingPhase === 'idle' && (
                        <button
                          onClick={handleApproveUsdc}
                          disabled={isApproving || !sponsoredTournamentId}
                          className="w-full mt-3 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-gray-900 font-semibold rounded-xl transition-all text-sm"
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
                      <div className="flex items-center gap-3">
                        {fundingPhase === 'deposited' ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : fundingPhase === 'depositing' || isSponsoring ? (
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold">2</div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">Deposit to Contract</div>
                          <div className="text-xs text-gray-500">Transfer {formatUSDC(form.prizePool)} to escrow</div>
                        </div>
                      </div>
                      {fundingPhase === 'approved' && (
                        <button
                          onClick={handleDepositToContract}
                          disabled={isSponsoring}
                          className="w-full mt-3 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-gray-900 font-semibold rounded-xl transition-all text-sm"
                        >
                          Deposit {formatUSDC(form.prizePool)}
                        </button>
                      )}
                    </div>

                    {fundingError && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{fundingError}</span>
                      </div>
                    )}

                    {fundingPhase === 'deposited' && (
                      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-emerald-400 font-medium text-sm">Prize pool funded</p>
                          <p className="text-gray-400 text-xs mt-0.5">{formatUSDC(form.prizePool)} deposited to escrow</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step: Settings */}
            {step === 'settings' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Game Settings</h2>
                  <p className="text-sm text-gray-400 mt-1">Configure your poker game</p>
                </div>

                <div className="space-y-5">
                  {/* Starting Stack */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Starting Stack</label>
                    <input
                      type="number"
                      value={form.startingStack}
                      onChange={(e) => setForm({ ...form, startingStack: parseInt(e.target.value) || 1500 })}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      min={500}
                      max={10000}
                      step={100}
                    />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[1000, 1500, 2000, 3000].map((stack) => (
                        <button
                          key={stack}
                          onClick={() => setForm({ ...form, startingStack: stack })}
                          className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                            form.startingStack === stack
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60 border border-gray-700/30'
                          }`}
                        >
                          {stack.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blind Speed */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Blind Structure</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['turbo', 'standard', 'deep'] as BlindSpeed[]).map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setForm({ ...form, blindSpeed: speed })}
                          className={`p-3 rounded-xl border transition-colors ${
                            form.blindSpeed === speed
                              ? 'bg-emerald-500/20 border-emerald-500/50'
                              : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60'
                          }`}
                        >
                          <Zap className={`w-5 h-5 mx-auto mb-1 ${
                            speed === 'turbo' ? 'text-orange-400' :
                            speed === 'standard' ? 'text-emerald-400' :
                            'text-blue-400'
                          }`} />
                          <div className="text-sm font-semibold capitalize">{speed}</div>
                          <div className="text-xs text-gray-500">
                            {speed === 'turbo' ? '5 min' : speed === 'standard' ? '10 min' : '15 min'}
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
                        className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                          scheduledStart ? 'bg-yellow-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          scheduledStart ? 'translate-x-5' : 'translate-x-0.5'
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
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Time (UTC)</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Sybil Protection */}
            {step === 'sybil' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Sybil Protection</h2>
                  <p className="text-sm text-gray-400 mt-1">Prevent multi-accounting</p>
                </div>

                <div className="space-y-3">
                  {/* NFT Gating */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    form.sybilOptions.nftGating.enabled
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-gray-800/30 border-gray-700/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Image className={`w-5 h-5 ${form.sybilOptions.nftGating.enabled ? 'text-purple-400' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-medium text-sm">NFT Gating</div>
                          <div className="text-xs text-gray-500">Require specific NFT to join</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setForm({
                          ...form,
                          sybilOptions: {
                            ...form.sybilOptions,
                            nftGating: { ...form.sybilOptions.nftGating, enabled: !form.sybilOptions.nftGating.enabled }
                          }
                        })}
                        className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                          form.sybilOptions.nftGating.enabled ? 'bg-purple-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          form.sybilOptions.nftGating.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {form.sybilOptions.nftGating.enabled && (
                      <div className="space-y-2 mt-4">
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
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BadgeCheck className={`w-5 h-5 ${form.sybilOptions.coinbaseVerification.enabled ? 'text-blue-400' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-medium text-sm">Coinbase Verification</div>
                          <div className="text-xs text-gray-500">Require Coinbase Verified Account</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setForm({
                          ...form,
                          sybilOptions: {
                            ...form.sybilOptions,
                            coinbaseVerification: { enabled: !form.sybilOptions.coinbaseVerification.enabled }
                          }
                        })}
                        className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                          form.sybilOptions.coinbaseVerification.enabled ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          form.sybilOptions.coinbaseVerification.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {!form.sybilOptions.nftGating.enabled && !form.sybilOptions.coinbaseVerification.enabled && (
                    <div className="p-4 bg-gray-800/20 rounded-xl border border-dashed border-gray-700/50 text-center">
                      <p className="text-gray-500 text-sm">No protection selected</p>
                      <p className="text-gray-600 text-xs mt-1">Anyone with a wallet can join</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step: Confirmation */}
            {step === 'confirm' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">Review & Create</h2>
                  <p className="text-sm text-gray-400 mt-1">Confirm your game settings</p>
                </div>

                <div className="space-y-4">
                  {/* Game Type */}
                  <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Game Type</div>
                    <div className="flex items-center gap-2">
                      {gameType === 'fun' ? (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400">Play for Fun</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">Sponsored</span>
                      )}
                    </div>
                  </div>

                  {/* Settings Summary */}
                  <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Settings</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-bold">{form.startingStack.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Starting</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold capitalize">{form.blindSpeed}</div>
                        <div className="text-xs text-gray-500">Blinds</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">~{estimatedTime}m</div>
                        <div className="text-xs text-gray-500">Duration</div>
                      </div>
                    </div>
                  </div>

                  {/* Sybil */}
                  <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Protection</div>
                    <div className="flex flex-wrap gap-2">
                      {form.sybilOptions.nftGating.enabled && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">NFT Required</span>
                      )}
                      {form.sybilOptions.coinbaseVerification.enabled && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">Coinbase Verified</span>
                      )}
                      {!form.sybilOptions.nftGating.enabled && !form.sybilOptions.coinbaseVerification.enabled && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">None</span>
                      )}
                    </div>
                  </div>

                  {/* Prize Pool */}
                  <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
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

                  {/* Wallet */}
                  {address && (
                    <div className="p-3 bg-gray-800/20 rounded-xl border border-gray-700/30">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Wallet</span>
                        <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-700/30 bg-gray-800/20">
              {step === 'type' ? (
                <div className="text-center text-sm text-gray-500">
                  Select a game type to continue
                </div>
              ) : step === 'fund' ? (
                <button
                  onClick={goNext}
                  disabled={CONTRACT_DEPLOYED && fundingPhase !== 'deposited'}
                  className="w-full p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {CONTRACT_DEPLOYED && fundingPhase !== 'deposited' ? 'Complete funding above' : (
                    <>Continue <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              ) : step !== 'confirm' ? (
                <button
                  onClick={goNext}
                  disabled={step === 'prize' && form.prizePool < 100}
                  className="w-full p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
