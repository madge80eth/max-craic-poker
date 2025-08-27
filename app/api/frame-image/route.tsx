/** @jsxImportSource react */
import React from 'react';
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = 'auto'; // helps avoid region issues

export async function GET(req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          color: 'white',
          fontSize: 48,
        }}
      >
        🎲 Max Craic Poker
        <div style={{ fontSize: 36, marginTop: 20 }}>
          Test Tournament List
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
