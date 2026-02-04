import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addPlayer, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import {
  SponsoredTournament,
  SponsoredPlayer,
} from '@/lib/poker/sponsored-types';

const redis = Redis.fromEnv();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/poker/sponsored/[id]
 * Get tournament details
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;

    const data = await redis.get(`poker:sponsored:${tournamentId}`);
    if (!data) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament: SponsoredTournament = typeof data === 'string' ? JSON.parse(data) : data;

    // Get game state too
    const stateJson = await redis.get(`poker:table:${tournament.tableId}:state`);
    let gameState = null;
    if (stateJson) {
      const state: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;
      const { searchParams } = new URL(request.url);
      const playerId = searchParams.get('playerId');
      gameState = toClientState(state, playerId || null);
    }

    return NextResponse.json({
      success: true,
      tournament,
      gameState,
      // For UI display
      bondAmountFormatted: `$${(tournament.bondAmount / 100).toFixed(2)}`,
      prizePoolFormatted: `$${(tournament.prizePool / 100).toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error getting sponsored tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tournament' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/poker/sponsored/[id]
 * Various tournament actions based on 'action' field
 *
 * Actions:
 * - sponsor: Add prize pool to tournament
 * - enter: Player enters (bonds in)
 * - start: Start the tournament early
 * - complete: Finish tournament and trigger payouts
 * - cancel: Cancel and refund everyone
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { action } = body;

    const data = await redis.get(`poker:sponsored:${tournamentId}`);
    if (!data) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    let tournament: SponsoredTournament = typeof data === 'string' ? JSON.parse(data) : data;

    switch (action) {
      case 'sponsor':
        return handleSponsor(tournament, body);

      case 'enter':
        return handleEnter(tournament, body);

      case 'start':
        return handleStart(tournament, body);

      case 'complete':
        return handleComplete(tournament, body);

      case 'cancel':
        return handleCancel(tournament, body);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing tournament action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}

/**
 * Sponsor action - add prize pool
 */
async function handleSponsor(
  tournament: SponsoredTournament,
  body: { sponsorId: string; prizePool: number; txHash?: string }
) {
  const { sponsorId, prizePool, txHash } = body;

  if (tournament.status !== 'pending') {
    return NextResponse.json({ error: 'Tournament already sponsored' }, { status: 400 });
  }

  if (!sponsorId || !prizePool) {
    return NextResponse.json({ error: 'Missing sponsorId or prizePool' }, { status: 400 });
  }

  tournament.sponsor = sponsorId;
  tournament.prizePool = prizePool;
  tournament.status = 'sponsored';

  await redis.set(`poker:sponsored:${tournament.tournamentId}`, JSON.stringify(tournament));

  // Update lobby table name
  await updateLobbyTableName(tournament);

  return NextResponse.json({
    success: true,
    tournament,
    message: `Tournament sponsored with $${(prizePool / 100).toFixed(2)} prize pool`,
  });
}

/**
 * Enter action - player bonds and joins
 */
async function handleEnter(
  tournament: SponsoredTournament,
  body: { playerId: string; playerName: string; seatIndex: number; txHash?: string }
) {
  const { playerId, playerName, seatIndex, txHash } = body;

  if (tournament.status !== 'sponsored') {
    return NextResponse.json({ error: 'Tournament not open for entry' }, { status: 400 });
  }

  if (!playerId || !playerName || seatIndex === undefined) {
    return NextResponse.json({ error: 'Missing playerId, playerName, or seatIndex' }, { status: 400 });
  }

  // Check if already joined
  if (tournament.players.some(p => p.wallet.toLowerCase() === playerId.toLowerCase())) {
    return NextResponse.json({ error: 'Already joined' }, { status: 400 });
  }

  // Check if seat is taken
  if (tournament.players.some(p => p.seatIndex === seatIndex)) {
    return NextResponse.json({ error: 'Seat taken' }, { status: 400 });
  }

  if (tournament.playerCount >= tournament.maxPlayers) {
    return NextResponse.json({ error: 'Tournament full' }, { status: 400 });
  }

  // Add player to tournament (bonded = false when no bond required)
  const player: SponsoredPlayer = {
    wallet: playerId,
    seatIndex,
    bonded: tournament.bondAmount > 0,
    refunded: false,
    name: playerName,
  };

  tournament.players.push(player);
  tournament.playerCount++;

  // Also add to poker game state
  const stateJson = await redis.get(`poker:table:${tournament.tableId}:state`);
  if (stateJson) {
    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;
    gameState = addPlayer(gameState, playerId, playerName, seatIndex);
    await redis.set(`poker:table:${tournament.tableId}:state`, JSON.stringify(gameState));
  }

  // Check if tournament is now full
  if (tournament.playerCount >= tournament.maxPlayers) {
    tournament.status = 'active';
    tournament.startedAt = Date.now();
  }

  await redis.set(`poker:sponsored:${tournament.tournamentId}`, JSON.stringify(tournament));

  // Update lobby
  await updateLobbyPlayerCount(tournament);

  return NextResponse.json({
    success: true,
    tournament,
    message: tournament.bondAmount > 0
      ? `Joined tournament with $${(tournament.bondAmount / 100).toFixed(2)} bond`
      : 'Joined tournament',
  });
}

/**
 * Start action - start tournament early (before full)
 */
async function handleStart(
  tournament: SponsoredTournament,
  body: { requesterId: string }
) {
  const { requesterId } = body;

  if (tournament.status !== 'sponsored') {
    return NextResponse.json({ error: 'Cannot start tournament' }, { status: 400 });
  }

  if (tournament.playerCount < 2) {
    return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 });
  }

  // Only sponsor or game server can start early
  // In production, add proper auth check here

  tournament.status = 'active';
  tournament.startedAt = Date.now();

  await redis.set(`poker:sponsored:${tournament.tournamentId}`, JSON.stringify(tournament));

  return NextResponse.json({
    success: true,
    tournament,
    message: 'Tournament started',
  });
}

/**
 * Complete action - finish tournament and trigger payouts
 * Called by game server when poker game ends
 */
async function handleComplete(
  tournament: SponsoredTournament,
  body: {
    winner: string;
    second: string;
    otherPlayers?: string[];
    gameServerKey?: string;
  }
) {
  const { winner, second, otherPlayers = [] } = body;

  // In production, verify game server key
  // const expectedKey = process.env.GAME_SERVER_KEY;
  // if (body.gameServerKey !== expectedKey) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  if (tournament.status !== 'active') {
    return NextResponse.json({ error: 'Tournament not active' }, { status: 400 });
  }

  if (!winner || !second) {
    return NextResponse.json({ error: 'Missing winner or second place' }, { status: 400 });
  }

  // NOTE: Platform fee would be deducted here before payout calculation
  // const fee = Math.floor((tournament.prizePool * platformFeePercent) / 100);
  // const distributablePrize = tournament.prizePool - fee;
  // For now, 0% fee — 100% of prize pool goes to players
  const distributablePrize = tournament.prizePool;

  // Calculate payouts (65/35 split, bonds refunded if any)
  const winnerPrize = Math.floor((distributablePrize * 65) / 100);
  const secondPrize = Math.floor((distributablePrize * 35) / 100);

  const winnerPayout = tournament.bondAmount + winnerPrize;
  const secondPayout = tournament.bondAmount + secondPrize;

  tournament.status = 'completed';
  tournament.completedAt = Date.now();
  tournament.winner = winner;
  tournament.second = second;
  tournament.winnerPayout = winnerPayout;
  tournament.secondPayout = secondPayout;

  // Mark players as refunded
  tournament.players = tournament.players.map(p => ({
    ...p,
    refunded: true,
  }));

  await redis.set(`poker:sponsored:${tournament.tournamentId}`, JSON.stringify(tournament));

  // Remove from lobby
  await removeTournamentFromLobby(tournament.tableId);

  return NextResponse.json({
    success: true,
    tournament,
    payouts: {
      winner: { address: winner, amount: winnerPayout, formatted: `$${(winnerPayout / 100).toFixed(2)}` },
      second: { address: second, amount: secondPayout, formatted: `$${(secondPayout / 100).toFixed(2)}` },
      others: otherPlayers.map(addr => ({
        address: addr,
        amount: tournament.bondAmount,
        formatted: `$${(tournament.bondAmount / 100).toFixed(2)}`,
      })),
    },
    // For contract call
    finishParams: {
      tournamentId: tournament.tournamentId,
      winner,
      second,
      otherPlayers: tournament.players
        .filter(p => p.wallet.toLowerCase() !== winner.toLowerCase() && p.wallet.toLowerCase() !== second.toLowerCase())
        .map(p => p.wallet),
    },
  });
}

/**
 * Cancel action - cancel tournament and refund everyone
 */
async function handleCancel(
  tournament: SponsoredTournament,
  body: { requesterId: string; reason?: string }
) {
  const { requesterId, reason = 'Cancelled' } = body;

  if (tournament.status === 'completed' || tournament.status === 'cancelled') {
    return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 });
  }

  // Only sponsor or admin can cancel
  // In production, add proper auth check here

  tournament.status = 'cancelled';

  // Mark all refunds
  tournament.players = tournament.players.map(p => ({
    ...p,
    refunded: true,
  }));

  await redis.set(`poker:sponsored:${tournament.tournamentId}`, JSON.stringify(tournament));

  // Remove from lobby
  await removeTournamentFromLobby(tournament.tableId);

  return NextResponse.json({
    success: true,
    tournament,
    message: `Tournament cancelled: ${reason}`,
    // For contract call
    cancelParams: {
      tournamentId: tournament.tournamentId,
      reason,
    },
  });
}

// Helper functions

async function updateLobbyTableName(tournament: SponsoredTournament) {
  // This is a simplified version - in production you'd want to properly update the sorted set
  // For now, the table name is set at creation and includes prize pool
}

async function updateLobbyPlayerCount(tournament: SponsoredTournament) {
  // Update the lobby entry with new player count
  // This requires re-adding with same score but updated member
}

async function removeTournamentFromLobby(tableId: string) {
  // Remove from lobby sorted set
  // In production, store the original zadd member to remove it
}
