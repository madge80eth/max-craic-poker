// app/api/frame-image/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

const tournaments = [
  "Battle of Malta – €109",
  "Big $44 PKO – 100k GTD",
  "Daily Legends $222",
  "The Bounty Hunter – $44",
  "The Craic Classic – $5.50",
  "Midnight Madness – $33",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entered = searchParams.get("entered");

    // ✅ Entered state
    if (entered) {
      return new ImageResponse(
        (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: "linear-gradient(to right, #38ef7d, #11998e)",
              fontSize: 48,
              color: "white",
            }}
          >
            🎉 You’re Entered! 🎉
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    // ✅ Default state (show tournaments list)
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, #f7971e, #ffd200)",
            color: "black",
            padding: "40px",
            fontSize: 36,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              marginBottom: "20px",
            }}
          >
            Today&apos;s Tournaments
          </div>
          <ul style={{ textAlign: "left" }}>
            {tournaments.map((t, i) => (
              <li key={i} style={{ marginBottom: "10px" }}>
                {t}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "40px", fontSize: 32 }}>
            ⏳ Draw closes soon
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err) {
    console.error("Frame image error:", err);
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "black",
            color: "white",
            fontSize: 48,
          }}
        >
          Error rendering image
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
