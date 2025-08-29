import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entered = searchParams.get("entered") === "true";

  if (entered) {
    // ✅ Entered celebratory screen
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
            textAlign: "center",
          }}
        >
          🎉 You’re Entered! 🎉
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // ✅ Default: tournament list
  const filePath = path.join(process.cwd(), "tournaments.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const tournaments: string[] = JSON.parse(raw);

  // Countdown: fixed 12h timer from "now"
  const now = new Date();
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const diffMs = end.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000
