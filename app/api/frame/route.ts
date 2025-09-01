// app/api/frame/route.ts
import { NextResponse } from "next/server";
import { NeynarAPIClient, isApiErrorResponse } from "@neynar/nodejs-sdk";
import { redis } from "@/lib/redis";

const client = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_API_KEY as string,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify frame payload
    const { trustedData } = body || {};
    const { messageBytes } = trustedData || {};

    if (!messageBytes) {
      return NextResponse.json(
        { error: "Missing messageBytes" },
        { status: 400 }
      );
    }

    const frameValidation = await client.validateFrameAction(messageBytes);
    if (isApiErrorResponse(frameValidation)) {
      return NextResponse.json(
        { error: "Invalid frame action" },
        { status: 400 }
      );
    }

    const fid = frameValidation.action?.interactor?.fid;
    if (!fid) {
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    // Check if already entered
    const existing = await redis.get(fid.toString());
    if (existing) {
      let tournament;
      try {
        tournament =
          typeof existing === "string" ? JSON.parse(existing) : existing;
      } catch {
        tournament = existing;
      }

      return NextResponse.json({
        image: "https://max-craic-poker.vercel.app/api/frame-image",
        buttons: [{ label: "Already Entered", action: "post" }],
        state: { fid, tournament },
      });
    }

    // Otherwise, fetch active tournament
    const communityTournament = await redis.get("communityTournament");
    if (!communityTournament) {
      return NextResponse.json({
        image: "https://max-craic-poker.vercel.app/api/frame-image",
        buttons: [{ label: "No Active Tournament", action: "post" }],
      });
    }

    // Store entry
    await redis.set(fid.toString(), communityTournament);

    return NextResponse.json({
      image: "https://max-craic-poker.vercel.app/api/frame-image",
      buttons: [{ label: "You’re Entered!", action: "post" }],
      state: { fid, tournament: communityTournament },
    });
  } catch (err) {
    console.error("Frame error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
