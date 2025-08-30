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

    // --- Default case (tournaments) ---
    let tournaments: string[] = [];
    try {
      // Hardcode prod URL for now (simpler + reliable)
      const res = await fetch("https://max-craic-poker.vercel.app/tournaments.json");
      tournaments = await res.json();
    } catch (err) {
      console.error("Failed to load tournaments.json:", err);
      tournaments = ["No tournaments available"];
    }

    // Countdown to 12 hours from now
    const now = new Date();
    const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const diffMs = end.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

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
            color: "white",
            padding: "40px",
            fontSize: 36,
          }}
        >
          <div style={{ fontSize: 48, fontWeight: "bold", marginBottom: "20px" }}>
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
            ⏳ Draw closes in {hours}h {mins}m
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
