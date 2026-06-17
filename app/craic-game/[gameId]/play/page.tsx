'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits, Address } from 'viem';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Info,
  Trophy,
  Crown,
  Check,
  Loader2,
  Share2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const GameTable = dynamic(() => import('@/app/poker/components/Table'), { ssr: false });
import { ClientGameState, PlayerAction } from '@/lib/poker/types';
import { CraicGameConfig } from '@/lib/craic/types';
import { CRAIC_HOME_GAME_ABI, CRAIC_CONTRACT_ADDRESS } from '@/lib/craic/contract';

/* ── finish-data types (mirror of /api/craic/finish response) ── */

interface FinishToken { token: string; amount: string }
interface FinishWinner {
  address: string; name: string; chips: number;
  rank: number; percent: number; tokens: FinishToken[];
}
interface FinishRanking { address: string; name: string; chips: number; rank: number }
interface FinishData {
  gameId: string;
  gameHash: string | null;
  rankings: FinishRanking[];
  payoutStructure: number[];
  winners: FinishWinner[];
  tokens: { address: string; escrowBalance: string }[];
  protocolFeeBps: number;
  txHash: string | null;
  finishedAt: number;
}

/* ── sound helper ── */

const playSound = (
  type: 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'deal' | 'turn' | 'win',
) => {
  if (typeof window === 'undefined' || type !== 'deal') return;
  try {
    const a = new Audio('/sounds/deal.mp3');
    a.volume = 0.3;
    a.play().catch(() => {});
  } catch {}
};

/* ── constants ── */

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as Address;
const CLAIM_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 h

/* ══════════════════════════════════════════════════════════════
   Main play page
══════════════════════════════════════════════════════════════ */

export default function GamePlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();

  const gameId = params.gameId as string;
  const playerId = searchParams.get('playerId') || address || '';

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [config, setConfig] = useState<CraicGameConfig | null>(null);
  const [finishData, setFinishData] = useState<FinishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  const prevPhaseRef = useRef<string | null>(null);
  const prevActivePlayerRef = useRef<number | null>(null);

  const isHost =
    !!address && !!config && config.host.toLowerCase() === address.toLowerCase();

  /* ── fetch state ── */

  const fetchState = useCallback(async () => {
    if (!gameId || !playerId) return;
    try {
      const res = await fetch(`/api/craic/state?gameId=${gameId}&playerId=${playerId}`);
      const data = await res.json();
      if (data.success && data.gameState) {
        setGameState(data.gameState);
        if (data.config) setConfig(data.config);
        if (data.finishData) setFinishData(data.finishData);
        setError(null);
      } else {
        setError(data.error || 'Failed to load game');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 1000);
    return () => clearInterval(id);
  }, [fetchState]);

  /* ── sound on state change ── */

  useEffect(() => {
    if (!gameState || !soundEnabled) return;
    if (prevPhaseRef.current && prevPhaseRef.current !== gameState.phase) {
      if (['flop', 'turn', 'river'].includes(gameState.phase)) playSound('deal');
      else if (gameState.phase === 'showdown') playSound('win');
    }
    if (
      prevActivePlayerRef.current !== null &&
      prevActivePlayerRef.current !== gameState.activePlayerIndex &&
      !['waiting', 'showdown', 'finished'].includes(gameState.phase)
    ) {
      const prev = gameState.players[prevActivePlayerRef.current];
      if (prev?.lastAction) playSound(prev.lastAction as any);
    }
    if (
      gameState.yourSeatIndex !== null &&
      gameState.activePlayerIndex !== -1 &&
      gameState.players[gameState.activePlayerIndex]?.seatIndex === gameState.yourSeatIndex &&
      prevActivePlayerRef.current !== gameState.activePlayerIndex
    ) {
      playSound('turn');
    }
    prevPhaseRef.current = gameState.phase;
    prevActivePlayerRef.current = gameState.activePlayerIndex;
  }, [gameState, soundEnabled]);

  /* ── handlers ── */

  const handleAction = async (action: PlayerAction, amount?: number) => {
    if (!gameId || !playerId) return;
    try {
      const res = await fetch('/api/craic/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId, action, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
        if (soundEnabled) playSound(action as any);
      }
    } catch {}
  };

  const handleSeatClick = async (seatIndex: number) => {
    if (!gameId || !playerId) return;
    try {
      const res = await fetch('/api/craic/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId, playerId,
          playerName: `Player_${playerId.slice(2, 6)}`,
          seatIndex,
        }),
      });
      const data = await res.json();
      if (data.success) setGameState(data.gameState);
      else alert(data.error || 'Failed to join');
    } catch {}
  };

  const handleStartGame = async () => {
    if (!gameId || !playerId) return;
    try {
      const res = await fetch('/api/craic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });
      const data = await res.json();
      if (data.success) setGameState(data.gameState);
      else alert(data.error || 'Failed to start game');
    } catch {}
  };

  // DEV ONLY — remove before production
  const handlePlayVsBot = async () => {
    if (!gameId || !playerId) return;
    try {
      const joinRes = await fetch('/api/craic/bot/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, requesterId: playerId }),
      });
      const joinData = await joinRes.json();
      if (!joinData.success) { alert(joinData.error || 'Failed to add bot'); return; }
      setGameState(joinData.gameState);

      const startRes = await fetch('/api/craic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });
      const startData = await startRes.json();
      if (startData.success) setGameState(startData.gameState);
      else alert(startData.error || 'Failed to start game');
    } catch {
      alert('Failed to start bot game');
    }
  };

  const handleNextHand = async () => {
    if (!gameId || !playerId) return;
    try {
      const res = await fetch('/api/craic/next-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });
      const data = await res.json();
      if (data.success) setGameState(data.gameState);
      else alert(data.error || 'Failed to start next hand');
    } catch {}
  };

  const handleFinalize = async () => {
    if (!address) return;
    setFinalizing(true);
    setFinalizeError(null);
    try {
      const res = await fetch('/api/craic/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId: address }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchState();
      } else {
        setFinalizeError(data.error || 'Failed to finalize');
      }
    } catch {
      setFinalizeError('Failed to finalize game');
    } finally {
      setFinalizing(false);
    }
  };

  /* ── loading / error ── */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Game not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  /* ── render ── */

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => router.push(`/craic-game/${gameId}`)}
            className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                showInfo
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                soundEnabled
                  ? 'bg-gray-800/50 hover:bg-gray-700/50'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 relative">
        {gameState.phase === 'finished' ? (
          <div className="absolute inset-0 overflow-y-auto">
            <GameFinished
              gameId={gameId}
              finishData={finishData}
              config={config}
              isHost={isHost}
              onFinalize={handleFinalize}
              finalizing={finalizing}
              finalizeError={finalizeError}
            />
          </div>
        ) : (
          <div className="absolute inset-0">
            <GameTable
              gameState={gameState}
              onAction={handleAction}
              onSeatClick={handleSeatClick}
              onStartGame={handleStartGame}
              onNextHand={handleNextHand}
              onPlayVsBot={process.env.NODE_ENV === 'development' ? handlePlayVsBot : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GameFinished — claim / payout UI
══════════════════════════════════════════════════════════════ */

interface GameFinishedProps {
  gameId: string;
  finishData: FinishData | null;
  config: CraicGameConfig | null;
  isHost: boolean;
  onFinalize: () => void;
  finalizing: boolean;
  finalizeError: string | null;
}

function GameFinished({
  gameId,
  finishData,
  config,
  isHost,
  onFinalize,
  finalizing,
  finalizeError,
}: GameFinishedProps) {
  const { address } = useAccount();

  const [tokenInfoMap, setTokenInfoMap] = useState<
    Record<string, { symbol: string; decimals: number }>
  >({});
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  /* ── load token metadata ── */

  useEffect(() => {
    if (!finishData) return;
    const uniq = [
      ...new Set(
        finishData.winners.flatMap(w => w.tokens.map(t => t.token)).concat(
          finishData.tokens.map(t => t.address),
        ),
      ),
    ];
    uniq.forEach(async addr => {
      if (addr === ZERO_ADDR) {
        setTokenInfoMap(prev => ({ ...prev, [addr]: { symbol: 'ETH', decimals: 18 } }));
        return;
      }
      try {
        const res = await fetch(`/api/craic/token-info?address=${addr}`);
        if (res.ok) {
          const d = await res.json();
          setTokenInfoMap(prev => ({ ...prev, [addr]: d }));
        }
      } catch {}
    });
  }, [finishData]);

  /* ── wagmi: hasClaimed ── */

  const gameHash = (finishData?.gameHash ?? null) as `0x${string}` | null;

  const { data: alreadyClaimed, refetch: refetchClaimed } = useReadContract({
    address: CRAIC_CONTRACT_ADDRESS,
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'hasClaimed',
    args: [gameHash ?? ZERO_HASH, address ?? ZERO_ADDR],
    query: { enabled: !!gameHash && !!address },
  });

  /* ── wagmi: claim ── */

  const {
    writeContract: sendClaim,
    data: claimTxHash,
    isPending: claimSigning,
    error: claimWriteError,
    reset: resetClaim,
  } = useWriteContract();

  const { isSuccess: claimConfirmed, isLoading: claimWaiting } =
    useWaitForTransactionReceipt({ hash: claimTxHash });

  useEffect(() => {
    if (claimConfirmed && !claimed) {
      setClaimed(true);
      refetchClaimed();
    }
  }, [claimConfirmed, claimed, refetchClaimed]);

  useEffect(() => {
    if (!claimWriteError) return;
    const msg = claimWriteError.message ?? '';
    setClaimError(
      msg.includes('User rejected') || msg.includes('denied')
        ? 'Transaction rejected'
        : msg.slice(0, 200),
    );
  }, [claimWriteError]);

  function handleClaim() {
    if (!gameHash || !address) return;
    setClaimError(null);
    resetClaim();
    sendClaim({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'claim',
      args: [gameHash],
    });
  }

  /* ── derived ── */

  const myWinner = finishData?.winners.find(
    w => w.address.toLowerCase() === address?.toLowerCase(),
  );
  const myRank = finishData?.rankings.find(
    r => r.address.toLowerCase() === address?.toLowerCase(),
  );
  const isFreeGame =
    !config?.buyInToken || config.buyInToken === '' || config.buyInAmount === '0';
  const processingPayouts =
    finishData !== null && !finishData.txHash && !isFreeGame;
  const claimWindowExpired =
    finishData !== null && Date.now() - finishData.finishedAt > CLAIM_WINDOW_MS;
  const claimBusy = claimSigning || claimWaiting;

  /* ── helper ── */

  function formatTokenAmount(token: string, rawAmount: string): string {
    const info = tokenInfoMap[token];
    if (!info) return rawAmount;
    return `${parseFloat(formatUnits(BigInt(rawAmount), info.decimals)).toFixed(
      info.decimals <= 6 ? 2 : 4,
    )} ${info.symbol}`;
  }

  function openSharePrompt() {
    if (!myWinner) return;
    const primaryToken = myWinner.tokens[0];
    const amountStr = primaryToken
      ? formatTokenAmount(primaryToken.token, primaryToken.amount)
      : 'some chips';
    const link = `${window.location.origin}/craic-game/${gameId}`;
    const text = encodeURIComponent(
      `Just won ${amountStr} in a Craic Home Game 🃏 ${link}`,
    );
    window.open(`https://warpcast.com/~/compose?text=${text}`, '_blank');
  }

  /* ── handle case where finish hasn't been called yet ── */

  if (!finishData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <Trophy className="w-14 h-14 mx-auto text-amber-400" />
          <h2 className="text-2xl font-black text-white">Game Over</h2>
          {isHost ? (
            <>
              <p className="text-sm text-gray-400">
                Finalize the results to distribute payouts on-chain.
              </p>
              {finalizeError && (
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-400">{finalizeError}</span>
                </div>
              )}
              <button
                onClick={onFinalize}
                disabled={finalizing}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {finalizing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Finalizing...</>
                ) : (
                  <><Trophy className="w-5 h-5" /> Finalize &amp; Pay Out</>
                )}
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Waiting for the host to finalize results&hellip;
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── main finished UI ── */

  return (
    <div className="overflow-y-auto pb-16">
      {claimed && <Confetti />}

      {/* ── My result hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 to-transparent px-4 pt-8 pb-6 text-center border-b border-gray-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 to-transparent pointer-events-none" />
        {myRank?.rank === 1 ? (
          <Crown className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
        ) : (
          <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-400" />
        )}
        <h2 className="text-2xl font-black text-white">
          {myRank ? `You placed #${myRank.rank}` : 'Game Finished'}
        </h2>
        {myRank && (
          <p className="text-sm text-gray-400 mt-1">
            {myRank.chips.toLocaleString()} chips at final bell
          </p>
        )}
      </div>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">

        {/* ── Claim panel (winners in paid games) ── */}
        {myWinner && !isFreeGame && (
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              claimed
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            {claimed ? (
              /* ── Claimed state ── */
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-black text-emerald-400">Claimed.</p>
                  <div className="mt-1 space-y-0.5">
                    {myWinner.tokens.map(t => (
                      <p key={t.token} className="text-sm text-gray-300 font-semibold">
                        {formatTokenAmount(t.token, t.amount)}
                      </p>
                    ))}
                  </div>
                </div>
                <button
                  onClick={openSharePrompt}
                  className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-purple-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share your win on Farcaster
                </button>
              </div>
            ) : processingPayouts ? (
              /* ── Payouts still processing ── */
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-400">Payouts being processed</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    The on-chain payout transaction is pending. Check back shortly.
                  </p>
                </div>
              </div>
            ) : claimWindowExpired ? (
              /* ── Window expired ── */
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-400">Claim window expired</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    The 48-hour claim window has passed. Contact the host.
                  </p>
                </div>
              </div>
            ) : alreadyClaimed ? (
              /* ── Already claimed (on-chain) ── */
              <div className="flex items-center gap-3 opacity-60">
                <Check className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <p className="text-sm text-gray-500 font-semibold">Already claimed.</p>
              </div>
            ) : (
              /* ── Ready to claim ── */
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                    Your winnings
                  </p>
                  <div className="space-y-2">
                    {myWinner.tokens.map(t => (
                      <div
                        key={t.token}
                        className="flex items-center justify-between px-3 py-2.5 bg-gray-800/40 rounded-xl"
                      >
                        <span className="text-xs text-gray-500 font-mono">
                          {t.token.slice(0, 6)}&hellip;{t.token.slice(-4)}
                        </span>
                        <span className="text-sm font-bold text-amber-400">
                          {formatTokenAmount(t.token, t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {myWinner.percent}% of prize pool &middot; Rank #{myWinner.rank}
                  </p>
                </div>

                {claimError && (
                  <div className="p-2.5 bg-red-500/10 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-400">{claimError}</span>
                  </div>
                )}

                <button
                  onClick={handleClaim}
                  disabled={claimBusy}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold text-base transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                >
                  {claimSigning ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Confirm in Wallet&hellip;</>
                  ) : claimWaiting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Confirming&hellip;</>
                  ) : (
                    <><Trophy className="w-5 h-5" /> Claim Winnings</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Free game notice ── */}
        {isFreeGame && (
          <div className="px-4 py-3 bg-gray-800/30 rounded-xl border border-gray-700/30">
            <p className="text-sm text-gray-500 text-center">No payout — free game.</p>
          </div>
        )}

        {/* ── Final rankings ── */}
        <div className="bg-gray-800/20 rounded-2xl border border-gray-700/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/30">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Final Standings
            </p>
          </div>
          <div className="divide-y divide-gray-800/50">
            {finishData.rankings.map(player => {
              const winnerInfo = finishData.winners.find(
                w => w.address.toLowerCase() === player.address.toLowerCase(),
              );
              const isMe = player.address.toLowerCase() === address?.toLowerCase();
              return (
                <div
                  key={player.address}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isMe ? 'bg-amber-500/5' : ''
                  }`}
                >
                  {/* Rank badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      player.rank === 1
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : player.rank === 2
                        ? 'bg-gray-400/20 text-gray-300'
                        : player.rank === 3
                        ? 'bg-amber-700/20 text-amber-600'
                        : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    {player.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : `#${player.rank}`}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-gray-300">
                        {player.address.slice(0, 6)}&hellip;{player.address.slice(-4)}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-amber-400 font-semibold">(you)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-600">
                      {player.chips.toLocaleString()} chips
                    </span>
                  </div>

                  {/* Payout */}
                  <div className="text-right flex-shrink-0">
                    {winnerInfo && !isFreeGame ? (
                      <div className="space-y-0.5">
                        {winnerInfo.tokens.map(t => (
                          <p key={t.token} className="text-xs font-bold text-amber-400">
                            {formatTokenAmount(t.token, t.amount)}
                          </p>
                        ))}
                        <p className="text-[10px] text-gray-600">{winnerInfo.percent}%</p>
                      </div>
                    ) : isFreeGame ? (
                      <span className="text-xs text-gray-600">—</span>
                    ) : (
                      <span className="text-xs text-gray-700">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Confetti
══════════════════════════════════════════════════════════════ */

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 45 }, (_, i) => ({
        id: i,
        left: `${(i * 2.22 + Math.abs(Math.sin(i * 0.7)) * 15) % 100}%`,
        delay: `${(i * 0.065) % 2.8}s`,
        duration: `${2.8 + (i * 0.04) % 2}s`,
        color: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FBBF24'][i % 7],
        size: `${6 + (i * 0.22) % 8}px`,
        isCircle: i % 3 === 0,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-24px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(780deg); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-24px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animationName: 'confettiFall',
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
          }}
        />
      ))}
    </div>
  );
}
