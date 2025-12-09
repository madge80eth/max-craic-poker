import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // Get active hand
    const activeHandData = await redis.get('hoth:active');
    let activeHand = null;
    let timeRemaining = 0;

    if (activeHandData) {
      // Handle both string and object responses
      const hand = typeof activeHandData === 'string' ? JSON.parse(activeHandData) : activeHandData;
      const timeElapsed = Math.floor((Date.now() - hand.releaseTime) / 1000);
      timeRemaining = Math.max(0, 90 - timeElapsed);

      if (timeRemaining > 0) {
        activeHand = {
          id: hand.id,
          cards: hand.cards,
          releaseTime: hand.releaseTime,
          timeRemaining,
          voteCount: Object.keys(hand.votes || {}).length
          // NOTE: outcome not included
        };
      } else {
        // Voting window closed, auto-finalize
        // Get session results
        const resultsData = await redis.get('hoth:session_results');
        let results: Record<string, number> = {};
        if (resultsData) {
          results = typeof resultsData === 'string' ? JSON.parse(resultsData) : resultsData;
        }

        // Check votes against outcome
        for (const [wallet, vote] of Object.entries(hand.votes)) {
          if (vote === hand.outcome) {
            results[wallet] = (results[wallet] || 0) + 1;
          }
        }

        // Update session results
        await redis.set('hoth:session_results', JSON.stringify(results));

        // Clear active hand
        await redis.del('hoth:active');

        console.log(`✅ Auto-finalized hand ${hand.id}: ${Object.keys(hand.votes).length} votes, outcome was ${hand.outcome}`);
      }
    }

    // Get queue
    const queueData = await redis.get('hoth:queue');
    let queue = [];
    if (queueData) {
      if (typeof queueData === 'string') {
        queue = JSON.parse(queueData);
      } else if (Array.isArray(queueData)) {
        queue = queueData;
      }
    }

    return NextResponse.json({
      active: activeHand,
      queueLength: queue.length,
      queue: queue.map((h: any) => ({
        id: h.id,
        cards: h.cards,
        outcome: h.outcome
      }))
    });

  } catch (error) {
    console.error('Error getting status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
