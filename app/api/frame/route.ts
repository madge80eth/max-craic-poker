import { NextResponse } from "next/server";
import { createFrameMetadata } from "@farcaster/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const metadata = createFrameMetadata({
    buttons: ["Enter Now"],
    image: "https://max-craic-poker.vercel.app/frame.png",
    inputText: "",
    postUrl: "https://max-craic-poker.vercel.app/api/enter",
    name: "Max Craic Poker Draw",
    description: "Enter now to win 5% if we cash — 10% if you recast",
  });

  return new NextResponse(metadata, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
