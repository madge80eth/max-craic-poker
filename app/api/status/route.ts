import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    // Get current winner - Upstash returns objects directly, no need to parse
    const winner = await redis.get("winner")
    
    // Get total entries count
    const entries = await redis.hgetall("entries")
    const totalEntries = entries ? Object.keys(entries).length : 0

    return NextResponse.json({
      success: true,
      winner,
      totalEntries,
      hasWinner: !!winner
    })

  } catch (error) {
    console.error("Error in /api/status:", error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  return GET()
}