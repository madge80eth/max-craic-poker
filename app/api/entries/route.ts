import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const redisRes = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/lrange/entries/0/-1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      }
    );

    if (!redisRes.ok) {
      throw new Error(`Redis error: ${redisRes.statusText}`);
    }

    const data = await redisRes.json();
    const entries = data.result.map((item: string) => JSON.parse(item));

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error in /api/entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
