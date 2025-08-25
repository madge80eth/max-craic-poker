import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing FID' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const entry = {
      fid,
      timestamp: new Date().toISOString(),
    };

    // ✅ Call Upstash REST API
    const redisRes = await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/lpush/entries`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([JSON.stringify(entry)])
      }
    );

    const redisText = await redisRes.text();
    console.log("Redis response:", redisText);

    // ✅ Always return Redis response so we can debug
    if (!redisRes.ok) {
      return new NextResponse(
        JSON.stringify({ error: `Redis error`, details: redisText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ✅ Valid Farcaster Frame response
    const frameResponse = {
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image?entered=true",
      buttons: [
        { label: "✅ Entered!" }
      ]
    };

    return new NextResponse(
      JSON.stringify(frameResponse),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in /api/enter:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
