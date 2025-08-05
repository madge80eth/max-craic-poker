import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Debug logs for environment vars (safe partial reveal)
    console.log("🔑 ADMIN_RESET_KEY exists:", !!process.env.ADMIN_RESET_KEY);
    console.log("🔗 UPSTASH_REDIS_REST_URL:", process.env.UPSTASH_REDIS_REST_URL);
    console.log("🪙 UPSTASH_REDIS_REST_TOKEN present:", !!process.env.UPSTASH_REDIS_REST_TOKEN);

    // Check API key
    const authHeader = req.headers.get('x-api-key');
    if (authHeader !== process.env.ADMIN_RESET_KEY) {
      console.warn("⚠️ Unauthorized attempt to reset");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call Upstash Redis REST API
    const redisRes = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/del/entries`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const redisText = await redisRes.text();
    console.log("📦 Redis response:", redisText);

    if (!redisRes.ok) {
      throw new Error(`Redis error: ${redisRes.status} ${redisRes.statusText} — ${redisText}`);
    }

    return NextResponse.json({ success: true, message: 'Entries cleared' });
  } catch (error) {
    console.error('❌ Error in /api/reset:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
