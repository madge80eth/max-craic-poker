import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function POST() {
  try {
    // Clear all entries and winner data
    await redis.del("entries")
    await redis.del("winner")
    
    return NextResponse.json({
      success: true,
      message: "Redis data cleared"
    })
  } catch (error) {
    console.error("Error clearing Redis:", error)
    return NextResponse.json({ error: "Failed to clear Redis" }, { status: 500 })
  }
}