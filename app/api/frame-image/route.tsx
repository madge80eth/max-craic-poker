// app/api/frame-image/route.tsx
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
          backgroundColor: "black",
          color: "white",
          width: "1200px",
          height: "630px",
          padding: "60px",
          fontSize: 40,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: 60, marginBottom: 40 }}>
          Today's Tournaments
        </div>
        {[
          "Battle of Malta – €109",
          "Big $44 PKO – 100k GTD",
          "Daily Legends $222",
          "The Bounty Hunter – $44",
          "The Craic Classic – $5.50",
          "Midnight Madness – $33",
        ].map((text, idx) => (
          <p key={idx} style={{ margin: "6px 0" }}>
            • {text}
          </p>
        ))}
        <div style={{ marginTop: "auto", fontSize: 28 }}>
          Draw closes in 8h 00m
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
