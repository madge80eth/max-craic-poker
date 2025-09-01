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

    const validation = await client.validateFrameAction(messageBytes);

    // Echo fid back so we can confirm
    const fid = validation?.action?.interactor?.fid;

    return NextResponse.json({
      image: "https://max-craic-poker.vercel.app/api/frame-image",
      buttons: [{ label: `FID: ${fid ?? "unknown"}`, action: "post" }],
      state: { raw: validation },
    });
  } catch (err) {
    console.error("Frame error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(err) },
      { status: 500 }
    );
  }
}
