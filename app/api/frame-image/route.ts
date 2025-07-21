// app/api/frame-image/route.ts
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "black",
          color: "white",
          width: "100%",
          height: "100%",
          padding: "40px",
          fontSize: 40,
          fontFamily: "sans-serif",
        }}
      >
        <strong>Today's Tournaments</strong>
        <ul style={{ marginTop: 20 }}>
          <li>Battle of Malta – €109</li>
          <li>Big $44 PKO – 100k GTD</li>
          <li>Daily Legends $222</li>
          <li>The Bounty Hunter – $44</li>
          <li>The Craic Classic – $5.50</li>
          <li>Midnight Madness – $33</li>
        </ul>
        <p style={{ marginTop: "auto", fontSize: 24 }}>
          Draw closes in 8h 00m
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
