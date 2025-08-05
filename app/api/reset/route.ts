import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Read the provided password from request headers
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.ADMIN_RESET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redisRes = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/del/entries`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      }
    );

    if (!redisRes.ok) {
      throw new Error(`Redis error: ${redisRes.statusText}`);
    }

    return NextResponse.json({ success: true, message: 'Entries cleared' });
  } catch (error) {
    console.error('Error in /api/reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
