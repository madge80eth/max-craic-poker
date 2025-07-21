import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const fid = body?.untrustedData?.fid;
  console.log("🎯 Frame clicked by FID:", fid);

  return NextResponse.json({
    message: "Entry received!",
  });
}
