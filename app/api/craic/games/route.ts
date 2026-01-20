import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { CraicGameInfo } from '@/lib/craic/types';

const redis = Redis.fromEnv();

/**
 * Get list of active Craic games
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const status = searchParams.get('status'); // 'waiting' | 'active' | 'finished' | 'all'

    // Get all games from lobby
    const entries = await redis.zrange('craic:lobby', 0, -1, { rev: true });

    let games: CraicGameInfo[] = entries.map(entry => {
      return typeof entry === 'string' ? JSON.parse(entry) : entry;
    });

    // Filter by status if specified
    if (status && status !== 'all') {
      games = games.filter(g => g.status === status);
    }

    // If playerId specified, also get player's specific games
    let playerGames: string[] = [];
    if (playerId) {
      playerGames = await redis.smembers(`craic:player:${playerId}:games`) as string[];
    }

    return NextResponse.json({
      success: true,
      games,
      playerGames,
      count: games.length,
    });
  } catch (error) {
    console.error('Error getting Craic games:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get games' },
      { status: 500 }
    );
  }
}
