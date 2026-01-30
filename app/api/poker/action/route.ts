import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { processAction, toClientState, startHand } from '@/lib/poker/engine';
import { GameState, GameAction } from '@/lib/poker/types';
import { SponsoredTournament } from '@/lib/poker/sponsored-types';
import { updateLobbyStatus } from '@/lib/poker/lobby';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, playerId, action, amount } = body;

    if (!tableId || !playerId || !action) {
      return NextResponse.json({ error: 'Missing tableId, playerId, or action' }, { status: 400 });
    }

    // Get current game state
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Validate game is in progress
    if (gameState.phase === 'waiting' || gameState.phase === 'finished' || gameState.phase === 'showdown') {
      return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    }

    // Reset consecutive timeouts on voluntary action (player is active)
    const actingPlayer = gameState.players.find(p => p.odentity === playerId);
    if (actingPlayer) {
      actingPlayer.consecutiveTimeouts = 0;
      if (actingPlayer.sitOut) actingPlayer.sitOut = false;
    }

    // Process the action
    const gameAction: GameAction = {
      type: action,
      amount: amount,
      playerId,
    };

    gameState = await processAction(gameState, gameAction);

    // If showdown completed, check if we should start next hand automatically
    // (In a real app, you'd have a delay here for animations)
    if (gameState.phase === 'showdown') {
      // For now, we'll let the client trigger next hand
      // In future, could auto-advance after delay
    }

    // Save updated state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Update lobby status when game finishes
    if (gameState.phase === 'finished') {
      await updateLobbyStatus(redis, tableId, {
        status: 'finished',
        playerCount: gameState.players.filter(p => !p.disconnected).length,
      });
    }

    // Check if this is a sponsored tournament that just finished
    let sponsoredTournamentData = null;
    if (gameState.phase === 'finished' && tableId.startsWith('sponsored_')) {
      sponsoredTournamentData = await checkSponsoredTournamentCompletion(tableId, gameState);
    }

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
      // Include sponsored tournament data if applicable
      sponsoredTournament: sponsoredTournamentData,
    });
  } catch (error) {
    console.error('Error processing poker action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}

/**
 * Check if a sponsored tournament just completed and prepare payout data
 */
async function checkSponsoredTournamentCompletion(
  tableId: string,
  gameState: GameState
): Promise<object | null> {
  try {
    // Find tournament by tableId
    const tournamentIds = await redis.smembers('poker:sponsored:all');

    for (const tournamentId of tournamentIds) {
      const data = await redis.get(`poker:sponsored:${tournamentId}`);
      if (!data) continue;

      const tournament: SponsoredTournament =
        typeof data === 'string' ? JSON.parse(data) : data;

      if (tournament.tableId !== tableId) continue;
      if (tournament.status !== 'active') continue;

      // Found the matching sponsored tournament - determine winners
      const playerRankings = gameState.players
        .filter(p => !p.disconnected)
        .map(p => ({
          wallet: p.odentity,
          chips: p.chips,
          name: p.name,
        }))
        .sort((a, b) => b.chips - a.chips);

      if (playerRankings.length < 2) return null;

      const winner = playerRankings[0].wallet;
      const second = playerRankings[1].wallet;
      const otherPlayers = playerRankings.slice(2).map(p => p.wallet);

      // Calculate payouts
      const winnerPrize = Math.floor((tournament.prizePool * 65) / 100);
      const secondPrize = Math.floor((tournament.prizePool * 35) / 100);

      return {
        tournamentId: tournament.tournamentId,
        tableId: tournament.tableId,
        prizePool: tournament.prizePool,
        bondAmount: tournament.bondAmount,
        rankings: playerRankings.map((p, i) => ({
          rank: i + 1,
          wallet: p.wallet,
          name: p.name,
          chips: p.chips,
        })),
        payouts: {
          winner: {
            address: winner,
            bondReturn: tournament.bondAmount,
            prize: winnerPrize,
            total: tournament.bondAmount + winnerPrize,
          },
          second: {
            address: second,
            bondReturn: tournament.bondAmount,
            prize: secondPrize,
            total: tournament.bondAmount + secondPrize,
          },
          others: otherPlayers.map(addr => ({
            address: addr,
            bondReturn: tournament.bondAmount,
            prize: 0,
            total: tournament.bondAmount,
          })),
        },
        // Contract call data
        contractCall: {
          function: 'finishTournament',
          tournamentId: tournament.tournamentId,
          winner,
          second,
          otherPlayers,
        },
      };
    }

    return null;
  } catch (error) {
    console.error('Error checking sponsored tournament completion:', error);
    return null;
  }
}
