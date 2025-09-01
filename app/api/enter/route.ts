// app/api/enter/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json(
        { error: "FID required to enter. Please create a Farcaster account." },
        { status: 400 }
      );
    }

    // Get community tournament
    const tournamentRaw = await redis.get("communityTournament");
    if (!tournamentRaw) {
      return NextResponse.json(
        { error: "No community tournament set. Please reset first." },
        { status: 400 }
      );
    }
    const tournament = JSON.parse(tournamentRaw as string);

    // Check if already entered
    const existing = await redis.hget("entries", String(fid));
    if (existing) {
      return NextResponse.json({
        success: false,
        alreadyEntered: true,
        fid,
        tournament: JSON.parse(existing),
      });
    }

    // Always save a JSON string
    const entry = { fid, tournament };
    await redis.hset("entries", String(fid), JSON.stringify(entry));

    return NextResponse.json({
      success: true,
      fid,
      tournament,
    });
  } catch (err) {
    console.error("Error in /api/enter:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
