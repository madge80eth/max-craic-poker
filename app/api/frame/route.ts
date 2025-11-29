// app/api/frame/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = {
    type: "frame",
    version: "1",
    imageUrl: "https://maxcraicpoker.com/api/frame-image",
    buttons: [
      {
        title: "Got POST",
        action: {
          type: "launch_frame",
          name: "Max Craic Poker",
          url: "https://maxcraicpoker.com/api/frame",
        },
      },
    ],
  };

  return new NextResponse(JSON.stringify(res), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
