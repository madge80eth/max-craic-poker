import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'black',
          color: 'white',
          width: '100%',
          height: '100%',
          padding: '60px',
        }}
      >
        <img
          src="https://max-craic-poker.vercel.app/logo.png"
          width={120}
          style={{ marginBottom: 40 }}
        />
        <strong style={{ fontSize: 60 }}>Today's Tournaments</strong>
        <ul style={{ fontSize: 42, marginTop: 40, lineHeight: 1.5 }}>
          <li>Battle of Malta – €109</li>
          <li>Big $44 PKO – 100k GTD</li>
          <li>Daily Legends $222</li>
          <li>The Bounty Hunter – $44</li>
          <li>The Craic Classic – $5.50</li>
          <li>Midnight Madness – $33</li>
        </ul>
        <div style={{ fontSize: 38, marginTop: 60 }}>
          Draw closes in 7h 59m
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
