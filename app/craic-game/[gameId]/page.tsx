'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useRouter, useParams } from 'next/navigation';
import { formatUnits, parseUnits, Address } from 'viem';
import {
  ArrowLeft,
  Users,
  Trophy,
  Clock,
  Loader2,
  Wallet,
  Play,
  Share2,
  Check,
  Copy,
  AlertCircle,
  Zap,
  Shield,
  X,
  Coins,
} from 'lucide-react';
import { CraicGameConfig, CraicGameStatus, USDC_ADDRESS } from '@/lib/craic/types';
import { CRAIC_HOME_GAME_ABI, CRAIC_CONTRACT_ADDRESS, ERC20_ABI } from '@/lib/craic/contract';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

interface LobbyPlayer {
  address: string;
  name: string;
  seatIndex: number;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

type JoinPhase = 'idle' | 'approving' | 'joining' | 'registering' | 'done';

export default function GameLobby() {
  const { address, isConnected } = useAccount();
  const { hasInjected, isConnecting: walletConnecting, manualConnectors, connectWith } = useWalletConnect();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  // ── game state (polled) ──
  const [config, setConfig] = useState<CraicGameConfig | null>(null);
  const [status, setStatus] = useState<CraicGameStatus>('waiting');
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── token info ──
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  // ── join flow ──
  const [joinPhase, setJoinPhase] = useState<JoinPhase>('idle');
  const [joinError, setJoinError] = useState<string | null>(null);

  // ── start flow ──
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // ── UI ──
  const [showConnectorPicker, setShowConnectorPicker] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [baseAppLinkCopied, setBaseAppLinkCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // ── sponsor flow ──
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorToken, setSponsorToken] = useState<'eth' | 'usdc' | 'custom'>('usdc');
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [sponsorCustomToken, setSponsorCustomToken] = useState('');
  const [sponsorPhase, setSponsorPhase] = useState<'idle' | 'approving' | 'sponsoring' | 'done'>('idle');
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [poolRefreshKey, setPoolRefreshKey] = useState(0);

  // ── wagmi: approve ──
  const {
    writeContract: sendApprove,
    data: approveHash,
    isPending: approveSigning,
    error: approveWriteError,
    reset: resetApprove,
  } = useWriteContract();
  const { isSuccess: approveConfirmed, isLoading: approveWaiting } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // ── wagmi: join ──
  const {
    writeContract: sendJoin,
    data: joinTxHash,
    isPending: joinSigning,
    error: joinWriteError,
    reset: resetJoin,
  } = useWriteContract();
  const { isSuccess: joinTxConfirmed, isLoading: joinWaiting } =
    useWaitForTransactionReceipt({ hash: joinTxHash });

  // ── wagmi: sponsor approve ──
  const {
    writeContract: sendSponsorApprove,
    data: sponsorApproveHash,
    isPending: sponsorApproveSigning,
    error: sponsorApproveWriteError,
    reset: resetSponsorApprove,
  } = useWriteContract();
  const { isSuccess: sponsorApproveConfirmed, isLoading: sponsorApproveWaiting } =
    useWaitForTransactionReceipt({ hash: sponsorApproveHash });

  // ── wagmi: sponsor tx ──
  const {
    writeContract: sendSponsor,
    data: sponsorTxHash,
    isPending: sponsorSigning,
    error: sponsorWriteError,
    reset: resetSponsor,
  } = useWriteContract();
  const { isSuccess: sponsorConfirmed, isLoading: sponsorTxWaiting } =
    useWaitForTransactionReceipt({ hash: sponsorTxHash });

  // ── prize pool reads ──
  const { data: poolEth, refetch: refetchPoolEth } = useReadContract({
    address: CRAIC_CONTRACT_ADDRESS,
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'tokenBalance',
    args: config?.gameHash ? [config.gameHash as `0x${string}`, ZERO_ADDR as Address] : undefined,
    query: { enabled: !!config?.gameHash },
  });
  const { data: poolUsdc, refetch: refetchPoolUsdc } = useReadContract({
    address: CRAIC_CONTRACT_ADDRESS,
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'tokenBalance',
    args: config?.gameHash ? [config.gameHash as `0x${string}`, USDC_ADDRESS as Address] : undefined,
    query: { enabled: !!config?.gameHash },
  });

  // ── wagmi: read allowance ──
  const isErc20 =
    !!config?.buyInToken &&
    config.buyInToken !== '' &&
    config.buyInToken !== ZERO_ADDR &&
    config.buyInAmount !== '0';
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: config?.buyInToken as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CRAIC_CONTRACT_ADDRESS] : undefined,
    query: { enabled: isErc20 && !!address },
  });

  // ── derived ──
  const isFree = !config?.buyInToken || config.buyInToken === '' || config.buyInAmount === '0';
  const isEthBuyIn = config?.buyInToken === ZERO_ADDR && !isFree;
  const isPaid = !isFree;
  const hasAllowance =
    !isErc20 || (allowance !== undefined && (allowance as bigint) >= BigInt(config?.buyInAmount ?? '0'));
  const isHost = !!address && config?.host.toLowerCase() === address.toLowerCase();
  const isJoined = players.some((p) => p.address.toLowerCase() === address?.toLowerCase());
  const isWhitelisted =
    config?.entryMode !== 'leaderboard' ||
    !config.whitelist ||
    (!!address && config.whitelist.some((a) => a.toLowerCase() === address.toLowerCase()));

  const tokenDecimals = tokenInfo?.decimals ?? (isEthBuyIn ? 18 : 6);
  const tokenSymbol = tokenInfo?.symbol ?? (isEthBuyIn ? 'ETH' : '???');
  const isStable = ['USDC', 'USDT', 'DAI'].includes(tokenSymbol);
  const humanAmount =
    isPaid && config ? formatUnits(BigInt(config.buyInAmount), tokenDecimals) : '0';
  const estimatedPool = isPaid ? (parseFloat(humanAmount) * players.length).toFixed(2) : '0';
  const maxPool = isPaid && config ? (parseFloat(humanAmount) * config.maxPlayersPerTable).toFixed(2) : '0';

  const blindLabels: Record<string, string> = { turbo: 'Turbo', standard: 'Standard', deep: 'Deep' };
  const durationLabels: Record<string, string> = { turbo: '~20 min', standard: '~45 min', deep: '~90 min' };

  const joinBusy = joinPhase !== 'idle' && joinPhase !== 'done';

  // Auto-connect is handled by useWalletConnect hook.

  // ── poll game state every 10s ──
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/craic/state?gameId=${gameId}`);
        const data = await res.json();
        if (!active) return;
        if (data.success) {
          setConfig(data.config);
          setStatus(data.status);
          setPlayers(data.players || []);
          setFetchError(null);
        } else {
          setFetchError(data.error || 'Game not found');
        }
      } catch {
        if (active) setFetchError('Failed to load game');
      } finally {
        if (active) setLoading(false);
      }
    }
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [gameId]);

  // ── fetch token info when config loads ──
  useEffect(() => {
    if (!config?.buyInToken || config.buyInToken === '' || config.buyInAmount === '0') return;
    if (config.buyInToken === ZERO_ADDR) {
      setTokenInfo({ name: 'Ether', symbol: 'ETH', decimals: 18 });
      return;
    }
    fetch(`/api/craic/token-info?address=${config.buyInToken}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setTokenInfo(d); })
      .catch(() => {});
  }, [config?.buyInToken, config?.buyInAmount]);

  // ── handle write errors ──
  useEffect(() => {
    const err = approveWriteError || joinWriteError;
    if (!err) return;
    const msg = err.message || '';
    setJoinError(
      msg.includes('User rejected') || msg.includes('denied')
        ? 'Transaction rejected'
        : msg.slice(0, 200)
    );
    setJoinPhase('idle');
  }, [approveWriteError, joinWriteError]);

  // ── approve confirmed → call join ──
  useEffect(() => {
    if (!approveConfirmed || joinPhase !== 'approving' || !config?.gameHash) return;
    refetchAllowance();
    setJoinPhase('joining');
    sendJoin({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'join',
      args: [config.gameHash as `0x${string}`],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed, joinPhase]);

  // ── join confirmed → register in Redis ──
  useEffect(() => {
    if (!joinTxConfirmed || joinPhase !== 'joining') return;
    setJoinPhase('registering');
    registerJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinTxConfirmed, joinPhase]);

  // ── sponsor: approve confirmed → fire sponsor tx ──
  useEffect(() => {
    if (!sponsorApproveConfirmed || sponsorPhase !== 'approving' || !config?.gameHash) return;
    const tokenAddr = sponsorToken === 'usdc' ? USDC_ADDRESS : sponsorCustomToken;
    const decimals = sponsorToken === 'usdc' ? 6 : 18;
    const raw = parseUnits(sponsorAmount, decimals);
    setSponsorPhase('sponsoring');
    sendSponsor({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'sponsor',
      args: [config.gameHash as `0x${string}`, tokenAddr as Address, raw],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorApproveConfirmed, sponsorPhase]);

  // ── sponsor: tx confirmed → toast + refresh ──
  useEffect(() => {
    if (!sponsorConfirmed || sponsorPhase !== 'sponsoring') return;
    setSponsorPhase('done');
    setSponsorAmount('');
    setShowSponsorModal(false);
    refetchPoolEth();
    refetchPoolUsdc();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorConfirmed, sponsorPhase]);

  // ── sponsor: write errors ──
  useEffect(() => {
    const err = sponsorApproveWriteError || sponsorWriteError;
    if (!err) return;
    const msg = err.message || '';
    setSponsorError(msg.includes('User rejected') || msg.includes('denied') ? 'Transaction rejected' : msg.slice(0, 200));
    setSponsorPhase('idle');
  }, [sponsorApproveWriteError, sponsorWriteError]);

  // ── refetch pool on key change ──
  useEffect(() => {
    if (poolRefreshKey > 0) { refetchPoolEth(); refetchPoolUsdc(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolRefreshKey]);

  /* ── handlers ── */

  function handleJoin() {
    if (!config || !address) return;
    setJoinError(null);
    resetApprove();
    resetJoin();

    if (isFree) {
      setJoinPhase('registering');
      registerJoin();
      return;
    }

    if (isErc20 && !hasAllowance) {
      setJoinPhase('approving');
      sendApprove({
        address: config.buyInToken as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CRAIC_CONTRACT_ADDRESS, BigInt(config.buyInAmount)],
      });
    } else {
      setJoinPhase('joining');
      sendJoin({
        address: CRAIC_CONTRACT_ADDRESS,
        abi: CRAIC_HOME_GAME_ABI,
        functionName: 'join',
        args: [config.gameHash as `0x${string}`],
        ...(isEthBuyIn ? { value: BigInt(config.buyInAmount) } : {}),
      });
    }
  }

  async function registerJoin() {
    if (!config || !address) return;
    try {
      const taken = new Set(players.map((p) => p.seatIndex));
      const seat = [0, 1, 2, 3, 4, 5].find((i) => !taken.has(i)) ?? 0;
      const res = await fetch('/api/craic/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId: address,
          playerName: `Player_${address.slice(2, 6)}`,
          seatIndex: seat,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinPhase('done');
      } else {
        setJoinError(data.error || 'Failed to join');
        setJoinPhase('idle');
      }
    } catch {
      setJoinError('Failed to register');
      setJoinPhase('idle');
    }
  }

  async function handleStart() {
    if (!address || !config) return;
    setStarting(true);
    setStartError(null);
    try {
      if (players.length > 6) {
        const res = await fetch('/api/craic/bracket/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, playerId: address }),
        });
        const data = await res.json();
        if (!data.success) { setStartError(data.error); return; }
        router.push(`/craic-game/${gameId}/bracket`);
      } else {
        const res = await fetch('/api/craic/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, playerId: address }),
        });
        const data = await res.json();
        if (!data.success) { setStartError(data.error); return; }
        router.push(`/craic-game/${gameId}/play?playerId=${address}`);
      }
    } catch {
      setStartError('Failed to start game');
    } finally {
      setStarting(false);
    }
  }

  function handleSponsor() {
    if (!config?.gameHash || !sponsorAmount || parseFloat(sponsorAmount) <= 0) return;
    setSponsorError(null);
    resetSponsorApprove();
    resetSponsor();
    const decimals = sponsorToken === 'eth' ? 18 : sponsorToken === 'usdc' ? 6 : 18;
    const raw = parseUnits(sponsorAmount, decimals);
    if (sponsorToken === 'eth') {
      setSponsorPhase('sponsoring');
      sendSponsor({
        address: CRAIC_CONTRACT_ADDRESS,
        abi: CRAIC_HOME_GAME_ABI,
        functionName: 'sponsor',
        args: [config.gameHash as `0x${string}`, ZERO_ADDR as Address, raw],
        value: raw,
      });
    } else {
      const tokenAddr = sponsorToken === 'usdc' ? USDC_ADDRESS : sponsorCustomToken;
      setSponsorPhase('approving');
      sendSponsorApprove({
        address: tokenAddr as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CRAIC_CONTRACT_ADDRESS, raw],
      });
    }
  }

  function copyLink() {
    const url = `https://maxcraicpoker.com/craic-game/${gameId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function copyBaseAppLink() {
    const url = `https://www.base.org/miniapp?url=https://maxcraicpoker.com/craic-game/${gameId}`;
    navigator.clipboard.writeText(url);
    setBaseAppLinkCopied(true);
    setTimeout(() => setBaseAppLinkCopied(false), 2000);
  }

  /* ── loading / error states ── */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
      </div>
    );
  }

  if (fetchError || !config) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <X className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-xl font-bold text-white mb-2">Game Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{fetchError || 'This game may have ended or been cancelled.'}</p>
          <button
            onClick={() => router.push('/craic-home')}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  /* ── active game → redirect to play ── */
  if (status === 'active' && isJoined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <Play className="w-12 h-12 mx-auto mb-3 text-amber-400" />
          <h2 className="text-xl font-bold text-white mb-2">Game In Progress</h2>
          <p className="text-gray-500 text-sm mb-6">Your table is live.</p>
          <button
            onClick={() => router.push(`/craic-game/${gameId}/play?playerId=${address}`)}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl text-gray-900 font-bold shadow-lg shadow-amber-500/20"
          >
            Enter Game
          </button>
        </div>
      </div>
    );
  }

  /* ── finished → show results link ── */
  if (status === 'finished') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
          <h2 className="text-xl font-bold text-white mb-2">Game Finished</h2>
          <p className="text-gray-500 text-sm mb-6">View the results and claim your winnings.</p>
          <button
            onClick={() => router.push(`/craic-game/${gameId}/results`)}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl text-gray-900 font-bold shadow-lg shadow-amber-500/20"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  /* ── main lobby ── */

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28">
      {/* header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/craic-home')}
              className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {config.gameName || 'Game Lobby'}
              </h1>
              <p className="text-xs text-gray-600 font-mono">{gameId.slice(0, 16)}...</p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowShareMenu((v) => !v)}
              className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center hover:bg-amber-500/25 transition-colors"
            >
              <Share2 className="w-5 h-5 text-amber-400" />
            </button>
            {showShareMenu && (
              <div className="absolute top-12 right-0 z-50 w-64 bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl p-3 space-y-2">
                <button
                  onClick={() => { copyBaseAppLink(); setShowShareMenu(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors"
                >
                  <span className="text-sm font-medium text-blue-300">Share via Base App</span>
                  {baseAppLinkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
                </button>
                <button
                  onClick={() => { copyLink(); setShowShareMenu(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-colors"
                >
                  <span className="text-sm font-medium text-amber-300">Share via Browser</span>
                  {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-md mx-auto">
        {/* ── hero card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-gray-900/50 p-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 to-transparent" />
          <div className="relative">
            <StatusBadge status={status} />
            <h2 className="text-2xl font-black text-white mt-3">
              {config.gameName || 'Poker Game'}
            </h2>
            {config.description && (
              <p className="text-sm text-gray-400 mt-1">{config.description}</p>
            )}
            {config.scheduledStart && (
              <p className="text-sm text-amber-400/80 mt-1">
                Starts {new Date(config.scheduledStart).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            <div className="mt-4">
              {isFree ? (
                <div className="text-3xl font-black text-amber-400">Free Game</div>
              ) : (
                <>
                  <div className="text-3xl font-black text-amber-400">
                    {humanAmount} {tokenSymbol}
                  </div>
                  {isStable && (
                    <p className="text-sm text-gray-500 mt-0.5">~${humanAmount} buy-in</p>
                  )}
                </>
              )}
            </div>
            {isPaid && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/60 rounded-lg">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-gray-300">
                  Pool: {isStable ? `$${estimatedPool}` : `${estimatedPool} ${tokenSymbol}`}
                  <span className="text-gray-600"> / {isStable ? `$${maxPool}` : `${maxPool} ${tokenSymbol}`}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── info grid ── */}
        <div className="grid grid-cols-4 gap-2">
          <InfoCell icon={<Users className="w-4 h-4 text-amber-400" />} label="Players" value={`${players.length}/${config.maxPlayersPerTable}`} />
          <InfoCell icon={<Clock className="w-4 h-4 text-purple-400" />} label="Duration" value={durationLabels[config.blindSpeed] || '~45 min'} />
          <InfoCell icon={<Zap className="w-4 h-4 text-orange-400" />} label="Blinds" value={blindLabels[config.blindSpeed] || 'Standard'} />
          <InfoCell icon={<Trophy className="w-4 h-4 text-yellow-400" />} label="Stack" value={config.startingStack.toLocaleString()} />
        </div>

        {/* ── prize pool ── */}
        {config.gameHash && ((poolEth as bigint) > BigInt(0) || (poolUsdc as bigint) > BigInt(0)) && (
          <div className="bg-gray-800/30 rounded-2xl border border-amber-500/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/30 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Prize Pool</span>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {(poolUsdc as bigint) > BigInt(0) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">USDC</span>
                  <span className="text-sm font-bold text-amber-400">
                    {parseFloat(formatUnits(poolUsdc as bigint, 6)).toFixed(2)} USDC
                  </span>
                </div>
              )}
              {(poolEth as bigint) > BigInt(0) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">ETH</span>
                  <span className="text-sm font-bold text-amber-400">
                    {parseFloat(formatUnits(poolEth as bigint, 18)).toFixed(6)} ETH
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── whitelist gate ── */}
        {config.entryMode === 'leaderboard' && !isWhitelisted && !isJoined && (
          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Invite Only</p>
              <p className="text-xs text-gray-400 mt-0.5">
                This game is invite-only. Your wallet isn&apos;t on the list.
              </p>
            </div>
          </div>
        )}

        {/* ── players list ── */}
        <div className="bg-gray-800/30 rounded-2xl border border-gray-700/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Registrants</span>
            </div>
            <span className="text-xs text-gray-500">{players.length} joined</span>
          </div>
          <div className="p-3">
            {players.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-4">No players yet</p>
            ) : (
              <div className="space-y-1.5">
                {players.map((p) => {
                  const isMe = p.address.toLowerCase() === address?.toLowerCase();
                  const isHostPlayer = p.address.toLowerCase() === config.host.toLowerCase();
                  return (
                    <div
                      key={p.address}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                        isMe ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-gray-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {p.name}
                            {isMe && <span className="text-amber-400 ml-1 text-xs">(you)</span>}
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {p.address.slice(0, 6)}...{p.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                      {isHostPlayer && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full">
                          Host
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── sponsor button ── */}
        {config.gameHash && status === 'waiting' && (
          <button
            onClick={() => { setShowSponsorModal(true); setSponsorPhase('idle'); setSponsorError(null); }}
            className="w-full py-3 border border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-500/5 rounded-xl text-amber-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            💰 Sponsor this game
          </button>
        )}

        {/* ── host start section ── */}
        {isHost && status === 'waiting' && players.length >= 2 && (
          <div className="bg-gray-800/30 rounded-2xl border border-amber-500/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Host Controls</span>
            </div>
            <p className="text-xs text-gray-400">
              {players.length <= 6
                ? `Single table with ${players.length} players.`
                : `Bracket tournament: ${Math.ceil(players.length / 6)} tables, ${players.length} players.`}
            </p>
            {startError && (
              <div className="p-2 bg-red-500/10 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400">{startError}</span>
              </div>
            )}
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : players.length <= 6 ? (
                'Start Game'
              ) : (
                `Start Bracket (${Math.ceil(players.length / 6)} tables)`
              )}
            </button>
          </div>
        )}

        {/* ── host go to table (always visible to host) ── */}
        {isHost && status === 'waiting' && (
          <a
            href={`/craic-game/${gameId}/play`}
            className="block w-full py-3 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 hover:border-gray-600/50 rounded-xl text-gray-300 font-semibold text-center transition-all"
          >
            Go to Table
          </a>
        )}
      </div>

      {/* ── sponsor modal ── */}
      {showSponsorModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700/60 w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Sponsor this game</h3>
              <button onClick={() => setShowSponsorModal(false)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Token selector */}
            <div className="flex gap-2">
              {(['usdc', 'eth', 'custom'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSponsorToken(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    sponsorToken === t
                      ? 'bg-amber-500 text-gray-900'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t === 'usdc' ? 'USDC' : t === 'eth' ? 'ETH' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom token address */}
            {sponsorToken === 'custom' && (
              <input
                type="text"
                value={sponsorCustomToken}
                onChange={(e) => setSponsorCustomToken(e.target.value.trim())}
                placeholder="Token contract (0x...)"
                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
              />
            )}

            {/* Amount */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={sponsorAmount}
                onChange={(e) => setSponsorAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-amber-500/60 placeholder:text-gray-600"
              />
              <span className="text-sm text-gray-400 font-mono pr-1 min-w-[44px] text-right">
                {sponsorToken === 'usdc' ? 'USDC' : sponsorToken === 'eth' ? 'ETH' : '???'}
              </span>
            </div>

            {sponsorError && (
              <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-400">{sponsorError}</span>
              </div>
            )}

            <button
              onClick={handleSponsor}
              disabled={sponsorPhase !== 'idle' || !sponsorAmount || parseFloat(sponsorAmount) <= 0}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all flex items-center justify-center gap-2"
            >
              {sponsorApproveSigning || sponsorApproveWaiting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Approving…</>
              ) : sponsorSigning || sponsorTxWaiting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sponsoring…</>
              ) : (
                'Sponsor'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── success toast ── */}
      {showToast && (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full shadow-lg backdrop-blur-sm">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">Sponsorship confirmed.</span>
          </div>
        </div>
      )}

      {/* ── fixed footer ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-gray-800/50">
        <div className="max-w-md mx-auto">
          {!isConnected ? (
            <div className="space-y-2">
              {walletConnecting ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-gray-700 rounded-xl text-gray-500 font-semibold flex items-center justify-center gap-2"
                >
                  <Loader2 className="w-5 h-5 animate-spin" /> Connecting...
                </button>
              ) : hasInjected ? (
                <button
                  onClick={() => connectWith('injected')}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" /> Connect Wallet to Join
                </button>
              ) : showConnectorPicker ? (
                <>
                  {manualConnectors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { connectWith(c.id); setShowConnectorPicker(false); }}
                      className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4 text-amber-400" />
                      {c.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowConnectorPicker(false)}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowConnectorPicker(true)}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" /> Connect Wallet to Join
                </button>
              )}
            </div>
          ) : isJoined || joinPhase === 'done' ? (
            <div className="space-y-2">
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">You&apos;re in. Waiting for host to start.</span>
                </div>
              </div>
              {status === 'active' && (
                <button
                  onClick={() => router.push(`/craic-game/${gameId}/play?playerId=${address}`)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl text-gray-900 font-bold shadow-lg shadow-amber-500/20"
                >
                  Enter Game
                </button>
              )}
            </div>
          ) : !isWhitelisted ? (
            <button
              disabled
              className="w-full py-3.5 bg-gray-800 rounded-xl text-gray-600 font-semibold cursor-not-allowed"
            >
              Not on Whitelist
            </button>
          ) : (
            <div className="space-y-2">
              {joinError && (
                <div className="p-2 bg-red-500/10 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400">{joinError}</span>
                </div>
              )}
              <button
                onClick={handleJoin}
                disabled={joinBusy || status !== 'waiting'}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-500 rounded-xl text-gray-900 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {joinPhase === 'approving' && approveSigning ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Approve in Wallet...</>
                ) : joinPhase === 'approving' && approveWaiting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Approving token...</>
                ) : joinPhase === 'joining' && joinSigning ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Confirm join...</>
                ) : joinPhase === 'joining' && joinWaiting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Joining game...</>
                ) : joinPhase === 'registering' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registering...</>
                ) : isFree ? (
                  'Join Game'
                ) : (
                  `Join for ${humanAmount} ${tokenSymbol}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── small components ── */

function StatusBadge({ status }: { status: CraicGameStatus }) {
  const styles: Record<CraicGameStatus, string> = {
    waiting: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    finished: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span
      className={`inline-flex px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-2.5 bg-gray-800/30 rounded-xl border border-gray-700/30 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-white mt-0.5">{value}</div>
    </div>
  );
}
