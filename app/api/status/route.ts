import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    // Get current winner - Upstash Redis returns parsed JSON automatically
    const winnerData = await redis.get("winner")
    const winner = winnerData ? JSON.parse(winnerData as string) : null
    
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