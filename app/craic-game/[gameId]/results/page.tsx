'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import { formatUnits, Address } from 'viem';
import {
  ArrowLeft,
  Check,
  Loader2,
  Trophy,
  AlertCircle,
  Crown,
  ExternalLink,
  Medal,
  Wallet,
} from 'lucide-react';
import { CRAIC_HOME_GAME_ABI, CRAIC_CONTRACT_ADDRESS } from '@/lib/craic/contract';

interface TokenPayout {
  token: string;
  amount: string;
}

interface WinnerEntry {
  address: string;
  name: string;
  chips: number;
  rank: number;
  percent: number;
  tokens: TokenPayout[];
}

interface RankingEntry {
  address: string;
  name: string;
  chips: number;
  rank: number;
}

interface TokenEntry {
  address: string;
  escrowBalance: string;
}

interface FinishData {
  gameId: string;
  gameHash: string | null;
  rankings: RankingEntry[];
  payoutStructure: number[];
  winners: WinnerEntry[];
  tokens: TokenEntry[];
  protocolFeeBps: number;
  txHash: string | null;
  calldata: string | null;
  finishedAt: number;
}

interface TokenMeta {
  [address: string]: { symbol: string; decimals: number };
}

export default function ResultsPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [finishData, setFinishData] = useState<FinishData | null>(null);
  const [tokenMeta, setTokenMeta] = useState<TokenMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // ── wagmi: claim ──
  const {
    writeContract: sendClaim,
    data: claimHash,
    isPending: claimSigning,
    error: claimWriteError,
    reset: resetClaim,
  } = useWriteContract();
  const { isSuccess: claimConfirmed, isLoading: claimWaiting } =
    useWaitForTransactionReceipt({ hash: claimHash });

  // ── on-chain: hasClaimed ──
  const gameHash = finishData?.gameHash as `0x${string}` | undefined;
  const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({
    address: CRAIC_CONTRACT_ADDRESS,
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'hasClaimed',
    args: gameHash && address ? [gameHash, address] : undefined,
    query: { enabled: !!gameHash && !!address },
  });

  // ── derived ──
  const isWinner =
    !!address &&
    !!finishData?.winners.some(
      (w) => w.address.toLowerCase() === address.toLowerCase() && w.percent > 0
    );
  const myWinnerEntry =
    address && finishData
      ? finishData.winners.find((w) => w.address.toLowerCase() === address.toLowerCase())
      : null;
  const myRank =
    address && finishData
      ? finishData.rankings.find((r) => r.address.toLowerCase() === address.toLowerCase())
      : null;
  const alreadyClaimed = hasClaimed === true || claimConfirmed;
  const onChainReady = !!finishData?.txHash;
  const claimBusy = claimSigning || claimWaiting;

  // ── fetch finish data ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/craic/results?gameId=${gameId}`);
        const data = await res.json();
        if (data.success) {
          setFinishData(data.finishData);
        } else {
          setError(data.error || 'Results not found');
        }
      } catch {
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameId]);

  // ── fetch token metadata ──
  useEffect(() => {
    if (!finishData?.tokens.length) return;
    const addrs = finishData.tokens.map((t) => t.address);
    Promise.all(
      addrs.map(async (a) => {
        if (a === '0x0000000000000000000000000000000000000000') {
          return { address: a, symbol: 'ETH', decimals: 18 };
        }
        try {
          const res = await fetch(`/api/craic/token-info?address=${a}`);
          if (res.ok) {
            const d = await res.json();
            return { address: a, symbol: d.symbol, decimals: d.decimals };
          }
        } catch {}
        return { address: a, symbol: a.slice(0, 6), decimals: 18 };
      })
    ).then((results) => {
      const meta: TokenMeta = {};
      for (const r of results) meta[r.address] = { symbol: r.symbol, decimals: r.decimals };
      setTokenMeta(meta);
    });
  }, [finishData?.tokens]);

  // ── handle claim write error ──
  useEffect(() => {
    if (!claimWriteError) return;
    const msg = claimWriteError.message || '';
    setClaimError(
      msg.includes('User rejected') || msg.includes('denied')
        ? 'Transaction rejected'
        : msg.slice(0, 200)
    );
  }, [claimWriteError]);

  // ── refetch claimed status after claim confirms ──
  useEffect(() => {
    if (claimConfirmed) refetchClaimed();
  }, [claimConfirmed, refetchClaimed]);

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

  function fmtAmount(raw: string, tokenAddr: string): string {
    const meta = tokenMeta[tokenAddr];
    if (!meta) return raw;
    const human = formatUnits(BigInt(raw), meta.decimals);
    const num = parseFloat(human);
    return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(4)} ${meta.symbol}`;
  }

  /* ── loading / error ── */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error || !finishData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">No Results Yet</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push(`/craic-game/${gameId}`)}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-colors"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  const { rankings, winners, payoutStructure } = finishData;

  /* ── main ── */

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-8">
      {/* header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-3 flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => router.push(`/craic-game/${gameId}`)}
            className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Results</h1>
            <p className="text-xs text-gray-500">Game finished</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        {/* ── winner spotlight ── */}
        {rankings.length > 0 && (
          <div className="bg-gradient-to-b from-amber-500/10 to-gray-900/50 rounded-2xl border border-amber-500/20 p-6 text-center">
            <Crown className="w-10 h-10 mx-auto mb-2 text-yellow-400" />
            <p className="text-xs text-gray-400 uppercase tracking-wider">Winner</p>
            <p className="text-2xl font-black text-white mt-1">{rankings[0].name}</p>
            <p className="text-xs text-gray-600 font-mono mt-0.5">
              {rankings[0].address.slice(0, 6)}...{rankings[0].address.slice(-4)}
            </p>
            <p className="text-sm text-amber-400 font-semibold mt-2">
              {rankings[0].chips.toLocaleString()} chips
            </p>
          </div>
        )}

        {/* ── your result ── */}
        {myRank && (
          <div
            className={`rounded-2xl border p-4 ${
              isWinner
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-gray-800/30 border-gray-700/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isWinner ? 'bg-amber-500/20' : 'bg-gray-800'
                }`}
              >
                {isWinner ? (
                  <Trophy className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Medal className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  You finished #{myRank.rank}
                  {isWinner ? ' — In the money!' : ''}
                </p>
                <p className="text-xs text-gray-500">{myRank.chips.toLocaleString()} chips</p>
              </div>
            </div>

            {/* payout details */}
            {myWinnerEntry && myWinnerEntry.percent > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700/30 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Payout share</span>
                  <span className="font-semibold text-amber-400">{myWinnerEntry.percent}%</span>
                </div>
                {myWinnerEntry.tokens.map((tp) => (
                  <div key={tp.token} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {tokenMeta[tp.token]?.symbol || tp.token.slice(0, 6)}
                    </span>
                    <span className="font-semibold text-white">{fmtAmount(tp.amount, tp.token)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── claim section ── */}
        {isWinner && gameHash && (
          <div className="bg-gray-800/30 rounded-2xl border border-amber-500/20 p-4 space-y-3">
            {!onChainReady ? (
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-400">Payouts pending</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    The on-chain payout transaction hasn&apos;t confirmed yet. The host may need to retry.
                  </p>
                </div>
              </div>
            ) : alreadyClaimed ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">Claimed</p>
                  <p className="text-xs text-gray-500">Tokens have been sent to your wallet.</p>
                </div>
              </div>
            ) : !isConnected ? (
              <button
                onClick={() => {
                  const c = connectors.find((x) => x.id === 'coinbaseWallet') || connectors[0];
                  if (c) connect({ connector: c });
                }}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet to Claim
              </button>
            ) : (
              <>
                {claimError && (
                  <div className="p-2 bg-red-500/10 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs text-red-400">{claimError}</span>
                  </div>
                )}
                <button
                  onClick={handleClaim}
                  disabled={claimBusy}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {claimSigning ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Approve in Wallet...</>
                  ) : claimWaiting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Claiming...</>
                  ) : (
                    <><Trophy className="w-5 h-5" /> Claim Winnings</>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── full rankings ── */}
        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/30 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Final Rankings</span>
          </div>
          <div className="divide-y divide-gray-700/20">
            {rankings.map((r) => {
              const winner = winners.find(
                (w) => w.address.toLowerCase() === r.address.toLowerCase()
              );
              const isPaid = !!winner && winner.percent > 0;
              const isMe = r.address.toLowerCase() === address?.toLowerCase();
              return (
                <div
                  key={r.address}
                  className={`flex items-center justify-between px-4 py-3 ${
                    isMe ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <RankIcon rank={r.rank} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {r.name}
                        {isMe && <span className="text-amber-400 text-xs ml-1">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-600 font-mono">
                        {r.address.slice(0, 6)}...{r.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-white">
                      {r.chips.toLocaleString()}
                    </div>
                    {isPaid && (
                      <div className="text-xs text-amber-400 font-semibold">{winner!.percent}%</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* payout structure footer */}
          <div className="px-4 py-2.5 border-t border-gray-700/30 bg-gray-800/20">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">
              Payout: Top {payoutStructure.length} — {payoutStructure.join('/')}
            </p>
          </div>
        </div>

        {/* ── tx link ── */}
        {finishData.txHash && (
          <a
            href={`https://basescan.org/tx/${finishData.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-amber-400 transition-colors py-2"
          >
            <ExternalLink className="w-4 h-4" />
            View on BaseScan
          </a>
        )}
      </div>
    </div>
  );
}

/* ── helpers ── */

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
        <span className="text-sm font-black text-yellow-400">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-400/20 flex items-center justify-center">
        <span className="text-sm font-black text-gray-300">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
        <span className="text-sm font-black text-orange-400">3</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
      <span className="text-sm font-bold text-gray-500">{rank}</span>
    </div>
  );
}
