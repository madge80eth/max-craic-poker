import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entered = searchParams.get("entered") === "true";

  if (entered) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #a8e063, #56ab2f)",
            fontSize: 70,
            fontWeight: "bold",
            color: "white",
          }}
        >
          🎉 You’re Entered! 🎉
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // ✅ Fetch tournaments.json from public
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://max-craic-poker.vercel.app"}/tournaments.json`);
  const tournaments: string[] = await res.json();

  // Countdown: fixed 12h
  const now = new Date();
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const diffMs = end.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdown = `${hours}h ${mins}m`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #ffe259, #ffa751)",
          fontSize: 40,
          color: "black",
          padding: "40px",
        }}
      >
        <div style={{ fontSize: 60, marginBottom: 20, fontWeight: "bold" }}>
          🍀 Max Craic Poker
        </div>
        <h1 style={{ fontSize: 50, marginBottom: 20 }}>
          🎲 Today’s Tournaments
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {tournaments.map((t, idx) => (
            <div key={idx} style={{ fontSize: 36 }}>
              • {t}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: "auto",
            fontSize: 32,
            fontWeight: "bold",
            color: "#222",
          }}
        >
          ⏳ Draw closes in {countdown}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
