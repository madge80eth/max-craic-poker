import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface EntryRequest {
  walletAddress: string;
  platform: 'farcaster' | 'base';
}

export async function POST(request: NextRequest) {
  try {
    const body: EntryRequest = await request.json();
    const { walletAddress, platform } = body;

    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Wallet address required' 
      }, { status: 400 });
    }

    // Check if already entered
    const existingEntry = await redis.hget('raffle_entries', walletAddress);
    if (existingEntry) {
      const entry = typeof existingEntry === 'string' 
        ? JSON.parse(existingEntry) 
        : existingEntry;
        
      return NextResponse.json({
        success: true,
        message: 'Already entered!',
        alreadyEntered: true,
        entry
      });
    }

    // Create new entry - NO tournament assignment (happens at draw)
    const entry = {
      walletAddress,
      platform,
      timestamp: Date.now()
    };

    // Store entry
    await redis.hset('raffle_entries', { [walletAddress]: JSON.stringify(entry) });

    // Get total entries count
    const totalEntries = await redis.hlen('raffle_entries');

    return NextResponse.json({
      success: true,
      message: 'Successfully entered the community draw!',
      entry,
      totalEntries
    });

  } catch (error) {
    console.error('Entry error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}