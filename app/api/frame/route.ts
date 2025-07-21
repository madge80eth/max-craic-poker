import { NextResponse } from "next/server";
import { FrameMetadata } from "@farcaster/core";

export async function GET() {
  const metadata = new FrameMetadata({
    name: "Max Craic Poker Draw",
    description: "Enter now to win 5% if we cash — 10% if you recast",
    image: "https://max-craic-poker.vercel.app/frame.png",
    postUrl: "https://max-craic-poker.vercel.app/api/enter",
    buttons: [
      { label: "Enter Now" }
    ],
  });

  return new NextResponse(metadata.toResponse(), {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
