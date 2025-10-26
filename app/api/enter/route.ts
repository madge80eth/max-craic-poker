import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { checkAndResetSession } from '@/lib/session';

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

    // Auto-reset if session changed in tournaments.json
    await checkAndResetSession();

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
      timestamp: Date.now(),
      hasShared: false  // Track if user shared for bonus calculation
    };

    // Store entry in current draw pool
    await redis.hset('raffle_entries', { [walletAddress]: JSON.stringify(entry) });

    // Update persistent entry history (never cleared by reset)
    const historyKey = 'entry_history';
    const existingHistory = await redis.hget(historyKey, walletAddress);

    let historyData;
    if (existingHistory) {
      const parsed = typeof existingHistory === 'string' ? JSON.parse(existingHistory) : existingHistory;
      historyData = {
        totalEntries: parsed.totalEntries + 1,
        lastEntry: new Date().toISOString(),
        firstEntry: parsed.firstEntry,
        sessions: [...(parsed.sessions || []), new Date().toISOString()]
      };
    } else {
      historyData = {
        totalEntries: 1,
        lastEntry: new Date().toISOString(),
        firstEntry: new Date().toISOString(),
        sessions: [new Date().toISOString()]
      };
    }

    await redis.hset(historyKey, { [walletAddress]: JSON.stringify(historyData) });

    // Get total entries count for current draw
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