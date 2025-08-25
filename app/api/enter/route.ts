import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json({ error: 'Missing FID' }, { status: 400 });
    }

    const entry = { fid, timestamp: new Date().toISOString() };

    // Save entry to Redis
    await fetch(
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

    // ✅ Correct Farcaster Frame response
    return NextResponse.json({
      image: "https://max-craic-poker.vercel.app/api/frame-image?entered=true",
      buttons: [
        { label: "✅ Entered!" }
      ],
      post_url: "https://max-craic-poker.vercel.app/api/enter"
    });
  } catch (error) {
    console.error("Error in /api/enter:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
