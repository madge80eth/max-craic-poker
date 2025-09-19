// app/api/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    // Get basic stats
    const entries = await redis.hgetall('entries');
    const totalEntries = Object.keys(entries || {}).length;
    
    // Get draw time and calculate remaining
    const drawTime = await redis.get('draw_time');
    const timeRemaining = drawTime ? 
      Math.max(0, Math.floor((parseInt(drawTime as string) - Date.now()) / 1000)) : 0;
    
    // Get current winner if exists
    const winner = await redis.hgetall('current_winner');
    const hasWinner = winner && Object.keys(winner).length > 0;

    // Basic response without wallet
    if (!walletAddress) {
      return NextResponse.json({
        success: true,
        totalEntries,
        timeRemaining,
        hasWinner,
        winner: hasWinner ? {
          walletAddress: winner.walletAddress as string,
          communityTournament: winner.communityTournament as string,
          tournamentBuyIn: winner.tournamentBuyIn as string,
          drawnAt: parseInt(winner.drawnAt as string),
          totalEntries: parseInt(winner.totalEntries as string)
        } : null
      });
    }

    // Check if specific wallet has entered
    const userEntry = entries ? entries[walletAddress] : null;
    const hasEntered = !!userEntry;

    // Check if this wallet is the winner
    const isWinner = hasWinner && winner.walletAddress === walletAddress;

    // Parse user entry if exists
    let parsedEntry = null;
    if (hasEntered && userEntry) {
      try {
        parsedEntry = typeof userEntry === 'string' ? JSON.parse(userEntry) : userEntry;
      } catch (e) {
        console.error('Error parsing entry:', e);
      }
    }

    return NextResponse.json({
      success: true,
      totalEntries,
      timeRemaining,
      hasWinner,
      hasEntered,
      isWinner,
      userEntry: parsedEntry,
      winner: hasWinner ? {
        walletAddress: winner.walletAddress as string,
        communityTournament: winner.communityTournament as string,
        tournamentBuyIn: winner.tournamentBuyIn as string,
        drawnAt: parseInt(winner.drawnAt as string),
        totalEntries: parseInt(winner.totalEntries as string)
      } : null
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}