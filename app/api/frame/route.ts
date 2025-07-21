import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "Max Craic Poker Draw",
    description: "Enter now to win 5% if we cash — 10% if you recast",
    image: "https://max-craic-poker.vercel.app/frame.png",
    post_url: "https://max-craic-poker.vercel.app/api/enter",
    buttons: ["Enter Now"],
    version: "vNext"
  });
}
