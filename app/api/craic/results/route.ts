import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
  }

  const finishJson = await redis.get(`craic:game:${gameId}:finish`);
  if (!finishJson) {
    return NextResponse.json({ error: 'Results not available — game may still be in progress' }, { status: 404 });
  }

  const finishData = typeof finishJson === 'string' ? JSON.parse(finishJson) : finishJson;

  return NextResponse.json({ success: true, finishData });
}
