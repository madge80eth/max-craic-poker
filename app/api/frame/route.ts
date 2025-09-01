import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const client = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_API_KEY as string,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trustedData } = body || {};
    const { messageBytes } = trustedData || {};

    if (!messageBytes) {
      return NextResponse.json(
        { error: "Missing messageBytes" },
        { status: 400 }
      );
    }

    // Try validating
    let fid: number | undefined = undefined;
    try {
      const validation = await client.validateFrameAction(messageBytes);
      fid = validation?.action?.interactor?.fid;
    } catch (err) {
      console.error("Validation failed:", err);
    }

    return NextResponse.json({
      image: "https://max-craic-poker.vercel.app/api/frame-image",
      buttons: [
        { label: fid ? `FID: ${fid}` : "Validation failed", action: "post" },
      ],
    });
  } catch (err) {
    console.error("Frame error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(err) },
      { status: 500 }
    );
  }
}
