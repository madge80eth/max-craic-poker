/** @jsxImportSource react */
import React from 'react';
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'yellow',
          color: 'red',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 80,
          fontWeight: 'bold',
        }}
      >
        🚀 HELLO WORLD V2 🚀
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
