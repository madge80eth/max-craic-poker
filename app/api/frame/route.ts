import { NextResponse } from "next/server";

export async function GET() {
  const frameData = {
    name: "Max Craic Poker Draw",
    description: "Enter now to win 5% if we cash — 10% if you recast",
    image: "https://max-craic-poker.vercel.app/frame.png",
    post_url: "https://max-craic-poker.vercel.app/api/enter",
    buttons: ["Enter Now"],
    input_text: "",
    version: "vNext"
  };

  return new NextResponse(JSON.stringify({ metadata: frameData }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

