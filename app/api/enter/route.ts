import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return new NextResponse("Missing FID", { status: 400 });
    }

    const entry = { fid, timestamp: new Date().toISOString() };

    // Save to Redis (fire and forget)
    fetch(`${process.env.UPSTASH_REDIS_REST_URL}/lpush/entries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([JSON.stringify(entry)]),
    }).catch((err) => console.error("Redis error:", err));

    // ✅ Respond with a new Frame (HTML + meta tags)
    return new NextResponse(
      `
      <html>
        <head>
          <meta name="fc:frame" content="vNext" />
          <meta name="fc:frame:image" content="https://max-craic-poker.vercel.app/api/frame-image?entered=true" />
          <meta name="fc:frame:button:1" content="Recast to win +5%" />
          <meta name="fc:frame:button:1:action" content="link" />
          <meta name="fc:frame:button:1:target" content="https://warpcast.com/~/compose?text=Join%20the%20Max%20Craic%20Poker%20draw!&embeds[]=https://max-craic-poker.vercel.app/share" />
        </head>
      </html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Error in /api/enter:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
