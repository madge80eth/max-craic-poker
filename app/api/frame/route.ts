// app/api/frame/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = {
    type: "frame",
    version: "1",
    image: "https://max-craic-poker.vercel.app/api/frame-image",
    buttons: [{ label: "Got POST" }],
    post_url: "https://max-craic-poker.vercel.app/api/frame"
  };

  return new NextResponse(JSON.stringify(res), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
