// app/api/draw/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST() {
  try {
    // Get all entries
    const entries = await redis.hgetall("entries");
    if (!entries || Object.keys(entries).length === 0) {
      return NextResponse.json({ error: "No entries found" }, { status: 400 });
    }

    // Pick random winner FID
    const fids = Object.keys(entries);
    const winnerFid = fids[Math.floor(Math.random() * fids.length)];
    const winnerEntryRaw = entries[winnerFid];

    // Parse safely
    let winnerEntry: any;
    try {
      winnerEntry = JSON.parse(winnerEntryRaw as string);
    } catch {
      winnerEntry = { fid: winnerFid, raw: winnerEntryRaw };
    }

    // Save winner
    await redis.set("winner", JSON.stringify({ fid: winnerFid, entry: winnerEntry }));

    return NextResponse.json({
      success: true,
      winner: { fid: winnerFid, entry: winnerEntry },
    });
  } catch (err) {
    console.error("Error in /api/draw:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
