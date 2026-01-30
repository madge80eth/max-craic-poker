import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { processAction, removePlayer, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { updateLobbyStatus } from '@/lib/poker/lobby';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('tableId');
    const playerId = searchParams.get('playerId');

    if (!tableId) {
      return NextResponse.json({ error: 'Missing tableId' }, { status: 400 });
    }

    // Get current game state
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Timeout enforcement: auto-fold players who exceed their action timeout
    const activePhases = ['preflop', 'flop', 'turn', 'river'];
    if (activePhases.includes(gameState.phase) && gameState.activePlayerIndex >= 0) {
      const elapsed = (Date.now() - gameState.lastActionTime) / 1000;
      if (elapsed > gameState.config.actionTimeout) {
        const activePlayer = gameState.players[gameState.activePlayerIndex];
        if (activePlayer && !activePlayer.folded && !activePlayer.allIn) {
          try {
            // Track consecutive timeouts for AFK detection
            activePlayer.consecutiveTimeouts = (activePlayer.consecutiveTimeouts || 0) + 1;

            // Use 'check' if available (no bet to call), otherwise 'fold'
            const actionType = gameState.currentBet <= activePlayer.bet ? 'check' : 'fold';
            gameState = await processAction(gameState, {
              type: actionType,
              playerId: activePlayer.odentity,
            });

            // Remove player after 3 consecutive timeouts (mark as disconnected)
            if (activePlayer.consecutiveTimeouts >= 3) {
              gameState = removePlayer(gameState, activePlayer.odentity);
            }

            await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

            // Update lobby if game finished or player was removed
            if (gameState.phase === 'finished' || activePlayer.consecutiveTimeouts >= 3) {
              await updateLobbyStatus(redis, tableId, {
                status: gameState.phase === 'finished' ? 'finished' : 'playing',
                playerCount: gameState.players.filter(p => !p.disconnected).length,
              });
            }
          } catch (e) {
            console.error('Timeout auto-fold failed:', e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId || null),
    });
  } catch (error) {
    console.error('Error getting poker state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get state' },
      { status: 500 }
    );
  }
}
