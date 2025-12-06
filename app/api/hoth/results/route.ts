import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // Get session results
    const resultsJson = await redis.get('hoth:session_results');
    const results = resultsJson ? JSON.parse(resultsJson as string) : {};

    // Convert to leaderboard format
    const leaderboard = Object.entries(results)
      .map(([wallet, correct]: [string, any]) => ({
        wallet,
        correctPredictions: correct
      }))
      .sort((a, b) => b.correctPredictions - a.correctPredictions)
      .slice(0, 3); // Top 3

    return NextResponse.json({
      leaderboard
    });

  } catch (error) {
    console.error('Error getting results:', error);
    return NextResponse.json(
      { error: 'Failed to get results' },
      { status: 500 }
    );
  }
}

// POST endpoint to finalize a hand (called when voting window closes)
export async function POST(req: NextRequest) {
  try {
    // Get active hand
    const activeHandJson = await redis.get('hoth:active');
    if (!activeHandJson) {
      return NextResponse.json(
        { error: 'No active hand to finalize' },
        { status: 400 }
      );
    }

    const hand = JSON.parse(activeHandJson as string);

    // Get current session results
    const resultsJson = await redis.get('hoth:session_results');
    const results = resultsJson ? JSON.parse(resultsJson as string) : {};

    // Check votes against outcome
    for (const [wallet, vote] of Object.entries(hand.votes)) {
      if (vote === hand.outcome) {
        // Correct prediction
        results[wallet] = (results[wallet] || 0) + 1;
      }
    }

    // Update session results
    await redis.set('hoth:session_results', JSON.stringify(results));

    // Clear active hand
    await redis.del('hoth:active');

    console.log(`✅ Finalized hand ${hand.id}: ${Object.keys(hand.votes).length} votes, outcome was ${hand.outcome}`);

    return NextResponse.json({
      success: true,
      outcome: hand.outcome,
      totalVotes: Object.keys(hand.votes).length,
      correctVotes: Object.values(hand.votes).filter(v => v === hand.outcome).length
    });

  } catch (error) {
    console.error('Error finalizing hand:', error);
    return NextResponse.json(
      { error: 'Failed to finalize hand' },
      { status: 500 }
    );
  }
}
