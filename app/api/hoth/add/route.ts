import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

// Normalize and validate card format
// Accepts: "Ac Jh", "AcJh", "AC JH", "ac jh", etc.
// Returns: normalized format like "Ac Jh" or throws error
function normalizeCards(input: string): string {
  const cleaned = input.trim().toUpperCase();

  // Remove all spaces
  const noSpaces = cleaned.replace(/\s+/g, '');

  // Should be exactly 4 characters (2 cards, 2 chars each)
  if (noSpaces.length !== 4) {
    throw new Error(`Invalid format: expected 4 characters (2 cards), got ${noSpaces.length}`);
  }

  const validRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const validSuits = ['S', 'H', 'D', 'C'];

  // Parse first card
  const card1Rank = noSpaces[0];
  const card1Suit = noSpaces[1];

  if (!validRanks.includes(card1Rank)) {
    throw new Error(`Invalid rank '${card1Rank}' in first card. Use: A,K,Q,J,T,9-2`);
  }
  if (!validSuits.includes(card1Suit)) {
    throw new Error(`Invalid suit '${card1Suit}' in first card. Use: s,h,d,c`);
  }

  // Parse second card
  const card2Rank = noSpaces[2];
  const card2Suit = noSpaces[3];

  if (!validRanks.includes(card2Rank)) {
    throw new Error(`Invalid rank '${card2Rank}' in second card. Use: A,K,Q,J,T,9-2`);
  }
  if (!validSuits.includes(card2Suit)) {
    throw new Error(`Invalid suit '${card2Suit}' in second card. Use: s,h,d,c`);
  }

  // Return normalized format: "Ac Jh" (capital rank, lowercase suit, space separated)
  return `${card1Rank}${card1Suit.toLowerCase()} ${card2Rank}${card2Suit.toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { cards, outcome } = await req.json();

    console.log('🎴 HOTH Add Request:', { cards, outcome });

    // Validate input
    if (!cards || !outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: cards, outcome' },
        { status: 400 }
      );
    }

    // Normalize and validate cards (accepts flexible formats)
    let normalizedCards: string;
    try {
      normalizedCards = normalizeCards(cards);
      console.log('✅ Normalized cards:', normalizedCards);
    } catch (err: any) {
      console.error('❌ Card validation failed:', err.message);
      return NextResponse.json(
        { error: err.message || 'Invalid card format' },
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
      cards: normalizedCards,  // Use normalized format
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
