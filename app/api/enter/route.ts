// app/api/enter/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = body?.fid || "test-user"; // fallback while testing

    // Check if user already entered
    const existing = await redis.get(fid);
    if (existing) {
      return NextResponse.json({
        version: "next",
        imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
        buttons: [{ title: "Already Entered" }]
      });
    }

    // Otherwise, mark as entered
    await redis.set(fid, "entered");

    return NextResponse.json({
      version: "next",
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
      buttons: [{ title: "You’re Entered!" }]
    });
  } catch (err) {
    console.error("Enter error:", err);
    return NextResponse.json(
      {
        version: "next",
        imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
        buttons: [{ title: "Error, try again" }]
      },
      { status: 500 }
    );
  }
}
