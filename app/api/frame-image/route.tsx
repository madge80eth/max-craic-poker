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
          justifyContent: "flex-start",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          padding: 40,
          backgroundColor: "black",
          color: "white",
          fontSize: 28,
          fontFamily: "Geist Mono, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <h1 style={{ fontSize: 42, marginBottom: 24 }}>Today's Tournaments</h1>
        <p>• Battle of Malta – €109</p>
        <p>• Big $44 PKO – 100k GTD</p>
        <p>• Daily Legends – $222</p>
        <p>• The Bounty Hunter – $44</p>
        <p>• The Craic Classic – $5.50</p>
        <p>• Midnight Madness – $33</p>
        <div style={{ marginTop: 40, fontSize: 20 }}>Draw closes in 8h 00m</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
