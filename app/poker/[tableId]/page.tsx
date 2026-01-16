'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ClientGameState, PlayerAction } from '@/lib/poker/types';
import Table from '../components/Table';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ tableId: string }>;
}

export default function PokerTable({ params }: PageProps) {
  const searchParams = useSearchParams();
  const { address } = useAccount();

  const [tableId, setTableId] = useState<string>('');
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Get player info from URL params
  const playerIdParam = searchParams.get('playerId');
  const playerNameParam = searchParams.get('playerName');
  const playerId = playerIdParam || address || null;
  const playerName = playerNameParam || (address ? `Player_${address.slice(2, 6)}` : 'Guest');

  // Resolve params
  useEffect(() => {
    params.then(p => setTableId(p.tableId));
  }, [params]);

  // Fetch game state
  const fetchState = useCallback(async () => {
    if (!tableId) return;

    try {
      const res = await fetch(`/api/poker/state?tableId=${tableId}&playerId=${playerId || ''}`);
      const data = await res.json();

      if (data.success) {
        setGameState(data.gameState);
        setError(null);
      } else {
        setError(data.error || 'Failed to load game');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [tableId, playerId]);

  // Poll for updates
  useEffect(() => {
    if (!tableId) return;

    fetchState();
    const interval = setInterval(fetchState, 1000); // Poll every second
    return () => clearInterval(interval);
  }, [tableId, fetchState]);

  // Handle seat click (join table)
  const handleSeatClick = async (seatIndex: number) => {
    if (!playerId || !tableId) return;

    // Check if already seated
    if (gameState?.players.some(p => p.odentity === playerId)) {
      return;
    }

    try {
      const res = await fetch('/api/poker/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          playerId,
          playerName,
          seatIndex,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to join table');
      }
    } catch (err) {
      alert('Failed to join table');
    }
  };

  // Handle start game
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
    } catch (err) {
      alert('Failed to start game');
    }
  };

  // Handle player action
  const handleAction = async (action: PlayerAction, amount?: number) => {
    if (!playerId || !tableId || actionPending) return;

    setActionPending(true);
    try {
      const res = await fetch('/api/poker/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          playerId,
          action,
          amount,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGameState(data.gameState);
      } else {
        alert(data.error || 'Failed to perform action');
      }
    } catch (err) {
      alert('Failed to perform action');
    } finally {
      setActionPending(false);
    }
  };

  // Handle next hand
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
      } else {
        alert(data.error || 'Failed to start next hand');
      }
    } catch (err) {
      alert('Failed to start next hand');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading table...</div>
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Table not found'}</div>
          <Link
            href="/poker"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  const isSeated = gameState.yourSeatIndex !== null;
  const isYourTurn = isSeated && gameState.validActions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-w-4xl mx-auto">
        <Link
          href="/poker"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
        >
          &larr; Lobby
        </Link>

        <div className="text-center">
          <div className="text-sm text-gray-400">Table ID</div>
          <div className="font-mono text-xs">{tableId.slice(0, 20)}...</div>
        </div>

        <div className="text-right">
          {isSeated ? (
            <div className="text-sm">
              <span className="text-gray-400">Playing as:</span>{' '}
              <span className="text-purple-400 font-medium">{playerName}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Click a seat to join</div>
          )}
        </div>
      </div>

      {/* Turn Indicator */}
      {isYourTurn && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold animate-pulse">
            Your Turn!
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex items-center justify-center min-h-[700px]">
        <Table
          gameState={gameState}
          onAction={handleAction}
          onSeatClick={handleSeatClick}
          onStartGame={isSeated ? handleStartGame : undefined}
          onNextHand={isSeated ? handleNextHand : undefined}
        />
      </div>

      {/* Game Info Footer */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500">
        <div>Phase: {gameState.phase}</div>
        <div>Players: {gameState.players.length}/6</div>
        {isSeated && <div>Your seat: {(gameState.yourSeatIndex ?? 0) + 1}</div>}
      </div>
    </div>
  );
}
