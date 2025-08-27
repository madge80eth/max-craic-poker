/** @jsxImportSource react */
import React from 'react';
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function GET() {
  // ✅ Hardcoded test list
  const tournaments = [
    "Battle of Malta – €109",
    "Big $44 PKO – 100k GTD",
    "Daily Legends $222",
  ];

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          color: 'white',
          fontSize: 40,
          padding: '60px',
        }}
      >
        <h1 style={{ fontSize: 60, marginBottom: 40 }}>
          🎲 Today&apos;s Tournaments
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {tournaments.map((t, i) => (
            <div key={i} style={{ fontSize: 36 }}>
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
}
