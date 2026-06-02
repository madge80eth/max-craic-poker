import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { BracketState } from '@/lib/craic/types';
import { GameState } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  const bracketJson = await redis.get(`craic:bracket:${gameId}`);
  if (!bracketJson) {
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
  }
  const bracket: BracketState = typeof bracketJson === 'string'
    ? JSON.parse(bracketJson) : bracketJson;

  // Enrich current round tables with live status
  const currentRound = bracket.rounds[bracket.currentRound - 1];
  const tableStatuses: {
    gameId: string;
    phase: string;
    playerCount: number;
    playersRemaining: number;
    players: { address: string; name: string }[];
  }[] = [];

  if (currentRound) {
    for (const tableId of currentRound.tables) {
      const stateJson = await redis.get(`craic:game:${tableId}:state`);
      if (stateJson) {
        const state: GameState = typeof stateJson === 'string'
          ? JSON.parse(stateJson) : stateJson;
        tableStatuses.push({
          gameId: tableId,
          phase: state.phase,
          playerCount: state.players.length,
          playersRemaining: state.players.filter(p => !p.disconnected && p.chips > 0).length,
          players: state.players
            .filter(p => !p.disconnected)
            .map(p => ({ address: p.odentity, name: p.name })),
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    bracket,
    currentRoundTables: tableStatuses,
  });
}
