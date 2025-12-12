import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Get HOTH settings for stream delay
    const settingsData = await redis.get('hoth:settings');
    let streamDelaySeconds = 0;
    if (settingsData) {
      const settings = typeof settingsData === 'string' ? JSON.parse(settingsData) : settingsData;
      streamDelaySeconds = settings.streamDelaySeconds || 0;
    }

    // Check if there's already an active hand
    const activeHandData = await redis.get('hoth:active');
    if (activeHandData) {
      // Handle both string and object responses from Redis
      const activeHand = typeof activeHandData === 'string'
        ? JSON.parse(activeHandData)
        : activeHandData;
      const timeRemaining = 120 - Math.floor((Date.now() - activeHand.releaseTime) / 1000);

      if (timeRemaining > 0) {
        return NextResponse.json(
          { error: `Hand already active with ${timeRemaining}s remaining` },
          { status: 400 }
        );
      }
    }

    // Get queue
    const queueData = await redis.get('hoth:queue');
    if (!queueData) {
      return NextResponse.json(
        { error: 'No hands in queue' },
        { status: 400 }
      );
    }

    // Handle both string and object/array responses from Redis
    let queue;
    if (typeof queueData === 'string') {
      queue = JSON.parse(queueData);
    } else if (Array.isArray(queueData)) {
      queue = queueData;
    } else {
      // Unexpected type
      console.error('Unexpected queue data type:', typeof queueData);
      queue = [];
    }
    if (queue.length === 0) {
      return NextResponse.json(
        { error: 'Queue is empty' },
        { status: 400 }
      );
    }

    // Remove first hand from queue
    const hand = queue.shift();
    await redis.set('hoth:queue', JSON.stringify(queue));

    // Apply stream delay - release time is NOW + stream delay
    // This way the hand appears to users after the stream delay
    const releaseTime = Date.now() + (streamDelaySeconds * 1000);

    // Mark as released and set delayed timestamp
    hand.released = true;
    hand.releaseTime = releaseTime;
    hand.votes = {};
    hand.streamDelaySeconds = streamDelaySeconds; // Store for reference

    // Set as active hand
    await redis.set('hoth:active', JSON.stringify(hand));

    const delayMsg = streamDelaySeconds > 0 ? ` (delayed ${streamDelaySeconds}s for stream)` : '';
    console.log(`🎴 Released hand: ${hand.cards} - Voting open for 120 seconds${delayMsg}`);

    return NextResponse.json({
      success: true,
      hand: {
        id: hand.id,
        cards: hand.cards,
        releaseTime: hand.releaseTime,
        streamDelaySeconds: streamDelaySeconds
        // NOTE: outcome is NOT sent to frontend to prevent cheating
      },
      queueRemaining: queue.length
    });

  } catch (error) {
    console.error('Error releasing hand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to release hand: ${errorMessage}` },
      { status: 500 }
    );
  }
}
