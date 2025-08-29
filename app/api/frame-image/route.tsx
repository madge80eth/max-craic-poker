import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entered = searchParams.get("entered") === "true";

  // Show different images depending on entered state
  const text = entered ? "🎉 You’re Entered! 🎉" : "🚀 HELLO WORLD V2 🚀";
  const bgColor = entered ? "lightgreen" : "yellow";
  const textColor = entered ? "darkgreen" : "red";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: bgColor,
          fontSize: 60,
          color: textColor,
        }}
      >
        {text}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
