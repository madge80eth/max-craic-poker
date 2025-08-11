import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: 'vNext',
    name: 'Max Craic Poker Draw',
    description: 'Enter now to win 5% if we cash, 10% if you recast',
    image: {
      url: 'https://max-craic-poker.vercel.app/frame.png?v=' + Date.now(),
      aspect_ratio: '1.91:1'
    },
    post_url: 'https://max-craic-poker.vercel.app/api/enter',
    buttons: [
      { label: 'Enter Now' }
    ]
  });
}
