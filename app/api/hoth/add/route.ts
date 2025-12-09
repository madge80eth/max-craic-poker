import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

// Validate card format (e.g., "Ac Jh")
function isValidCardFormat(cards: string): boolean {
  const parts = cards.trim().split(' ');
  if (parts.length !== 2) return false;

  const validRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const validSuits = ['s', 'h', 'd', 'c'];

  for (const card of parts) {
    if (card.length !== 2) return false;
    const rank = card[0];
    const suit = card[1];
    if (!validRanks.includes(rank) || !validSuits.includes(suit)) return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { cards, outcome } = await req.json();

    // Validate input
    if (!cards || !outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: cards, outcome' },
        { status: 400 }
      );
    }

    if (!isValidCardFormat(cards)) {
      return NextResponse.json(
        { error: 'Invalid card format. Use format like "Ac Jh" (rank: A,K,Q,J,T,9-2, suit: s,h,d,c)' },
        { status: 400 }
      );
    }

    if (outcome !== 'win' && outcome !== 'lose') {
      return NextResponse.json(
        { error: 'Outcome must be "win" or "lose"' },
        { status: 400 }
      );
    }

    // Get current queue
    const queueJson = await redis.get('hoth:queue');
    const queue = queueJson ? JSON.parse(queueJson as string) : [];

    // Check max queue size
    if (queue.length >= 6) {
      return NextResponse.json(
        { error: 'Queue is full (max 6 hands)' },
        { status: 400 }
      );
    }

    // Create new hand
    const newHand = {
      id: `hand_${Date.now()}`,
      cards: cards.trim(),
      outcome,
      released: false,
      votes: {}
    };

    // Add to queue
    queue.push(newHand);
    await redis.set('hoth:queue', JSON.stringify(queue));

    console.log(`✅ Added hand to queue: ${cards} - ${outcome}`);

    return NextResponse.json({
      success: true,
      hand: newHand,
      queueLength: queue.length
    });

  } catch (error) {
    console.error('Error adding hand to queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to add hand to queue',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
