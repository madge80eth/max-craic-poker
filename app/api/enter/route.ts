// app/api/enter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface EntryRequest {
  walletAddress: string;
  platform: 'frame' | 'miniapp';
  hasRecasted?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: EntryRequest = await request.json();
    const { walletAddress, platform, hasRecasted = false } = body;

    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Wallet address required' 
      }, { status: 400 });
    }

    // Check if already entered
    const existingEntry = await redis.hget('entries', walletAddress);
    if (existingEntry) {
      // Parse the existing entry to return it
      const entry = typeof existingEntry === 'string' 
        ? JSON.parse(existingEntry) 
        : existingEntry;
        
      return NextResponse.json({
        success: true,
        message: 'Already entered!',
        alreadyEntered: true,
        entry: {
          walletAddress,
          platform: entry.platform,
          timestamp: entry.timestamp,
          hasRecasted: entry.hasRecasted
        }
      });
    }

    // Create new entry (NO TOURNAMENT ASSIGNMENT)
    const entry = {
      walletAddress,
      platform,
      timestamp: Date.now(),
      hasRecasted
    };

    // Store entry
    await redis.hset('entries', { [walletAddress]: JSON.stringify(entry) });

    // Get total entries count
    const totalEntries = await redis.hlen('entries');

    return NextResponse.json({
      success: true,
      message: 'Successfully entered the community draw!',
      entry: {
        walletAddress,
        platform,
        timestamp: entry.timestamp,
        hasRecasted
      },
      totalEntries
    });

  } catch (error) {
    console.error('Entry error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}