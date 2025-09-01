// app/api/frame/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    type: "frame",
    version: "1",
    image: "https://max-craic-poker.vercel.app/api/frame-image",
    buttons: [{ label: "Got POST" }]
  });
}
