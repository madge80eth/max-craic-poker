'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useConnect } from 'wagmi';
import { ClientGameState, PlayerAction } from '@/lib/poker/types';
import Table from '../components/Table';
import Link from 'next/link';
import { usePokerSounds } from '../hooks/usePokerSounds';
import { ArrowLeft, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let guestId = sessionStorage.getItem('poker_guest_id');
  if (!guestId) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('poker_guest_id', guestId);
  }
  return guestId;
}

interface PageProps {
  params: Promise<{ tableId: string }>;
}

export default function PokerTable({ params }: PageProps) {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { playSound, toggleSounds } = usePokerSounds();
  const [isConnecting, setIsConnecting] = useState(false);
  const [guestId, setGuestId] = useState('');

  // Generate guest ID on mount
  useEffect(() => {
    setGuestId(getGuestId());
  }, []);

  // Auto-connect Farcaster wallet if in Farcaster context
  useEffect(() => {
    if (isConnected || isConnecting) return;

    const isFarcaster = typeof window !== 'undefined' && (window as any).farcaster;

    if (isFarcaster && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp' || c.name.toLowerCase().includes('farcaster'));
      if (farcasterConnector) {
        setIsConnecting(true);
        connect({ connector: farcasterConnector }, {
          onSettled: () => setIsConnecting(false)
        });
      }
    }
  }, [isConnected, isConnecting, connectors, connect]);

  const [tableId, setTableId] = useState<string>('');
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sybilError, setSybilError] = useState<string | null>(null);
  const [eliminatedInfo, setEliminatedInfo] = useState<{ position: number; total: number } | null>(null);
  const [movingToTable, setMovingToTable] = useState<string | null>(null);
  const prevStateRef = useRef<ClientGameState | null>(null);

  const playerIdParam = searchParams.get('playerId');
  const playerNameParam = searchParams.get('playerName');
  const playerId = playerIdParam || address || guestId || null;
  const playerName = playerNameParam || (address ? `Player_${address.slice(2, 6)}` : (typeof window !== 'undefined' ? sessionStorage.getItem('poker_guest_name') : null) || 'Guest');

  useEffect(() => {
    params.then(p => setTableId(p.tableId));
  }, [params]);

  const fetchState = useCallback(async () => {
    if (!tableId) return;

    try {
      const res = await fetch(`/api/poker/state?tableId=${tableId}&playerId=${playerId || ''}`);
      const data = await res.json();

      if (data.success) {
        // MTT: Player was moved to a new table
        if (data.moved && data.newTableId) {
          setMovingToTable(data.newTableId);
          setTimeout(() => {
            window.location.href = `/poker/${data.newTableId}?playerId=${encodeURIComponent(playerId || '')}&playerName=${encodeURIComponent(playerName)}`;
          }, 2000);
          return;
        }

        // MTT: Player was eliminated
        if (data.eliminated) {
          setEliminatedInfo({ position: data.finishPosition, total: data.totalPlayers });
          if (data.gameState) setGameState(data.gameState);
          return;
        }

        setGameState(data.gameState);
        setError(null);
      } else {
        setError(data.error || 'Failed to load game');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [tableId, playerId, playerName]);

  useEffect(() => {
    if (!tableId) return;
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [tableId, fetchState]);

  // Sound effects
  useEffect(() => {
    if (!gameState || !prevStateRef.current) {
      prevStateRef.current = gameState;
      return;
    }

    const prev = prevStateRef.current;

    if (gameState.phase !== prev.phase) {
      if (['preflop', 'flop', 'turn', 'river'].includes(gameState.phase)) {
        playSound('deal');
      }
    }

    if (gameState.winners?.length && !prev.winners?.length) {
      playSound('win');
    }

    if (gameState.activePlayerIndex !== prev.activePlayerIndex && gameState.yourSeatIndex !== null) {
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      if (activePlayer?.seatIndex === gameState.yourSeatIndex) {
        playSound('turn');
      }
    }

    gameState.players.forEach(player => {
      const prevPlayer = prev.players.find(p => p.odentity === player.odentity);
      if (prevPlayer && player.lastAction !== prevPlayer.lastAction && player.lastAction) {
        if (player.seatIndex !== gameState.yourSeatIndex) {
          const soundMap: Record<string, 'fold' | 'check' | 'call' | 'raise' | 'allIn'> = {
            fold: 'fold', check: 'check', call: 'call', raise: 'raise', allin: 'allIn'
          };
          const sound = soundMap[player.lastAction];
          if (sound) playSound(sound);
        }
      }
    });

    prevStateRef.current = gameState;
  }, [gameState, playSound]);

  const handleSeatClick = async (seatIndex: number) => {
    if (!playerId || !tableId) return;
    if (gameState?.players.some(p => p.odentity === playerId)) return;

    try {
      const res = await fetch('/api/poker/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, playerId, playerName, seatIndex }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.redirect) {
          // Table was full - redirected to overflow table
          window.location.href = `/poker/${data.redirect}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`;
          return;
        }
        setGameState(data.gameState);
      } else if (data.sybilFailed) {
        // Show styled sybil error instead of alert
        setSybilError(data.error || 'You do not meet the requirements to join this table.');
      } else {
        alert(data.error || 'Failed to join table');
      }
    } catch {
      alert('Failed to join table');
    }
  };

  const handleStartGame = async () => {
    if (!playerId || !tableId) return;

    try {
      const res = await fetch('/api/poker/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, playerId }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to start game');
      }
    } catch {
      alert('Failed to start game');
    }
  };

  const handleAction = async (action: PlayerAction, amount?: number) => {
    if (!playerId || !tableId || actionPending) return;

    const soundMap: Record<string, 'fold' | 'check' | 'call' | 'raise' | 'allIn'> = {
      fold: 'fold', check: 'check', call: 'call', raise: 'raise', allin: 'allIn'
    };
    const sound = soundMap[action];
    if (sound) playSound(sound);

    setActionPending(true);
    try {
      const res = await fetch('/api/poker/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, playerId, action, amount }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to perform action');
      }
    } catch {
      alert('Failed to perform action');
    } finally {
      setActionPending(false);
    }
  };

  const handleNextHand = async () => {
    if (!playerId || !tableId) return;

    try {
      const res = await fetch('/api/poker/next-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, playerId }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      }
      // Silently ignore errors — "Can only start next hand after showdown" is a
      // benign race condition when the auto-advance timer fires after the hand
      // has already transitioned via polling or another player's action.
    } catch {
      // Network errors during auto-advance are also benign — the poll loop
      // will pick up the correct state on the next tick.
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-600/20 flex items-center justify-center animate-pulse">
            <span className="text-2xl">♠</span>
          </div>
          <div className="text-gray-400">Loading table...</div>
        </div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Table not found'}</div>
          <Link
            href="/poker"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  const isSeated = gameState.yourSeatIndex !== null;
  const yourPlayer = isSeated ? gameState.players.find(p => p.seatIndex === gameState.yourSeatIndex) : null;
  const isSittingOut = yourPlayer?.sitOut || false;

  const handleSitOut = async (sitOut: boolean) => {
    if (!playerId || !tableId) return;
    try {
      const res = await fetch('/api/poker/sit-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, playerId, sitOut }),
      });
      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      }
    } catch {
      // Silently handle errors
    }
  };

  return (
    <div className="h-screen bg-[#0a0c10] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 z-40 flex items-center justify-between px-2 py-1.5" style={{ background: '#0d0f14', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link
          href="/poker"
          className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2">
          {isSeated && gameState.phase !== 'waiting' && (
            <button
              onClick={() => handleSitOut(!isSittingOut)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                isSittingOut
                  ? 'bg-green-700 hover:bg-green-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
            >
              {isSittingOut ? "I'm Back" : 'Sit Out'}
            </button>
          )}

          <button
            onClick={() => {
              const newState = !soundEnabled;
              setSoundEnabled(newState);
              toggleSounds(newState);
            }}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Table Container - fills remaining space */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <Table
            gameState={gameState}
            onAction={handleAction}
            onSeatClick={handleSeatClick}
            onStartGame={isSeated ? handleStartGame : undefined}
            onNextHand={isSeated ? handleNextHand : undefined}
          />
        </div>
      </div>

      {/* Sybil Error Modal */}
      {/* MTT: Moving to new table overlay */}
      {movingToTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-emerald-500/30 w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
              <span className="text-2xl">♠</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Table Change</h3>
            <p className="text-sm text-gray-400">Moving you to a new table...</p>
          </div>
        </div>
      )}

      {/* MTT: Eliminated modal */}
      {eliminatedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700/30 w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="text-4xl mb-4">💀</div>
            <h3 className="text-lg font-bold text-white mb-2">Eliminated</h3>
            <p className="text-sm text-gray-400 mb-1">
              You finished <span className="text-white font-bold">{eliminatedInfo.position}{ordSuffix(eliminatedInfo.position)}</span>
            </p>
            <p className="text-xs text-gray-500 mb-6">out of {eliminatedInfo.total} players</p>
            <Link
              href="/poker"
              className="inline-block w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Back to Lobby
            </Link>
          </div>
        </div>
      )}

      {sybilError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl border border-red-500/30 w-full max-w-sm shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Access Denied</h3>
              <p className="text-sm text-gray-400 mb-6">{sybilError}</p>
              <div className="flex gap-3">
                <Link
                  href="/poker"
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors text-center text-sm"
                >
                  Back to Lobby
                </Link>
                <button
                  onClick={() => setSybilError(null)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ordSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
