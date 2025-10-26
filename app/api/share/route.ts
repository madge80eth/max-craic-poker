import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address required'
      }, { status: 400 });
    }

    // Get current entry
    const existingEntry = await redis.hget('raffle_entries', walletAddress);

    if (!existingEntry) {
      return NextResponse.json({
        success: false,
        error: 'No entry found for this wallet'
      }, { status: 404 });
    }

    // Parse and update entry with shared status
    const entry = typeof existingEntry === 'string' ? JSON.parse(existingEntry) : existingEntry;
    entry.hasShared = true;

    // Store updated entry
    await redis.hset('raffle_entries', { [walletAddress]: JSON.stringify(entry) });

    return NextResponse.json({
      success: true,
      message: 'Share recorded! Your profit share will be doubled if you win.'
    });

  } catch (error) {
    console.error('Share tracking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}
