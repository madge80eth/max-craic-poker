import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { wallet, vote } = await req.json();

    // Validate input
    if (!wallet || !vote) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet, vote' },
        { status: 400 }
      );
    }

    if (vote !== 'win' && vote !== 'lose') {
      return NextResponse.json(
        { error: 'Vote must be "win" or "lose"' },
        { status: 400 }
      );
    }

    // Get active hand
    const activeHandJson = await redis.get('hoth:active');
    if (!activeHandJson) {
      return NextResponse.json(
        { error: 'No active hand to vote on' },
        { status: 400 }
      );
    }

    const hand = JSON.parse(activeHandJson as string);

    // Check voting window (90 seconds - enforced)
    const timeElapsed = Math.floor((Date.now() - hand.releaseTime) / 1000);
    if (timeElapsed > 90) {
      return NextResponse.json(
        { error: 'Voting window closed' },
        { status: 400 }
      );
    }

    // Check if already voted
    if (hand.votes[wallet]) {
      return NextResponse.json(
        { error: 'You have already voted on this hand' },
        { status: 400 }
      );
    }

    // Record vote
    hand.votes[wallet] = vote;
    await redis.set('hoth:active', JSON.stringify(hand));

    console.log(`🗳️  Vote recorded: ${wallet.slice(0, 8)}... voted ${vote} on ${hand.cards}`);

    return NextResponse.json({
      success: true,
      vote
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
