import { NextResponse } from 'next/server';

export async function GET() {
  const frameMetadata = {
    name: 'Max Craic Poker Draw',
    description: 'Enter now to win 5% if we cash — 10% if you recast',
    image: 'https://max-craic-poker.vercel.app/frame.png',
    post_url: 'https://max-craic-poker.vercel.app/api/enter',
    buttons: ['Enter Now'],
    version: 'vNext'
  };

  return new NextResponse(JSON.stringify(frameMetadata), {
    status: 200,
    headers: {
      'Content-Type': 'application/json+frame',
      'Cache-Control': 'no-store',
    },
  });
}
