// app/api/frame/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      image: "https://max-craic-poker.vercel.app/api/frame-image",
      buttons: [{ label: "Got POST", action: "post" }],
      state: body, // echo back everything Warpcast sent
    });
  } catch (err) {
    console.error("Frame error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(err) },
      { status: 500 }
    );
  }
}
