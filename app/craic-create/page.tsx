'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseUnits, decodeEventLog, Address } from 'viem';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Zap,
  AlertCircle,
  X,
  Wallet,
  Coins,
  Copy,
  Globe,
  List,
  Percent,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import {
  CreateGameFormState,
  DEFAULT_CREATE_FORM,
  BlindSpeed,
  USDC_ADDRESS,
} from '@/lib/craic/types';
import { CRAIC_HOME_GAME_ABI, CRAIC_CONTRACT_ADDRESS } from '@/lib/craic/contract';

type WizardStep = 'basics' | 'access' | 'buyin' | 'blinds' | 'fee' | 'review';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'access', label: 'Access' },
  { id: 'buyin', label: 'Buy-In' },
  { id: 'blinds', label: 'Blinds' },
  { id: 'fee', label: 'Fee' },
  { id: 'review', label: 'Launch' },
];

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

type BuyInType = 'free' | 'eth' | 'usdc' | 'custom';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function generateGameId() {
  return `craic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
    </div>
  );
}

export default function CreateGamePage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateGameWizard />
    </Suspense>
  );
}

/* ─────────────────────────────────────────────────────── */

function CreateGameWizard() {
  const { address, isConnected } = useAccount();
  const { hasInjected, isConnecting: walletConnecting, manualConnectors, connectWith } = useWalletConnect();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlPlayerId = searchParams.get('playerId');
  const urlPlayerName = searchParams.get('playerName');

  // ── wizard state ──
  const [step, setStep] = useState<WizardStep>('basics');
  const [form, setForm] = useState<CreateGameFormState>(DEFAULT_CREATE_FORM);

  // ── buy-in UI ──
  const [buyInType, setBuyInType] = useState<BuyInType>('free');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  // ── token gate UI ──
  const [tokenGateAddress, setTokenGateAddress] = useState('');
  const [tokenGateMinBalance, setTokenGateMinBalance] = useState('1'); // min balance default: 1

  // ── "same token as gate" toggle (buy-in step) ──
  const [sameAsGate, setSameAsGate] = useState(false);

  // ── leaderboard UI ──
  const [leaderboardAddress, setLeaderboardAddress] = useState('');
  const [leaderboardLimit, setLeaderboardLimit] = useState(50);

  // ── whitelist UI ──
  const [wlManual, setWlManual] = useState('');

  // ── create flow ──
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [pendingForm, setPendingForm] = useState<CreateGameFormState | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [baseAppLinkCopied, setBaseAppLinkCopied] = useState(false);

  // ── wagmi hooks ──
  const {
    writeContract,
    data: txHash,
    isPending: isSigning,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // ── derived ──
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isFree = buyInType === 'free';
  const isPaid = !isFree && form.buyInToken !== '' && form.buyInAmount !== '0';
  const creating = isSigning || isConfirming || isPosting;

  // Auto-connect is handled by useWalletConnect hook.

  // ── fetch token info on custom address change ──
  useEffect(() => {
    if (buyInType !== 'custom' || !customToken || !/^0x[0-9a-fA-F]{40}$/.test(customToken)) {
      if (buyInType === 'custom') setTokenInfo(null);
      return;
    }
    const id = setTimeout(async () => {
      setTokenLoading(true);
      try {
        const res = await fetch(`/api/craic/token-info?address=${customToken}`);
        if (res.ok) setTokenInfo(await res.json());
        else setTokenInfo(null);
      } catch {
        setTokenInfo(null);
      } finally {
        setTokenLoading(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [customToken, buyInType]);

  // ── auto-enable "same as gate" when switching to custom buy-in after token_gated access ──
  useEffect(() => {
    if (buyInType !== 'custom') { setSameAsGate(false); return; }
    if (form.entryMode === 'token_gated' && tokenGateAddress) {
      setSameAsGate(true);
      setCustomToken(tokenGateAddress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyInType]);

  // ── sync buy-in UI → form ──
  useEffect(() => {
    if (isFree) {
      setForm((f) => ({ ...f, buyInToken: '', buyInAmount: '0' }));
      return;
    }
    const token =
      buyInType === 'eth' ? ZERO_ADDR : buyInType === 'usdc' ? USDC_ADDRESS : customToken;
    const decimals =
      buyInType === 'eth' ? 18 : buyInType === 'usdc' ? 6 : tokenInfo?.decimals ?? 18;
    let raw = '0';
    try {
      if (amountDisplay && parseFloat(amountDisplay) > 0)
        raw = parseUnits(amountDisplay, decimals).toString();
    } catch { /* invalid input */ }
    setForm((f) => ({ ...f, buyInToken: token, buyInAmount: raw }));
  }, [buyInType, amountDisplay, customToken, tokenInfo, isFree]);

  // ── handle write error ──
  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message || '';
    setError(msg.includes('User rejected') || msg.includes('denied') ? 'Transaction rejected' : msg.slice(0, 200));
    setPendingGameId(null);
    setPendingForm(null);
  }, [writeError]);

  // ── on tx confirm → post to API ──
  useEffect(() => {
    if (!isConfirmed || !receipt || !pendingGameId || !pendingForm || createdGameId) return;

    let gameHash: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CRAIC_HOME_GAME_ABI,
          eventName: 'GameCreated',
          data: log.data,
          topics: log.topics,
        });
        gameHash = (decoded.args as Record<string, unknown>).gameHash as string;
        break;
      } catch { /* not our event */ }
    }

    postToApi(pendingGameId, pendingForm, gameHash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, receipt, pendingGameId]);

  // ── manual whitelist parse ──
  useEffect(() => {
    if (form.entryMode !== 'whitelist') return;
    const addrs = wlManual
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => /^0x[0-9a-fA-F]{40}$/.test(s));
    setForm((f) => ({ ...f, whitelist: addrs }));
  }, [wlManual, form.entryMode]);

  /* ── handlers ── */

  async function postToApi(gameId: string, f: CreateGameFormState, gameHash?: string) {
    setIsPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/craic/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          gameHash,
          host: address,
          gameName: f.gameName,
          description: f.description,
          buyInToken: f.buyInToken,
          buyInAmount: f.buyInAmount,
          protocolFeeBps: f.protocolFeeBps,
          entryMode: f.entryMode,
          ...(f.whitelist?.length ? { whitelist: f.whitelist } : {}),
          ...(f.entryMode === 'token_gated' && tokenGateAddress
            ? { tokenGateAddress, tokenGateMinBalance: tokenGateMinBalance || '1' }
            : {}),
          ...(f.entryMode === 'leaderboard'
            ? { leaderboardAddress, leaderboardLimit }
            : {}),
          startingStack: f.startingStack,
          blindSpeed: f.blindSpeed,
          ...(f.scheduledStart ? { scheduledStart: f.scheduledStart } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) setCreatedGameId(data.gameId);
      else setError(data.error || 'Failed to create game');
    } catch {
      setError('Failed to create game');
    } finally {
      setIsPosting(false);
    }
  }

  function handleCreate() {
    setError(null);
    resetWrite();
    const gameId = generateGameId();
    setPendingGameId(gameId);
    setPendingForm({ ...form });

    if (isPaid) {
      writeContract({
        address: CRAIC_CONTRACT_ADDRESS,
        abi: CRAIC_HOME_GAME_ABI,
        functionName: 'createGame',
        args: [
          gameId,
          form.buyInToken as Address,
          BigInt(form.buyInAmount),
          form.protocolFeeBps,
        ],
      });
    } else {
      postToApi(gameId, form);
    }
  }

  function goNext() {
    const next = stepIndex + 1;
    if (next < STEPS.length) setStep(STEPS[next].id);
  }
  function goBack() {
    const prev = stepIndex - 1;
    if (prev >= 0) setStep(STEPS[prev].id);
    else router.push('/craic-home');
  }

  function canContinue(): boolean {
    switch (step) {
      case 'basics':
        return form.gameName.trim().length > 0;
      case 'access':
        if (form.entryMode === 'open' || form.entryMode === 'token_gated' || form.entryMode === 'leaderboard') return true;
        return (form.whitelist?.length ?? 0) > 0;
      default:
        return true;
    }
  }

  function copyLink() {
    if (!createdGameId) return;
    const url = `https://maxcraicpoker.com/craic-game/${createdGameId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function copyBaseAppLink() {
    if (!createdGameId) return;
    const url = `https://www.base.org/miniapp?url=https://maxcraicpoker.com/craic-game/${createdGameId}`;
    navigator.clipboard.writeText(url);
    setBaseAppLinkCopied(true);
    setTimeout(() => setBaseAppLinkCopied(false), 2000);
  }

  const estimatedTimes: Record<BlindSpeed, string> = {
    turbo: '~20 min',
    standard: '~45 min',
    deep: '~90 min',
  };

  const activeTokenSymbol =
    buyInType === 'eth' ? 'ETH' : buyInType === 'usdc' ? 'USDC' : tokenInfo?.symbol ?? '???';
  const activeDecimals =
    buyInType === 'eth' ? 18 : buyInType === 'usdc' ? 6 : tokenInfo?.decimals ?? 18;
  const isStablecoin = ['USDC', 'USDT', 'DAI'].includes(activeTokenSymbol);

  /* ── gate: wallet ── */

  const canCreateFree = urlPlayerId && urlPlayerName;
  if (!isConnected && !canCreateFree) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm shadow-2xl">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
            <p className="text-gray-500 text-sm mb-6">Required to host a game</p>
            {walletConnecting ? (
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : hasInjected ? (
              <div className="space-y-3">
                <button
                  onClick={() => connectWith('injected')}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-semibold transition-colors"
                >
                  Connect Wallet
                </button>
                <button
                  onClick={() => router.push('/craic-home')}
                  className="w-full py-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-gray-400 font-medium transition-colors"
                >
                  Back to Lobby
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {manualConnectors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => connectWith(c.id)}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-semibold transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
                <button
                  onClick={() => router.push('/craic-home')}
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

  /* ── success screen ── */

  if (createdGameId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl border border-amber-500/30 w-full max-w-sm shadow-2xl shadow-amber-500/10">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">Game Created</h2>
            <p className="text-amber-400 font-semibold mb-6">{form.gameName}</p>

            <div className="space-y-2 mb-4">
              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Share via Base App</p>
                  <button
                    onClick={copyBaseAppLink}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 text-xs font-medium transition-colors"
                  >
                    {baseAppLinkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {baseAppLinkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 font-mono break-all">
                  {`base.org/miniapp?url=maxcraicpoker.com/craic-game/${createdGameId}`}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Share via Browser</p>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-400 text-xs font-medium transition-colors"
                  >
                    {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 font-mono break-all">
                  {`maxcraicpoker.com/craic-game/${createdGameId}`}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const pid = urlPlayerId || address;
                const pname = urlPlayerName || (address ? `Player_${address.slice(2, 6)}` : 'Player');
                router.push(`/craic-game/${createdGameId}?playerId=${encodeURIComponent(pid || '')}&playerName=${encodeURIComponent(pname)}`);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20"
            >
              Go to Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── main wizard ── */

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm shadow-2xl max-h-[92vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-1 text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-white">Create Game</h3>
              <p className="text-xs text-gray-600">
                Step {stepIndex + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button onClick={() => router.push('/craic-home')} className="p-1 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* progress */}
        <div className="flex gap-1 px-4 pt-3 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-amber-500' : 'bg-gray-800'}`}
            />
          ))}
        </div>

        {/* content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* ──────── STEP 1: BASICS ──────── */}
          {step === 'basics' && (
            <div className="space-y-5">
              <StepHeader icon={<Coins className="w-6 h-6 text-amber-400" />} title="Game Basics" sub="Name your game" />

              <Field label="Game Name *">
                <input
                  type="text"
                  value={form.gameName}
                  onChange={(e) => setForm({ ...form, gameName: e.target.value })}
                  placeholder="Friday Night Poker"
                  maxLength={60}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional. Tell players what this game is about."
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white resize-none focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                />
                <p className="text-xs text-gray-600 text-right">{form.description.length}/200</p>
              </Field>

              <Field label="Scheduled Start (optional)">
                <input
                  type="datetime-local"
                  value={form.scheduledStart ?? ''}
                  onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-amber-500/60 [color-scheme:dark]"
                />
              </Field>

            </div>
          )}

          {/* ──────── STEP 2: ACCESS CONTROL ──────── */}
          {step === 'access' && (
            <div className="space-y-4">
              <StepHeader icon={<Shield className="w-6 h-6 text-amber-400" />} title="Who can enter?" sub="Control access to your game" />

              <div className="space-y-5">
                {([
                  {
                    id: 'token_gated' as const,
                    icon: Coins,
                    label: 'Token Gated',
                    badge: 'recommended',
                    desc: 'Must hold a minimum amount of a specified token',
                  },
                  {
                    id: 'leaderboard' as const,
                    icon: Trophy,
                    label: 'Leaderboard',
                    badge: null,
                    desc: 'Top players from a community leaderboard',
                  },
                  {
                    id: 'whitelist' as const,
                    icon: List,
                    label: 'Whitelist',
                    badge: null,
                    desc: 'Host controls exactly who can join',
                  },
                  {
                    id: 'open' as const,
                    icon: Globe,
                    label: 'Open',
                    badge: null,
                    desc: 'Anyone with a wallet can join',
                  },
                ] as const).map(({ id, icon: Icon, label, badge, desc }) => {
                  const active = form.entryMode === id;
                  return (
                    <div key={id}>
                      <button
                        onClick={() => setForm({ ...form, entryMode: id, ...(id !== 'whitelist' ? { whitelist: undefined } : {}) })}
                        className={`w-full relative flex items-center gap-4 p-5 rounded-xl border-2 overflow-hidden transition-all text-left ${
                          active
                            ? 'border-amber-500 bg-gray-800/60'
                            : 'border-gray-700/40 bg-gray-800/30 hover:border-gray-600'
                        }`}
                      >
                        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-amber-500/20' : 'bg-gray-800'}`}>
                          <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-300'}`}>{label}</span>
                            {badge && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-semibold rounded-full">{badge}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                        </div>
                        {active && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                      </button>

                      {/* Inline expansion for selected option */}
                      {active && id === 'open' && (
                        <p className="text-[11px] text-amber-400/80 mt-1.5 px-1">
                          ⚠ Anyone can join — use with caution
                        </p>
                      )}
                      {active && id === 'token_gated' && (
                        <div className="mt-2 mb-4 space-y-2">
                          <input
                            type="text"
                            value={tokenGateAddress}
                            onChange={(e) => setTokenGateAddress(e.target.value.trim())}
                            placeholder="Token contract address (0x...)"
                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={tokenGateMinBalance}
                            onChange={(e) => setTokenGateMinBalance(e.target.value)}
                            placeholder="Minimum balance required (e.g. 1)"
                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                          />
                        </div>
                      )}
                      {active && id === 'leaderboard' && (
                        <div className="mt-2 mb-4 space-y-2">
                          <input
                            type="text"
                            value={leaderboardAddress}
                            onChange={(e) => setLeaderboardAddress(e.target.value.trim())}
                            placeholder="0x... or API endpoint"
                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={1000}
                            value={leaderboardLimit}
                            onChange={(e) => setLeaderboardLimit(Math.max(1, parseInt(e.target.value) || 50))}
                            placeholder="50"
                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                          />
                          <p className="text-[11px] text-gray-600 px-0.5">Top how many players from the leaderboard</p>
                        </div>
                      )}
                      {active && id === 'whitelist' && (
                        <div className="mt-2 mb-4 space-y-1.5">
                          <textarea
                            value={wlManual}
                            onChange={(e) => setWlManual(e.target.value)}
                            placeholder={"Paste wallet addresses, one per line\n0xAbc123...\n0xDef456..."}
                            rows={4}
                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-xs font-mono resize-none focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                          />
                          {(form.whitelist?.length ?? 0) > 0 && (
                            <p className="text-[11px] text-amber-400 px-0.5">
                              {form.whitelist!.length} address{form.whitelist!.length !== 1 ? 'es' : ''} loaded
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ──────── STEP 3: BUY-IN ──────── */}
          {step === 'buyin' && (
            <div className="space-y-4">
              <StepHeader icon={<Coins className="w-6 h-6 text-amber-400" />} title="How much to enter?" sub="Set the buy-in for your game" />

              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'free' as BuyInType, icon: '🎁', label: 'Free', sub: 'No buy-in required' },
                  { id: 'eth' as BuyInType, icon: '⟠', label: 'ETH', sub: 'Native Ether on Base' },
                  { id: 'usdc' as BuyInType, icon: '💵', label: 'USDC', sub: 'Stablecoin on Base' },
                  { id: 'custom' as BuyInType, icon: '🪙', label: 'Custom Token', sub: 'Any ERC-20 on Base' },
                ] as const).map(({ id, icon, label, sub }) => {
                  const active = buyInType === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { setBuyInType(id); if (id === 'free') setAmountDisplay(''); }}
                      className={`relative p-4 rounded-xl border-2 text-left overflow-hidden transition-all ${
                        active
                          ? 'border-amber-500 bg-gray-800/60'
                          : 'border-gray-700/40 bg-gray-800/30 hover:border-gray-600'
                      }`}
                    >
                      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                      <div className="text-xl mb-1.5">{icon}</div>
                      <div className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-300'}`}>{label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
                      {active && (
                        <Check className="absolute top-3 right-3 w-4 h-4 text-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {buyInType === 'custom' && (
                <div className="space-y-2">
                  {form.entryMode === 'token_gated' && tokenGateAddress && (
                    <button
                      onClick={() => {
                        const next = !sameAsGate;
                        setSameAsGate(next);
                        setCustomToken(next ? tokenGateAddress : '');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800/30 rounded-lg border border-gray-700/30"
                    >
                      <span className="text-sm text-gray-300">Same token as gate</span>
                      <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${sameAsGate ? 'bg-amber-500' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${sameAsGate ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  )}
                  {sameAsGate ? (
                    <div className="px-3 py-2.5 bg-gray-800/20 border border-gray-700/20 rounded-lg">
                      <p className="text-xs text-gray-500 font-mono truncate">{customToken}</p>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value.trim())}
                      placeholder="Token contract address (0x...)"
                      className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                    />
                  )}
                </div>
              )}

              {!isFree && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountDisplay}
                      onChange={(e) => setAmountDisplay(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
                    />
                    <span className="text-base text-gray-400 font-mono pr-1 min-w-[40px]">{activeTokenSymbol}</span>
                  </div>
                  {isStablecoin && amountDisplay && parseFloat(amountDisplay) > 0 && (
                    <p className="text-xs text-emerald-400">~${parseFloat(amountDisplay).toFixed(2)} USD</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ──────── STEP 4: BLINDS ──────── */}
          {step === 'blinds' && (
            <div className="space-y-5">
              <StepHeader icon={<Clock className="w-6 h-6 text-amber-400" />} title="Blind Speed" sub="How fast blinds escalate" />

              <div className="space-y-3">
                {([
                  { id: 'turbo' as BlindSpeed, label: 'Turbo', sub: '~20 min rounds per table. More tables, longer night.', icon: Zap, color: 'orange' },
                  { id: 'standard' as BlindSpeed, label: 'Standard', sub: '~45 min rounds per table. More tables, longer night.', icon: Clock, color: 'amber' },
                  { id: 'deep' as BlindSpeed, label: 'Deep Stack', sub: '~90 min rounds per table. Clear your calendar.', icon: Users, color: 'blue' },
                ]).map((opt) => {
                  const active = form.blindSpeed === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setForm({ ...form, blindSpeed: opt.id })}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        active
                          ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10'
                          : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-amber-500/20' : 'bg-gray-800'}`}>
                        <opt.icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                      </div>
                      {active && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-gray-900" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ──────── STEP 5: FEE ──────── */}
          {step === 'fee' && (
            <div className="space-y-5">
              <StepHeader icon={<Percent className="w-6 h-6 text-amber-400" />} title="Protocol Fee" sub="Applied to the prize pool" />

              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-4xl font-black text-amber-400">
                    {(form.protocolFeeBps / 100).toFixed(form.protocolFeeBps % 100 === 0 ? 0 : 2)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{form.protocolFeeBps} basis points</p>
                </div>

                <input
                  type="range"
                  min={100}
                  max={500}
                  step={25}
                  value={form.protocolFeeBps}
                  onChange={(e) => setForm({ ...form, protocolFeeBps: parseInt(e.target.value) })}
                  className="w-full accent-amber-500"
                />

                <div className="flex justify-between text-xs text-gray-600">
                  <span>1%</span>
                  <span>5%</span>
                </div>

                <div className="flex gap-2">
                  {[100, 200, 500].map((bps) => (
                    <button
                      key={bps}
                      onClick={() => setForm({ ...form, protocolFeeBps: bps })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        form.protocolFeeBps === bps
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                          : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:border-gray-600'
                      }`}
                    >
                      {`${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Goes to the Craic Protocol team to cover running costs.
              </p>
            </div>
          )}

          {/* ──────── STEP 6: REVIEW ──────── */}
          {step === 'review' && (
            <div className="space-y-5">
              <StepHeader icon={<Check className="w-6 h-6 text-amber-400" />} title="Review & Launch" sub="Confirm and go live" />

              <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden divide-y divide-gray-700/30">
                <ReviewRow label="Game Name" value={form.gameName} />
                {form.description && <ReviewRow label="Description" value={form.description} />}
                {form.scheduledStart && (
                  <ReviewRow
                    label="Starts"
                    value={new Date(form.scheduledStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  />
                )}
                <ReviewRow label="Blind Speed" value={form.blindSpeed.charAt(0).toUpperCase() + form.blindSpeed.slice(1)} />
                <ReviewRow label="Est. Duration" value={estimatedTimes[form.blindSpeed]} />
                <ReviewRow
                  label="Buy-In"
                  value={
                    isFree
                      ? 'Free'
                      : `${amountDisplay || '0'} ${activeTokenSymbol}`
                  }
                  accent
                />
                <ReviewRow
                  label="Entry Mode"
                  value={
                    form.entryMode === 'open'
                      ? 'Open'
                      : form.entryMode === 'token_gated'
                      ? `Token Gated${tokenGateAddress ? ` (${tokenGateAddress.slice(0, 6)}…)` : ''}`
                      : form.entryMode === 'leaderboard'
                      ? `Leaderboard (top ${leaderboardLimit})`
                      : `Whitelist (${form.whitelist?.length ?? 0} addresses)`
                  }
                />
                <ReviewRow label="Protocol Fee" value={`${(form.protocolFeeBps / 100).toFixed(form.protocolFeeBps % 100 === 0 ? 0 : 2)}%`} />
              </div>

              {isPaid && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    This will submit a transaction to create the game on-chain. You will need to approve it in your wallet.
                  </p>
                </div>
              )}

              {address && (
                <div className="flex items-center justify-between px-3 py-2 bg-gray-800/20 rounded-lg">
                  <span className="text-xs text-gray-500">Wallet</span>
                  <span className="text-xs text-gray-400 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="p-4 border-t border-gray-800/60 flex-shrink-0">
          {step !== 'review' ? (
            <button
              onClick={goNext}
              disabled={!canContinue()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-600 rounded-xl text-gray-900 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || !canContinue()}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Approve in Wallet...
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirming...
                </>
              ) : isPosting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up game...
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

/* ── small UI helpers ── */

function StepHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-500">{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}
