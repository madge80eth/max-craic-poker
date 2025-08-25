import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
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

    // Save entry to Redis
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

    // ✅ Proper Farcaster Frame response
    return NextResponse.json({
      type: "frame",
      version: "1",
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image?entered=true",
      buttons: [
        { label: "✅ Entered!" }
      ]
    });
  } catch (error) {
    console.error('Error in /api/enter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
