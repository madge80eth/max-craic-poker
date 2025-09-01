// app/api/enter/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    // ✅ Require FID
    if (!fid) {
      return NextResponse.json(
        { error: "FID required to enter. Please create a Farcaster account." },
        { status: 400 }
      );
    }

    // Get current community tournament
    const tournamentRaw = await redis.get("communityTournament");
    if (!tournamentRaw) {
      return NextResponse.json(
        { error: "No active tournament. Please try again later." },
        { status: 400 }
      );
    }
    const tournament = JSON.parse(tournamentRaw);

    // Check if user already entered
    const existing = await redis.hget("entries", String(fid));
    if (existing) {
      return NextResponse.json({
        success: false,
        alreadyEntered: true,
        fid,
      });
    }

    // Store new entry with tournament
    const entry = { fid, tournament, body };
    await redis.hset("entries", { [String(fid)]: JSON.stringify(entry) });

    return NextResponse.json({ success: true, fid, tournament });
  } catch (err) {
    console.error("Error in /api/enter:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
