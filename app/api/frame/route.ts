import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    name: "Max Craic Poker Draw",
    description: "Enter now to win 5% if we cash — 10% if you recast",
    image: "https://max-craic-poker.vercel.app/api/frame-image2",
    post_url: "https://max-craic-poker.vercel.app/api/enter",
    buttons: ["Enter Now"],
    version: "vNext",
  };

  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
