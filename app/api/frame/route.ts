// app/api/frame/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Parse the incoming POST body
  const body = await req.json();

  console.log("Frame POST received:", body);

  // Return a minimal frame response
  return NextResponse.json({
    image: "https://max-craic-poker.vercel.app/api/frame-image",
    buttons: [
      { label: "Enter Now", action: "post" }
    ]
  });
}
