'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import { formatUnits, Address } from 'viem';
import {
  ArrowLeft,
  Trophy,
  Loader2,
  Play,
  ChevronRight,
  AlertCircle,
  Crown,
  Zap,
  Check,
} from 'lucide-react';
import { BracketState, CraicGameConfig } from '@/lib/craic/types';
import { CRAIC_HOME_GAME_ABI, CRAIC_CONTRACT_ADDRESS } from '@/lib/craic/contract';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as Address;
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

interface TableStatus {
  gameId: string;
  phase: string;
  playerCount: number;
  playersRemaining: number;
  players: { address: string; name: string }[];
}

export default function BracketView() {
  const { address } = useAccount();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [config, setConfig] = useState<CraicGameConfig | null>(null);
  const [currentRoundTables, setCurrentRoundTables] = useState<TableStatus[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{ symbol: string; decimals: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isHost = !!address && !!config && config.host.toLowerCase() === address.toLowerCase();

  const isPaid =
    !!config?.buyInToken &&
    config.buyInToken !== '' &&
    config.buyInAmount !== '0';
  const gameHash = (config?.gameHash ?? null) as `0x${string}` | null;
  const buyInTokenAddr = (config?.buyInToken || ZERO_ADDR) as Address;

  // On-chain escrow balance
  const { data: escrowBalance } = useReadContract({
    address: CRAIC_CONTRACT_ADDRESS,
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'tokenBalance',
    args: [gameHash ?? ZERO_HASH, buyInTokenAddr],
    query: { enabled: !!gameHash && isPaid },
  });

  // Fetch bracket + config together
  const fetchBracket = useCallback(async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/craic/bracket/state?gameId=${gameId}`),
        fetch(`/api/craic/state?gameId=${gameId}`),
      ]);
      const bData = await bRes.json();
      const cData = await cRes.json();
      if (bData.success) {
        setBracket(bData.bracket);
        setCurrentRoundTables(bData.currentRoundTables ?? []);
        setFetchError(null);
      } else {
        setFetchError(bData.error || 'Bracket not found');
      }
      if (cData.success) setConfig(cData.config);
    } catch {
      setFetchError('Failed to load bracket');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchBracket();
    const id = setInterval(fetchBracket, 10000);
    return () => clearInterval(id);
  }, [fetchBracket]);

  // Token info for prize pool label
  useEffect(() => {
    if (!config?.buyInToken || config.buyInToken === '' || config.buyInAmount === '0') return;
    if (config.buyInToken === ZERO_ADDR) {
      setTokenInfo({ symbol: 'ETH', decimals: 18 });
      return;
    }
    fetch(`/api/craic/token-info?address=${config.buyInToken}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setTokenInfo(d); })
      .catch(() => {});
  }, [config?.buyInToken, config?.buyInAmount]);

  // Derived
  const currentRound = bracket ? bracket.rounds[bracket.currentRound - 1] : null;
  const allCurrentDone =
    currentRoundTables.length > 0 &&
    currentRoundTables.every(t => t.phase === 'finished');
  const isFinalRound =
    (currentRound?.tables.length ?? 0) === 1 &&
    (bracket?.currentRound ?? 0) > 1;
  const tournamentComplete = bracket?.status === 'complete';

  const canEndTournament = isHost && allCurrentDone && isFinalRound && !tournamentComplete;
  const canAdvance = isHost && allCurrentDone && !isFinalRound && !tournamentComplete;

  const tokenDecimals = tokenInfo?.decimals ?? 6;
  const tokenSymbol = tokenInfo?.symbol ?? '???';
  const prizePool = escrowBalance
    ? `${formatUnits(escrowBalance as bigint, tokenDecimals)} ${tokenSymbol}`
    : isPaid && config && bracket
    ? `${formatUnits(
        BigInt(config.buyInAmount) * BigInt(bracket.totalPlayers),
        tokenDecimals
      )} ${tokenSymbol}`
    : 'Free';

  const tablesWaiting = currentRoundTables.filter(t => t.phase !== 'finished').length;

  async function handleAdvance() {
    if (!address) return;
    setAdvancing(true);
    setActionError(null);
    try {
      const res = await fetch('/api/craic/bracket/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId: address }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchBracket();
      } else {
        setActionError(data.error || 'Failed to advance bracket');
      }
    } catch {
      setActionError('Failed to advance bracket');
    } finally {
      setAdvancing(false);
    }
  }

  async function handleEndTournament() {
    if (!address || !currentRound) return;
    setFinishing(true);
    setActionError(null);
    // Always call finish on the final TABLE's gameId, not the parent gameId.
    // The final table's config inherits the parent's gameHash so on-chain
    // completeGame targets the correct escrow.
    const finalTableId = currentRound.tables[0];
    try {
      const res = await fetch('/api/craic/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: finalTableId, playerId: address }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/craic-game/${gameId}/results`);
      } else {
        setActionError(data.error || 'Failed to finish tournament');
      }
    } catch {
      setActionError('Failed to finish tournament');
    } finally {
      setFinishing(false);
    }
  }

  /* ── loading / error ── */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
      </div>
    );
  }

  if (fetchError || !bracket) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Bracket Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{fetchError}</p>
          <button
            onClick={() => router.push(`/craic-game/${gameId}`)}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  /* ── main render ── */

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28">
      {/* ── sticky header ── */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button
            onClick={() => router.push(`/craic-game/${gameId}`)}
            className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">
              {config?.gameName ?? 'Tournament'} &mdash; Bracket
            </h1>
            <p className="text-xs text-gray-500">
              {bracket.totalPlayers} players &middot; Round {bracket.currentRound}
              {!tournamentComplete ? ` of ${bracket.rounds.length}+` : ` of ${bracket.rounds.length}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-amber-400">{prizePool}</div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wider">Prize Pool</div>
          </div>
        </div>
      </div>

      {/* ── bracket draw — horizontal scroll ── */}
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex items-start px-4 py-8" style={{ minWidth: 'max-content', gap: 0 }}>
          {bracket.rounds.map((round, roundIdx) => {
            const isCurrent = round.roundNumber === bracket.currentRound;
            const isPast = round.roundNumber < bracket.currentRound;
            const isFinal = round.tables.length === 1 && round.roundNumber > 1;

            return (
              <div key={round.roundNumber} className="flex items-start">
                {/* ── Round column ── */}
                <div className="w-52">
                  {/* Column label */}
                  <div className="text-center mb-3 px-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isCurrent
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : isPast
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                          : 'bg-gray-800/50 text-gray-600 border-gray-700/30'
                      }`}
                    >
                      {isFinal ? (
                        <>
                          <Crown className="w-3 h-3" /> Final Table
                        </>
                      ) : (
                        <>Round {round.roundNumber}</>
                      )}
                    </span>
                  </div>

                  {/* Table cards */}
                  <div className="space-y-2.5 px-2">
                    {round.tables.map((tableId, tableIdx) => {
                      const live = isCurrent
                        ? currentRoundTables.find(t => t.gameId === tableId)
                        : undefined;
                      const tableFinished = isPast || live?.phase === 'finished';
                      const winnerAddr = isPast ? (round.winners[tableIdx] ?? null) : null;
                      const isLive = isCurrent && !tableFinished;

                      return (
                        <div
                          key={tableId}
                          className={`rounded-xl border p-3 transition-colors ${
                            isLive
                              ? 'border-amber-500/40 bg-[#1a1400] shadow-md shadow-amber-500/10'
                              : tableFinished
                              ? 'border-emerald-700/30 bg-[#0d1a0e]'
                              : 'border-gray-800/40 bg-gray-900/30 opacity-50'
                          }`}
                        >
                          {/* Card header */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Table {tableIdx + 1}
                            </span>
                            <TableStatusBadge phase={live?.phase} isPast={isPast} />
                          </div>

                          {/* Player list */}
                          {live?.players && live.players.length > 0 ? (
                            <div className="space-y-1 mb-2">
                              {live.players.map(p => (
                                <div key={p.address} className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/70 flex-shrink-0" />
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    {p.address.slice(0, 6)}&hellip;{p.address.slice(-4)}
                                  </span>
                                </div>
                              ))}
                              {!tableFinished && (
                                <p className="text-[10px] text-gray-600 pt-0.5">
                                  {live.playersRemaining}/{live.playerCount} remaining
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-700 font-mono mb-2 truncate">
                              {tableId.slice(-14)}
                            </p>
                          )}

                          {/* Winner (past rounds) */}
                          {winnerAddr && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 rounded-lg mt-1">
                              <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                              <span className="text-[11px] text-yellow-400 font-mono">
                                {winnerAddr.slice(0, 6)}&hellip;{winnerAddr.slice(-4)}
                              </span>
                            </div>
                          )}

                          {/* Go to Table (active tables only) */}
                          {isLive && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/craic-game/${tableId}/play?playerId=${address ?? ''}`
                                )
                              }
                              className="mt-2 w-full py-1.5 bg-amber-500/15 hover:bg-amber-500/25 rounded-lg text-amber-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Go to Table
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Byes */}
                    {round.byes.length > 0 && (
                      <div className="px-2.5 py-2 bg-orange-500/5 rounded-xl border border-orange-500/15">
                        <p className="text-[10px] text-orange-400/70 uppercase tracking-wider font-semibold mb-1">
                          Bye (auto-advance)
                        </p>
                        {round.byes.map(addr => (
                          <p key={addr} className="text-[11px] text-gray-500 font-mono">
                            {addr.slice(0, 6)}&hellip;{addr.slice(-4)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow connector */}
                {roundIdx < bracket.rounds.length - 1 && (
                  <div className="flex items-center self-center px-1 pt-12">
                    <ChevronRight
                      className={`w-5 h-5 ${
                        roundIdx < bracket.currentRound - 1
                          ? 'text-emerald-600'
                          : 'text-gray-700'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Champion box — appears when bracket is complete ── */}
          {tournamentComplete && (() => {
            const lastRound = bracket.rounds[bracket.rounds.length - 1];
            const champion = lastRound?.winners[0] ?? null;
            return (
              <div className="flex items-center self-center pt-12">
                <ChevronRight className="w-5 h-5 text-yellow-600 mx-1" />
                <div className="w-44">
                  <div className="text-center mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Crown className="w-3 h-3" /> Champion
                    </span>
                  </div>
                  <div className="p-4 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/5 text-center">
                    <Crown className="w-7 h-7 text-yellow-400 mx-auto mb-2" />
                    {champion ? (
                      <p className="text-xs text-yellow-300 font-mono">
                        {champion.slice(0, 6)}&hellip;{champion.slice(-4)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">TBD</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── progress info (non-host, tournament active) ── */}
      {!tournamentComplete && !allCurrentDone && (
        <div className="px-4 max-w-5xl mx-auto mt-2">
          <div className="p-3 bg-gray-800/20 rounded-xl border border-gray-700/30 flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
            <p className="text-sm text-gray-400">
              Round {bracket.currentRound} in progress &mdash; {tablesWaiting} table
              {tablesWaiting !== 1 ? 's' : ''} still playing
            </p>
          </div>
        </div>
      )}

      {/* ── tournament complete banner (non-host) ── */}
      {tournamentComplete && !isHost && (
        <div className="px-4 pt-4 max-w-5xl mx-auto">
          <div className="bg-gradient-to-b from-emerald-500/10 to-gray-900/50 rounded-2xl border border-emerald-500/20 p-6 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-400" />
            <h2 className="text-lg font-black text-white">Tournament Complete</h2>
            <p className="text-sm text-gray-400 mt-1">
              {bracket.totalPlayers} players &middot; {bracket.rounds.length} rounds
            </p>
            <button
              onClick={() => router.push(`/craic-game/${gameId}/results`)}
              className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-semibold text-sm transition-colors"
            >
              View Results
            </button>
          </div>
        </div>
      )}

      {/* ── host controls — fixed footer ── */}
      {isHost && (canAdvance || canEndTournament || tournamentComplete) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto space-y-2">
            {actionError && (
              <div className="p-2 bg-red-500/10 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">{actionError}</span>
              </div>
            )}

            {canEndTournament ? (
              <button
                onClick={handleEndTournament}
                disabled={finishing}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {finishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Distributing Payouts...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" /> End Tournament &amp; Distribute Payouts
                  </>
                )}
              </button>
            ) : canAdvance ? (
              <button
                onClick={handleAdvance}
                disabled={advancing}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {advancing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Starting Round{' '}
                    {(bracket.currentRound ?? 0) + 1}...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" /> Start Round {(bracket.currentRound ?? 0) + 1}
                  </>
                )}
              </button>
            ) : tournamentComplete ? (
              <button
                disabled
                className="w-full py-3.5 bg-gray-800 rounded-xl text-gray-500 font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5 text-emerald-500" /> Tournament Complete
              </button>
            ) : (
              <div className="py-3 text-center text-sm text-gray-500">
                Waiting for all tables in Round {bracket.currentRound} to finish&hellip;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── sub-components ── */

function TableStatusBadge({
  phase,
  isPast,
}: {
  phase?: string;
  isPast: boolean;
}) {
  if (isPast || phase === 'finished') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold uppercase tracking-wider">
        <Check className="w-2.5 h-2.5" /> Done
      </span>
    );
  }
  if (!phase || phase === 'waiting') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-700/40 text-gray-500 text-[9px] font-semibold uppercase tracking-wider">
        Waiting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-semibold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Active
    </span>
  );
}
