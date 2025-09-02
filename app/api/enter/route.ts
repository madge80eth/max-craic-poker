import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    // Log the full request URL
    console.log("ENTER endpoint hit:", req.url)

    // Log headers for debugging
    console.log("Headers:", Object.fromEntries(req.headers.entries()))

    // Try to parse JSON body
    let body = null
    try {
      body = await req.json()
    } catch (err) {
      console.log("No JSON body or failed to parse:", err)
    }
    console.log("Request body:", body)

    // Respond with a simple frame JSON (for testing)
    return NextResponse.json({
      version: "vNext",
      image: "https://max-craic-poker.vercel.app/api/frame-image",
      buttons: [
        {
          label: "Back to Start"
        }
      ],
      post_url: "https://max-craic-poker.vercel.app/share"
    })
  } catch (error) {
    console.error("Error in /api/enter:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
