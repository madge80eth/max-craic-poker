'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Volume2, VolumeX, ArrowLeft, Info } from 'lucide-react';
import Table from '@/app/poker/components/Table';
import { ClientGameState, PlayerAction } from '@/lib/poker/types';

// Sound effects - only play deal sound, everything else silenced
const playSound = (type: 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'deal' | 'turn' | 'win') => {
  if (typeof window === 'undefined') return;
  if (type !== 'deal') return;

  try {
    const audio = new Audio('/sounds/deal.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};

export default function GamePlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();

  const gameId = params.gameId as string;
  const playerId = searchParams.get('playerId') || address || '';

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const prevPhaseRef = useRef<string | null>(null);
  const prevActivePlayerRef = useRef<number | null>(null);

  // Fetch game state
  const fetchState = useCallback(async () => {
    if (!gameId || !playerId) return;

    try {
      // Use Craic-specific API
      const res = await fetch(`/api/craic/state?gameId=${gameId}&playerId=${playerId}`);
      const data = await res.json();

      if (data.success && data.gameState) {
        setGameState(data.gameState);
        setError(null);
      } else {
        setError(data.error || 'Failed to load game');
      }
    } catch (err) {
      console.error('Failed to fetch state:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId]);

  // Poll for updates
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Sound effects on state changes
  useEffect(() => {
    if (!gameState || !soundEnabled) return;

    // Play sound on phase change
    if (prevPhaseRef.current && prevPhaseRef.current !== gameState.phase) {
      if (gameState.phase === 'flop' || gameState.phase === 'turn' || gameState.phase === 'river') {
        playSound('deal');
      } else if (gameState.phase === 'showdown') {
        playSound('win');
      }
    }

    // Play sound on active player change (someone acted)
    if (
      prevActivePlayerRef.current !== null &&
      prevActivePlayerRef.current !== gameState.activePlayerIndex &&
      gameState.phase !== 'waiting' &&
      gameState.phase !== 'showdown' &&
      gameState.phase !== 'finished'
    ) {
      // Find the last action
      const prevPlayer = gameState.players[prevActivePlayerRef.current];
      if (prevPlayer?.lastAction) {
        playSound(prevPlayer.lastAction as any);
      }
    }

    // Notify on your turn
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

  // Handle player action
  const handleAction = async (action: PlayerAction, amount?: number) => {
    if (!gameId || !playerId) return;

    try {
      const res = await fetch('/api/craic/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          action,
          amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
        if (soundEnabled) playSound(action as any);
      } else {
        console.error('Action failed:', data.error);
      }
    } catch (err) {
      console.error('Failed to send action:', err);
    }
  };

  // Handle seat click (join)
  const handleSeatClick = async (seatIndex: number) => {
    if (!gameId || !playerId) return;

    try {
      const res = await fetch('/api/craic/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          playerName: `Player_${playerId.slice(2, 6)}`,
          seatIndex,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to join');
      }
    } catch (err) {
      console.error('Failed to join:', err);
    }
  };

  // Handle start game
  const handleStartGame = async () => {
    if (!gameId || !playerId) return;

    try {
      const res = await fetch('/api/craic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to start game');
      }
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  // Handle next hand
  const handleNextHand = async () => {
    if (!gameId || !playerId) return;

    try {
      const res = await fetch('/api/craic/next-hand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to start next hand');
      }
    } catch (err) {
      console.error('Failed to start next hand:', err);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50">
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => router.push(`/game/${gameId}`)}
            className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                showInfo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                soundEnabled ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Game Table */}
      <div className="flex-1 relative">
        <Table
          gameState={gameState}
          onAction={handleAction}
          onSeatClick={handleSeatClick}
          onStartGame={handleStartGame}
          onNextHand={handleNextHand}
        />
      </div>
    </div>
  );
}
