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
          background: 'white',
          color: 'black',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 48,
        }}
      >
        TEST
      </div>
    ),
    {
      width: 400,
      height: 200,
    }
  );
}
