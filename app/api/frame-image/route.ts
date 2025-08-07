import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          fontSize: 48,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Max Craic Poker 🍀<br />Enter now to win!
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
