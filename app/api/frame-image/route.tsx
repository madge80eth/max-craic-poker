/** @jsxImportSource react */
import React from 'react';
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import tournaments from '../../../tournaments.json'; // ✅ direct import instead of fs/path

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: 'black',
            color: 'white',
            fontSize: 36,
            padding: '40px',
          }}
        >
          <h1 style={{ fontSize: 48, marginBottom: 40 }}>
            🎲 Max Craic Poker
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {tournaments.map((t, i) => (
              <div key={i} style={{ fontSize: 32 }}>
                • {t}
              </div>
            ))}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err) {
    console.error('Error generating frame image:', err);
    return new Response('Failed to generate image', { status: 500 });
  }
}
