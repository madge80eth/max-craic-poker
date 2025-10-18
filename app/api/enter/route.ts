import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface EntryRequest {
  walletAddress: string;
  platform: 'farcaster' | 'base';
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

    // Check if already entered (using correct key: raffle_entries)
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

    // Load tournaments and randomly assign one
    const tournamentsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/tournaments.json`);
    const tournaments = await tournamentsResponse.json();
    
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No tournaments available'
      }, { status: 500 });
    }

    const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)];

    // Create new entry with tournament assignment
    const entry = {
      walletAddress,
      platform,
      timestamp: Date.now(),
      hasRecasted,
      tournament: randomTournament.name,
      tournamentBuyIn: randomTournament.buyIn
    };

    // Store entry (using correct key: raffle_entries)
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
      error: 'Internal server error' 
    }, { status: 500 });
  }
}