// app/api/frame-image/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entered = searchParams.get("entered");

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

    // 🔹 Tournament list (hardcoded for now)
    const tournaments = [
      "Battle of Malta – €109",
      "Big $44 PKO – 100k GTD",
      "Daily Legends $222",
      "The Bounty Hunter – $44",
      "The Craic Classic – $5.50",
      "Midnight Madness – $33",
    ];

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
            fontSize: 36,
            color: "black",
            padding: "40px",
          }}
        >
          <div style={{ fontSize: 48, fontWeight: "bold", marginBottom: "30px" }}>
            Today’s Tournaments
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tournaments.map((t, i) => (
              <div key={i}>• {t}</div>
            ))}
          </div>
          <div style={{ marginTop: "40px", fontSize: 28 }}>⏳ Draw closes soon</div>
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
