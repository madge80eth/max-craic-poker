'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Shield,
  DollarSign,
  Image,
  Wallet,
  Coins,
  BadgeCheck,
  Loader2,
  Sparkles,
  Zap,
  Gamepad2,
  Megaphone,
} from 'lucide-react';
import GlowButton from '@/components/craic/ui/GlowButton';
import NeonBadge from '@/components/craic/ui/NeonBadge';
import {
  CreateGameFormState,
  DEFAULT_CREATE_FORM,
  BlindSpeed,
  estimateGameTime,
} from '@/lib/craic/types';

type GameType = 'fun' | 'sponsored';
type WizardStep = 'type' | 'settings' | 'sybil' | 'prize' | 'confirm';

function getSteps(gameType: GameType | null): { id: WizardStep; title: string; icon: React.ReactNode }[] {
  const steps: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
    { id: 'type', title: 'Game Type', icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'settings', title: 'Game Settings', icon: <Clock className="w-5 h-5" /> },
    { id: 'sybil', title: 'Sybil Protection', icon: <Shield className="w-5 h-5" /> },
  ];
  if (gameType === 'sponsored') {
    steps.push({ id: 'prize', title: 'Prize Pool', icon: <DollarSign className="w-5 h-5" /> });
  }
  steps.push({ id: 'confirm', title: 'Confirm', icon: <Check className="w-5 h-5" /> });
  return steps;
}

export default function CreateGameWizard() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>('type');
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [form, setForm] = useState<CreateGameFormState>(DEFAULT_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const STEPS = getSteps(gameType);
  const stepIndex = STEPS.findIndex(s => s.id === step);

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
      router.push('/');
    }
  };

  const selectGameType = (type: GameType) => {
    setGameType(type);
    if (type === 'fun') {
      setForm({ ...form, prizePool: 0 });
    }
    setStep('settings');
  };

  const handleCreate = async () => {
    if (!address) return;
    setCreating(true);

    try {
      const res = await fetch('/api/craic/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, host: address }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/game/${data.gameId}`);
      } else {
        alert(data.error || 'Failed to create game');
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

  // Render wallet connect if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen pb-safe flex items-center justify-center p-4">
        <div className="bg-gray-800/50 rounded-3xl p-8 border border-gray-700/50 text-center max-w-sm w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connect Wallet</h2>
          <p className="text-gray-400 text-sm mb-6">Connect to create a game</p>
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
                  Connect {connector.name}
                </GlowButton>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
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
                contract handles payouts to the top 3 finishers. Zero rake, 100% of the
                pool goes to players.
              </p>
            </button>
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

            {/* Bond Mechanic */}
            <div className={`p-4 rounded-xl border transition-all ${
              form.sybilOptions.bondMechanic.enabled
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-gray-800/30 border-gray-700/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold">Bond Mechanic</span>
                </div>
                <button
                  onClick={() => setForm({
                    ...form,
                    sybilOptions: {
                      ...form.sybilOptions,
                      bondMechanic: { ...form.sybilOptions.bondMechanic, enabled: !form.sybilOptions.bondMechanic.enabled }
                    }
                  })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    form.sybilOptions.bondMechanic.enabled ? 'bg-yellow-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    form.sybilOptions.bondMechanic.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Require USDC deposit (returned after game)</p>
              {form.sybilOptions.bondMechanic.enabled && (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      placeholder="10"
                      value={(form.sybilOptions.bondMechanic.amount || 0) / 100 || ''}
                      onChange={(e) => setForm({
                        ...form,
                        sybilOptions: {
                          ...form.sybilOptions,
                          bondMechanic: { ...form.sybilOptions.bondMechanic, amount: parseFloat(e.target.value) * 100 || 0 }
                        }
                      })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm font-mono focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Bonds are automatically returned to all players after the game ends</p>
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
            {!form.sybilOptions.nftGating.enabled && !form.sybilOptions.bondMechanic.enabled && !form.sybilOptions.coinbaseVerification.enabled && (
              <div className="p-4 bg-gray-800/20 rounded-xl border border-dashed border-gray-700/50 text-center">
                <p className="text-gray-500 text-sm">No sybil protection selected</p>
                <p className="text-gray-600 text-xs mt-1">Anyone with a wallet can join</p>
              </div>
            )}
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
                <p className="text-sm text-gray-400">Fund the tournament</p>
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
                  min={0}
                  step={1}
                />
              </div>
              <div className="flex gap-2">
                {[10, 25, 50, 100].map((amount) => (
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
                    <span className="text-yellow-400 flex items-center gap-2">
                      <span>🥇</span> 1st Place
                    </span>
                    <span className="font-bold">{formatUSDC(form.prizePool * 0.5)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 flex items-center gap-2">
                      <span>🥈</span> 2nd Place
                    </span>
                    <span className="font-bold">{formatUSDC(form.prizePool * 0.3)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 flex items-center gap-2">
                      <span>🥉</span> 3rd Place
                    </span>
                    <span className="font-bold">{formatUSDC(form.prizePool * 0.2)}</span>
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
                    100% of the prize pool goes to winners. Smart contracts handle trustless payouts.
                  </p>
                </div>
              </div>
            </div>
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
                    <NeonBadge variant="green">Play for Fun</NeonBadge>
                  ) : (
                    <NeonBadge variant="gold">Sponsored</NeonBadge>
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
                    <NeonBadge variant="purple">NFT Required</NeonBadge>
                  )}
                  {form.sybilOptions.bondMechanic.enabled && (
                    <NeonBadge variant="gold">
                      {formatUSDC(form.sybilOptions.bondMechanic.amount || 0)} Bond
                    </NeonBadge>
                  )}
                  {form.sybilOptions.coinbaseVerification.enabled && (
                    <NeonBadge variant="blue">Coinbase Verified</NeonBadge>
                  )}
                  {!form.sybilOptions.nftGating.enabled &&
                   !form.sybilOptions.bondMechanic.enabled &&
                   !form.sybilOptions.coinbaseVerification.enabled && (
                    <NeonBadge variant="gray">None</NeonBadge>
                  )}
                </div>
              </div>

              {/* Prize Pool */}
              <div className="p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Prize Pool</div>
                <div className="text-3xl font-black text-yellow-400">
                  {form.prizePool > 0 ? formatUSDC(form.prizePool) : 'No Prize'}
                </div>
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-gray-800/50 pb-safe">
        <div className="max-w-md mx-auto">
          {step === 'type' ? (
            // No continue button on type step, selection advances automatically
            <div className="text-center text-sm text-gray-500">
              Select a game type to continue
            </div>
          ) : step !== 'confirm' ? (
            <GlowButton onClick={goNext} variant="primary" size="lg" fullWidth>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </GlowButton>
          ) : (
            <GlowButton
              onClick={handleCreate}
              variant="gold"
              size="lg"
              fullWidth
              loading={creating}
              glow
            >
              {creating ? 'Creating Game...' : 'Create Game'}
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}
