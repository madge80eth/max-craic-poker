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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: "linear-gradient(45deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)",
              fontSize: 48,
              color: "white",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: "20px" }}>🎉</div>
            <div>You're Entered!</div>
            <div style={{ fontSize: 32, marginTop: "20px", color: "#a78bfa" }}>
              Good luck in the draw!
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

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
            background: "linear-gradient(45deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)",
            fontSize: 32,
            color: "white",
            padding: "40px",
          }}
        >
          <div style={{ 
            fontSize: 72, 
            fontWeight: "bold", 
            marginBottom: "10px",
            color: "white"
          }}>
            MAX CRAIC
          </div>
          <div style={{ 
            fontSize: 48, 
            fontWeight: "bold", 
            color: "#ef4444", 
            marginBottom: "30px" 
          }}>
            POKER
          </div>
          <div style={{ 
            fontSize: 28, 
            color: "#c4b5fd", 
            marginBottom: "30px",
            textAlign: "center"
          }}>
            Community-Rewarded Poker
          </div>
          <div style={{ 
            fontSize: 24, 
            fontWeight: "bold", 
            marginBottom: "20px",
            color: "#fbbf24"
          }}>
            Today's Tournaments:
          </div>
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "8px",
            alignItems: "center"
          }}>
            <div style={{ fontSize: 20, color: "#e5e7eb" }}>• The Bounty Hunter - $44</div>
            <div style={{ fontSize: 20, color: "#e5e7eb" }}>• Midnight Madness - $33</div>
            <div style={{ fontSize: 20, color: "#e5e7eb" }}>• Progressive KO - $22</div>
            <div style={{ fontSize: 20, color: "#e5e7eb" }}>• Evening Flight - $77</div>
            <div style={{ fontSize: 20, color: "#e5e7eb" }}>• Late Night Grind - $55</div>
          </div>
          <div style={{ 
            marginTop: "30px", 
            fontSize: 22, 
            color: "#a78bfa",
            textAlign: "center"
          }}>
            Winner gets 5% profit + 5% bonus for sharing!
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