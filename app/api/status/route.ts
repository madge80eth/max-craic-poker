// app/api/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');

    // Get general status
    const totalEntries = await redis.scard('entries');
    const drawTime = await redis.get('draw_time');
    const timeRemaining = drawTime ? Math.max(0, Math.floor((parseInt(drawTime as string) - Date.now()) / 1000)) : 0;
    
    // Get current winner
    const winnerData = await redis.hgetall('current_winner');
    const winner = winnerData && Object.keys(winnerData).length > 0 ? {
      walletAddress: winnerData.walletAddress as string,
      entry: {
        tournament: winnerData.tournament as string,
        tournamentBuyIn: parseInt(winnerData.tournamentBuyIn as string),
        platform: winnerData.platform as string,
        hasRecasted: winnerData.hasRecasted === 'true',
        timestamp: parseInt(winnerData.timestamp as string)
      },
      drawnAt: parseInt(winnerData.drawnAt as string),
      totalEntries: parseInt(winnerData.totalEntries as string)
    } : null;

    // If wallet address provided, get user-specific data
    let userEntry = null;
    let hasEntered = false;
    if (walletAddress && walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      const entryData = await redis.hgetall(`entry:${walletAddress}`);
      if (entryData && Object.keys(entryData).length > 0) {
        hasEntered = true;
        userEntry = {
          walletAddress: entryData.walletAddress as string,
          platform: entryData.platform as string,
          tournament: {
            name: entryData.tournament as string,
            buyIn: parseInt(entryData.tournamentBuyIn as string)
          },
          timestamp: parseInt(entryData.timestamp as string),
          hasRecasted: entryData.hasRecasted === 'true',
          userProfile: entryData.userProfile ? JSON.parse(entryData.userProfile as string) : null
        };
      }
    }

    // Auto-trigger draw if time is up and no winner yet
    if (timeRemaining <= 0 && !winner && totalEntries > 0) {
      try {
        const drawResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/draw`, {
          method: 'POST'
        });
        const drawResult = await drawResponse.json();
        
        if (drawResult.success) {
          // Refresh winner data
          const newWinnerData = await redis.hgetall('current_winner');
          if (newWinnerData && Object.keys(newWinnerData).length > 0) {
            return NextResponse.json({
              success: true,
              totalEntries,
              timeRemaining: 0,
              hasEntered,
              userEntry,
              tournament: userEntry?.tournament || null,
              winner: {
                walletAddress: newWinnerData.walletAddress as string,
                entry: {
                  tournament: newWinnerData.tournament as string,
                  tournamentBuyIn: parseInt(newWinnerData.tournamentBuyIn as string),
                  platform: newWinnerData.platform as string,
                  hasRecasted: newWinnerData.hasRecasted === 'true',
                  timestamp: parseInt(newWinnerData.timestamp as string)
                },
                drawnAt: parseInt(newWinnerData.drawnAt as string),
                totalEntries: parseInt(newWinnerData.totalEntries as string)
              }
            });
          }
        }
      } catch (error) {
        console.error('Auto-draw failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      totalEntries,
      timeRemaining,
      hasEntered,
      userEntry,
      tournament: userEntry?.tournament || null,
      winner
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}