import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Check if there's already an active hand
    const activeHandJson = await redis.get('hoth:active');
    if (activeHandJson) {
      const activeHand = JSON.parse(activeHandJson as string);
      const timeRemaining = 90 - Math.floor((Date.now() - activeHand.releaseTime) / 1000);

      if (timeRemaining > 0) {
        return NextResponse.json(
          { error: `Hand already active with ${timeRemaining}s remaining` },
          { status: 400 }
        );
      }
    }

    // Get queue
    const queueJson = await redis.get('hoth:queue');
    if (!queueJson) {
      return NextResponse.json(
        { error: 'No hands in queue' },
        { status: 400 }
      );
    }

    const queue = JSON.parse(queueJson as string);
    if (queue.length === 0) {
      return NextResponse.json(
        { error: 'Queue is empty' },
        { status: 400 }
      );
    }

    // Remove first hand from queue
    const hand = queue.shift();
    await redis.set('hoth:queue', JSON.stringify(queue));

    // Mark as released and set timestamp
    hand.released = true;
    hand.releaseTime = Date.now();
    hand.votes = {};

    // Set as active hand
    await redis.set('hoth:active', JSON.stringify(hand));

    console.log(`🎴 Released hand: ${hand.cards} - Voting open for 90 seconds`);

    return NextResponse.json({
      success: true,
      hand: {
        id: hand.id,
        cards: hand.cards,
        releaseTime: hand.releaseTime
        // NOTE: outcome is NOT sent to frontend to prevent cheating
      },
      queueRemaining: queue.length
    });

  } catch (error) {
    console.error('Error releasing hand:', error);
    return NextResponse.json(
      { error: 'Failed to release hand' },
      { status: 500 }
    );
  }
}
