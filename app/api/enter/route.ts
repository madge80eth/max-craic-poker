// app/api/enter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import tournaments from '@/public/tournaments.json';

interface EntryRequest {
  walletAddress: string;
  platform: 'frame' | 'miniapp';
  hasRecasted?: boolean;
  userProfile?: {
    fid?: number;
    username?: string;
    displayName?: string;
  };
}

interface Entry {
  walletAddress: string;
  platform: string;
  tournament: string;
  tournamentBuyIn: number;
  timestamp: number;
  hasRecasted: boolean;
  userProfile?: {
    fid?: number;
    username?: string;
    displayName?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EntryRequest = await request.json();
    const { walletAddress, platform, hasRecasted = false, userProfile } = body;

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
        error: 'Raffle has already been drawn' 
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
          message: 'Recast status updated',
          tournament: {
            name: existingEntry.tournament as string,
            buyIn: parseInt(existingEntry.tournamentBuyIn as string)
          }
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Already entered this raffle',
        tournament: {
          name: existingEntry.tournament as string,
          buyIn: parseInt(existingEntry.tournamentBuyIn as string)
        }
      }, { status: 400 });
    }

    // Randomly assign tournament
    const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)];
    
    // Create entry
    const entry: Entry = {
      walletAddress,
      platform,
      tournament: randomTournament.name,
      tournamentBuyIn: randomTournament.buyIn,
      timestamp: Date.now(),
      hasRecasted,
      userProfile
    };

    // Store entry
    await redis.hset(`entry:${walletAddress}`, {
      walletAddress: entry.walletAddress,
      platform: entry.platform,
      tournament: entry.tournament,
      tournamentBuyIn: entry.tournamentBuyIn.toString(),
      timestamp: entry.timestamp.toString(),
      hasRecasted: entry.hasRecasted.toString(),
      userProfile: JSON.stringify(entry.userProfile || {})
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
      message: 'Successfully entered raffle',
      tournament: randomTournament,
      totalEntries,
      entry
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
        tournament: winner.tournament as string,
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