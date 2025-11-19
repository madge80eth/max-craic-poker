import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Test wallets for quick testing
const TEST_WALLETS = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
  '0x4444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555',
  '0x6666666666666666666666666666666666666666',
  '0x7777777777777777777777777777777777777777',
  '0x8888888888888888888888888888888888888888',
  '0x9999999999999999999999999999999999999999',
  '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
];

export async function POST(request: NextRequest) {
  try {
    // Add 10 test wallets to the draw
    const entries: Record<string, string> = {};

    for (let i = 0; i < TEST_WALLETS.length; i++) {
      const wallet = TEST_WALLETS[i];
      const entry = {
        walletAddress: wallet,
        platform: 'test',
        timestamp: Date.now() + i, // Slight offset for each
        hasShared: i % 2 === 0 // Alternating shared status for testing
      };
      entries[wallet] = JSON.stringify(entry);

      // Update entry history
      const historyKey = 'entry_history';
      const existingHistory = await redis.hget(historyKey, wallet);

      let historyData;
      if (existingHistory) {
        const parsed = typeof existingHistory === 'string' ? JSON.parse(existingHistory) : existingHistory;
        historyData = {
          totalEntries: parsed.totalEntries + 1,
          lastEntry: new Date().toISOString(),
          firstEntry: parsed.firstEntry,
          sessions: [...(parsed.sessions || []), new Date().toISOString()]
        };
      } else {
        historyData = {
          totalEntries: 1,
          lastEntry: new Date().toISOString(),
          firstEntry: new Date().toISOString(),
          sessions: [new Date().toISOString()]
        };
      }

      await redis.hset(historyKey, { [wallet]: JSON.stringify(historyData) });
    }

    // Batch add all test entries
    await redis.hset('raffle_entries', entries);

    return NextResponse.json({
      success: true,
      message: 'Test wallets added successfully',
      wallets: TEST_WALLETS,
      count: TEST_WALLETS.length
    });

  } catch (error) {
    console.error('Test draw error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add test wallets', error: String(error) },
      { status: 500 }
    );
  }
}
