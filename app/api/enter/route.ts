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

    // Load today's community tournament
    const tournamentRaw = await redis.get("communityTournament");
    if (!tournamentRaw) {
      return NextResponse.json(
        { error: "No active tournament. Please try again later." },
        { status: 400 }
      );
    }

    let tournament;
    try {
      tournament = JSON.parse(tournamentRaw as string);
    } catch (parseErr) {
      console.error("Failed to parse tournamentRaw:", tournamentRaw, parseErr);
      throw parseErr;
    }

    // Check if already entered
    const existing = await redis.hget("entries", String(fid));
    if (existing) {
      return NextResponse.json({
        success: false,
        alreadyEntered: true,
        fid,
        tournament,
      });
    }

    // Store new entry
    const entry = { fid, tournament, body };
    try {
      await redis.hset("entries", { [String(fid)]: JSON.stringify(entry) });
    } catch (hsetErr) {
      console.error("Redis hset failed:", hsetErr);
      throw hsetErr;
    }

    return NextResponse.json({ success: true, fid, tournament });
  } catch (err) {
    console.error("Error in /api/enter:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
