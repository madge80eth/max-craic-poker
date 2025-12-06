import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // Get active hand
    const activeHandJson = await redis.get('hoth:active');
    let activeHand = null;
    let timeRemaining = 0;

    if (activeHandJson) {
      const hand = JSON.parse(activeHandJson as string);
      timeRemaining = Math.max(0, 90 - Math.floor((Date.now() - hand.releaseTime) / 1000));

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
        // Voting window closed, clear active hand
        await redis.del('hoth:active');
      }
    }

    // Get queue
    const queueJson = await redis.get('hoth:queue');
    const queue = queueJson ? JSON.parse(queueJson as string) : [];

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
