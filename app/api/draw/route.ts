// app/api/draw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import tournaments from '@/public/tournaments.json';

interface Winner {
  walletAddress: string;
  communityTournament: string;
  tournamentBuyIn: number;
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
          tournamentBuyIn: parseInt(existingWinner.tournamentBuyIn as string),
          drawnAt: parseInt(existingWinner.drawnAt as string),
          totalEntries: parseInt(existingWinner.totalEntries as string)
        }
      });
    }

    // Get all entries
    const entryWallets = await redis.smembers('entries');
    
    if (entryWallets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No entries found for draw'
      });
    }

    // Select random winner
    const randomWinnerIndex = Math.floor(Math.random() * entryWallets.length);
    const winnerWallet = entryWallets[randomWinnerIndex];

    // Get winner's entry details
    const winnerEntry = await redis.hgetall(`entry:${winnerWallet}`);
    if (!winnerEntry || Object.keys(winnerEntry).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Winner entry not found'
      });
    }

    // Select random tournament (community tournament)
    const randomTournamentIndex = Math.floor(Math.random() * tournaments.length);
    const communityTournament = tournaments[randomTournamentIndex];

    // Create winner record
    const winner: Winner = {
      walletAddress: winnerWallet,
      communityTournament: communityTournament.name,
      tournamentBuyIn: parseInt(communityTournament.buyIn.replace('$', '')),
      drawnAt: Date.now(),
      totalEntries: entryWallets.length,
      platform: winnerEntry.platform as string,
      timestamp: parseInt(winnerEntry.timestamp as string)
    };

    // Store winner
    await redis.hset('current_winner', {
      walletAddress: winner.walletAddress,
      communityTournament: winner.communityTournament,
      tournamentBuyIn: winner.tournamentBuyIn.toString(),
      drawnAt: winner.drawnAt.toString(),
      totalEntries: winner.totalEntries.toString(),
      platform: winner.platform,
      timestamp: winner.timestamp.toString()
    });

    return NextResponse.json({
      success: true,
      message: 'Winner drawn successfully',
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

export async function GET() {
  try {
    const winner = await redis.hgetall('current_winner');
    
    if (!winner || Object.keys(winner).length === 0) {
      return NextResponse.json({
        success: true,
        hasWinner: false,
        winner: null
      });
    }

    return NextResponse.json({
      success: true,
      hasWinner: true,
      winner: {
        walletAddress: winner.walletAddress as string,
        communityTournament: winner.communityTournament as string,
        tournamentBuyIn: parseInt(winner.tournamentBuyIn as string),
        drawnAt: parseInt(winner.drawnAt as string),
        totalEntries: parseInt(winner.totalEntries as string),
        platform: winner.platform as string
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