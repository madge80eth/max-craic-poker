import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST() {
  try {
    // Get all entries
    const entries = await redis.hgetall('raffle_entries');

    if (!entries || Object.keys(entries).length === 0) {
      return NextResponse.json({ success: false, message: 'No entries found' });
    }

    // Filter valid entries only
    const validEntries: Array<{address: string, data: any}> = [];

    for (const [address, data] of Object.entries(entries)) {
      try {
        // Skip if it's a corrupted entry (doesn't look like JSON)
        if (typeof data === 'string' && !data.startsWith('{')) {
          console.log('Skipping corrupted entry:', address, data);
          continue;
        }

        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        validEntries.push({ address, data: parsed });
      } catch (err) {
        console.log('Parse error for', address, ':', err);
        continue;
      }
    }

    // Shuffle and pick 2 random winners
    const shuffled = [...validEntries].sort(() => Math.random() - 0.5);
    const twoWinners = shuffled.slice(0, 2);

    return NextResponse.json({
      success: true,
      totalEntries: Object.keys(entries).length,
      validEntries: validEntries.length,
      winners: twoWinners.map(w => ({
        walletAddress: w.address,
        platform: w.data.platform,
        timestamp: w.data.timestamp
      }))
    });

  } catch (error) {
    console.error('Manual draw error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed', error: String(error) },
      { status: 500 }
    );
  }
}
