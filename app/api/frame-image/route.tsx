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

    // 🔹 Super simple tournaments placeholder
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, #f7971e, #ffd200)",
            fontSize: 48,
            color: "black",
          }}
        >
          🃏 Today’s Tournaments Placeholder
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
