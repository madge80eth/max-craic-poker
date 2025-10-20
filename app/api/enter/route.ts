import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, platform } = body;

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        message: 'Wallet address required'
      }, { status: 400 });
    }

    // Check if already entered - use 'entries' key
    const existingEntry = await redis.hget('entries', walletAddress);
    
    if (existingEntry) {
      return NextResponse.json({
        success: false,
        message: 'Already entered in this draw'
      });
    }

    // Create entry
    const entry = {
      walletAddress,
      platform: platform || 'unknown',
      timestamp: Date.now()
    };

    // Store entry - use 'entries' key
    await redis.hset('entries', { [walletAddress]: JSON.stringify(entry) });

    // Get total entries
    const totalEntries = await redis.hlen('entries');

    return NextResponse.json({
      success: true,
      message: 'Successfully entered the draw',
      totalEntries
    });

  } catch (error) {
    console.error('Entry error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to enter draw'
    }, { status: 500 });
  }
}