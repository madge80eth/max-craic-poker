import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { listTournaments } from '@/lib/poker/tournament';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    const tournaments = await listTournaments(redis);
    return NextResponse.json({ success: true, tournaments });
  } catch (error) {
    console.error('Error listing tournaments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list tournaments' },
      { status: 500 }
    );
  }
}
