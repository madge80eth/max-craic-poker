// app/api/frame/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    image: "https://max-craic-poker.vercel.app/api/frame-image",
    buttons: [{ label: "Got POST" }],
  });
}
