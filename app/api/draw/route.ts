// app/api/draw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import tournaments from '@/public/tournaments.json';

interface Winner {
  walletAddress: string;
  communityTournament: string;
  tournamentBuyIn: string;
  drawnAt: number;
  totalEntries: number;
  platform: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check if winner already exists
    const existingWinner = await redis.hgetall('current_winner');
    if (existingWinner && Object.keys(existingWinner).length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Winner has already been drawn',
        winner: {
          walletAddress: existingWinner.walletAddress as string,
          communityTournament: existingWinner.communityTournament as string,
          tournamentBuyIn: existingWinner.tournamentBuyIn as string,
          drawnAt: parseInt(existingWinner.drawnAt as string),
          totalEntries: parseInt(existingWinner.totalEntries as string)
        }
      });
    }

}

    // Get all entries
    const entries = await redis.hgetall('entries');
    const entryKeys = Object.keys(entries || {});
    
    if (entryKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No entries found'
      }, { status: 400 });
    }

    // Select random winner
    const randomWalletIndex = Math.floor(Math.random() * entryKeys.length);
    const winnerWallet = entryKeys[randomWalletIndex];
    const winnerEntry = typeof entries[winnerWallet] === 'string' 
      ? JSON.parse(entries[winnerWallet]) 
      : entries[winnerWallet];

    // Select random tournament
    const randomTournamentIndex = Math.floor(Math.random() * tournaments.length);
    const communityTournament = tournaments[randomTournamentIndex];

    // Create winner object
    const winner: Winner = {
      walletAddress: winnerWallet,
      communityTournament: communityTournament.name,
      tournamentBuyIn: communityTournament.buyIn,
      drawnAt: Date.now(),
      totalEntries: entryKeys.length,
      platform: winnerEntry.platform,
      timestamp: winnerEntry.timestamp
    };

    // Store winner (FIXED VERSION)
    await redis.hset('current_winner', {
      walletAddress: winner.walletAddress,
      communityTournament: winner.communityTournament,
      tournamentBuyIn: winner.tournamentBuyIn,
      drawnAt: winner.drawnAt.toString(),
      totalEntries: winner.totalEntries.toString(),
      platform: winner.platform,
      timestamp: winner.timestamp.toString()
    });

    // Set draw time (marks draw as complete)
    await redis.set('draw_time', Date.now().toString());

    return NextResponse.json({
      success: true,
      message: 'Winner and community tournament selected!',
      winner: {
        walletAddress: winner.walletAddress,
        communityTournament: winner.communityTournament,
        tournamentBuyIn: winner.tournamentBuyIn,
        drawnAt: winner.drawnAt,
        totalEntries: winner.totalEntries
      }
    });

  } catch (error) {
    console.error('Draw error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current winner if exists
    const winner = await redis.hgetall('current_winner');
    const hasWinner = winner && Object.keys(winner).length > 0;

    if (!hasWinner) {
      return NextResponse.json({
        success: true,
        hasWinner: false,
        message: 'No winner drawn yet'
      });
    }

    return NextResponse.json({
      success: true,
      hasWinner: true,
      winner: {
        walletAddress: winner.walletAddress as string,
        communityTournament: winner.communityTournament as string,
        tournamentBuyIn: winner.tournamentBuyIn as string,
        drawnAt: parseInt(winner.drawnAt as string),
        totalEntries: parseInt(winner.totalEntries as string)
      }
    });

  } catch (error) {
    console.error('Get winner error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}