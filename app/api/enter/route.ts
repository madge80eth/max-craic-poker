// app/api/enter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

interface EntryRequest {
  walletAddress: string;
  platform: 'frame' | 'miniapp';
  hasRecasted?: boolean;
}

interface Entry {
  walletAddress: string;
  platform: string;
  timestamp: number;
  hasRecasted: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: EntryRequest = await request.json();
    const { walletAddress, platform, hasRecasted = false } = body;

    // Validate wallet address
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid wallet address' 
      }, { status: 400 });
    }

    // Check if draw has already happened
    const winner = await redis.hgetall('current_winner');
    if (winner && Object.keys(winner).length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Draw has already been completed' 
      }, { status: 400 });
    }

    // Check if user has already entered
    const existingEntry = await redis.hgetall(`entry:${walletAddress}`);
    if (existingEntry && Object.keys(existingEntry).length > 0) {
      // If just updating recast status
      if (hasRecasted && existingEntry.hasRecasted !== 'true') {
        const updatedEntry = {
          ...existingEntry,
          hasRecasted: 'true'
        };
        await redis.hset(`entry:${walletAddress}`, updatedEntry);
        
        return NextResponse.json({
          success: true,
          message: 'Share status updated - thanks for spreading the word!'
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Already entered - you\'re in the draw!' 
      }, { status: 400 });
    }

    // Create entry (NO tournament assignment)
    const entry: Entry = {
      walletAddress,
      platform,
      timestamp: Date.now(),
      hasRecasted
    };

    // Store entry
    await redis.hset(`entry:${walletAddress}`, {
      walletAddress: entry.walletAddress,
      platform: entry.platform,
      timestamp: entry.timestamp.toString(),
      hasRecasted: entry.hasRecasted.toString()
    });

    // Add to entries list
    await redis.sadd('entries', walletAddress);

    // Get total entries for response
    const totalEntries = await redis.scard('entries');

    // Set initial countdown if this is the first entry
    if (totalEntries === 1) {
      const drawTime = Date.now() + (12 * 60 * 60 * 1000); // 12 hours from now
      await redis.set('draw_time', drawTime);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully entered! You\'re in the draw.',
      totalEntries,
      entry: {
        walletAddress: entry.walletAddress,
        platform: entry.platform,
        timestamp: entry.timestamp
      }
    });

  } catch (error) {
    console.error('Entry error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get total entries
    const totalEntries = await redis.scard('entries');
    
    // Get draw time
    const drawTime = await redis.get('draw_time');
    const timeRemaining = drawTime ? Math.max(0, Math.floor((parseInt(drawTime as string) - Date.now()) / 1000)) : 0;
    
    // Get current winner if exists
    const winner = await redis.hgetall('current_winner');
    const hasWinner = winner && Object.keys(winner).length > 0;

    return NextResponse.json({
      success: true,
      totalEntries,
      timeRemaining,
      hasWinner,
      winner: hasWinner ? {
        walletAddress: winner.walletAddress as string,
        communityTournament: winner.communityTournament as string,
        tournamentBuyIn: parseInt(winner.tournamentBuyIn as string),
        drawnAt: parseInt(winner.drawnAt as string),
        totalEntries: parseInt(winner.totalEntries as string)
      } : null
    });

  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}