import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log("Redis URL:", process.env.UPSTASH_REDIS_REST_URL);
  console.log("Redis Token loaded?", !!process.env.UPSTASH_REDIS_REST_TOKEN);

  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json({ error: 'Missing FID' }, { status: 400 });
    }

    const entry = {
      fid,
      timestamp: new Date().toISOString(),
    };

    const redisRes = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/lpush/entries/${encodeURIComponent(JSON.stringify(entry))}`,
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

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error in /api/enter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
