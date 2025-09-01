// app/api/reset/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Handle GET requests (visit in browser)
export async function GET() {
  try {
    await redis.del("entries");
    return NextResponse.json({ success: true, message: "Entries reset via GET" });
  } catch (err) {
    console.error("Error in /api/reset GET:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle POST requests (curl, programmatic calls)
export async function POST() {
  try {
    await redis.del("entries");
    return NextResponse.json({ success: true, message: "Entries reset via POST" });
  } catch (err) {
    console.error("Error in /api/reset POST:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
