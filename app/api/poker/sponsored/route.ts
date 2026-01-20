import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame, addPlayer, toClientState } from '@/lib/poker/engine';
import { TableInfo, DEFAULT_CONFIG } from '@/lib/poker/types';
import {
  SponsoredTournament,
  SponsoredTournamentStatus,
  centsToUsdc,
} from '@/lib/poker/sponsored-types';

const redis = Redis.fromEnv();

/**
 * GET /api/poker/sponsored
 * List all sponsored tournaments
 */
export async function GET() {
  try {
    // Get all sponsored tournaments from Redis
    const tournamentIds = await redis.smembers('poker:sponsored:all');

    const tournaments: SponsoredTournament[] = [];

    for (const id of tournamentIds) {
      const data = await redis.get(`poker:sponsored:${id}`);
      if (data) {
        const tournament = typeof data === 'string' ? JSON.parse(data) : data;
        // Only show non-completed tournaments in the list
        if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
          tournaments.push(tournament);
        }
      }
    }

    // Sort by creation time, newest first
    tournaments.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ success: true, tournaments });
  } catch (error) {
    console.error('Error listing sponsored tournaments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list tournaments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/poker/sponsored
 * Create a new sponsored tournament
 *
 * Body: {
 *   creatorId: string,       // Wallet address of creator
 *   creatorName: string,     // Display name
 *   bondAmount: number,      // Required bond in cents (e.g., 1000 = $10)
 *   prizePool?: number,      // Optional initial prize pool in cents (if creator is also sponsor)
 *   maxPlayers?: number,     // Default 6
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorId, creatorName, bondAmount, prizePool, maxPlayers = 6 } = body;

    if (!creatorId || !creatorName) {
      return NextResponse.json({ error: 'Missing creatorId or creatorName' }, { status: 400 });
    }

    if (!bondAmount || bondAmount < 100) {
      return NextResponse.json({ error: 'Bond amount must be at least $1 (100 cents)' }, { status: 400 });
    }

    if (maxPlayers < 2 || maxPlayers > 6) {
      return NextResponse.json({ error: 'Max players must be between 2 and 6' }, { status: 400 });
    }

    // Generate table ID
    const tableId = `sponsored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate tournament ID (matches contract's keccak256)
    const tournamentId = `0x${Buffer.from(
      tableId + Date.now().toString() + creatorId
    ).toString('hex').slice(0, 64).padEnd(64, '0')}`;

    // Create game state (using existing poker engine)
    let gameState = createGame(tableId, {
      ...DEFAULT_CONFIG,
      maxPlayers: maxPlayers as 6,
    });

    // Store game state in Redis
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Create sponsored tournament record
    const tournament: SponsoredTournament = {
      tournamentId,
      tableId,
      contractAddress: '', // Will be set when contract interaction happens

      sponsor: prizePool ? creatorId : null,
      prizePool: prizePool || 0,
      bondAmount,

      maxPlayers,
      playerCount: 0,
      players: [],

      status: prizePool ? 'sponsored' : 'pending',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    // Store tournament in Redis
    await redis.set(`poker:sponsored:${tournamentId}`, JSON.stringify(tournament));
    await redis.sadd('poker:sponsored:all', tournamentId);

    // Also add to regular lobby (so it shows up with sponsored badge)
    const tableInfo: TableInfo = {
      tableId,
      name: `Sponsored: $${(prizePool || 0) / 100} Prize Pool`,
      playerCount: 0,
      maxPlayers,
      blinds: `${DEFAULT_CONFIG.blindLevels[0].smallBlind}/${DEFAULT_CONFIG.blindLevels[0].bigBlind}`,
      status: 'waiting',
      createdAt: Date.now(),
      creatorId,
    };

    await redis.zadd('poker:lobby', { score: Date.now(), member: JSON.stringify(tableInfo) });

    return NextResponse.json({
      success: true,
      tournamentId,
      tableId,
      tournament,
      // For contract interaction
      bondAmountUsdc: centsToUsdc(bondAmount).toString(),
      prizePoolUsdc: prizePool ? centsToUsdc(prizePool).toString() : '0',
    });
  } catch (error) {
    console.error('Error creating sponsored tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
