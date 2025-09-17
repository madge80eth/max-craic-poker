// app/api/reset/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Load tournaments.json from the public folder
async function loadTournaments() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/tournaments.json`);
  if (!res.ok) throw new Error("Failed to load tournaments.json");
  return res.json();
}

export async function POST() {
  try {
    // Clear old state - all possible keys
    await redis.del("entries");
    await redis.del("winner");
    await redis.del("current_winner");
    await redis.del("draw_time");
    await redis.del("communityTournament");
    
    // Clear the specific mock wallet entry hash
    await redis.del("entry:0x742d35Cc6564C5532C3C1e5329A8C0d3f1e90F43");

    // Load tournaments and pick one at random
    const tournaments = await loadTournaments();
    const randomTournament =
      tournaments[Math.floor(Math.random() * tournaments.length)];

    // Save chosen tournament (as JSON string)
    await redis.set("communityTournament", JSON.stringify(randomTournament));

    return NextResponse.json({
      success: true,
      communityTournament: randomTournament,
      message: "All Redis data cleared and new tournament selected"
    });
  } catch (err) {
    console.error("Error in /api/reset:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}