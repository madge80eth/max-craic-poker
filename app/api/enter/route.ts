import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

type Entry = {
  fid: number;
  timestamp: string;
};

export async function POST(req: NextRequest) {
  let data;

  // Separate try-catch to isolate bad JSON input
  try {
    data = await req.json();
    console.log("📦 Incoming request body:", data);
  } catch (err) {
    console.error("❌ Failed to parse JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fid = data?.untrustedData?.fid;

  if (!fid) {
    console.warn("⚠️ Missing or invalid FID in request");
    return NextResponse.json({ error: "Missing FID" }, { status: 400 });
  }

  const entriesPath = join(process.cwd(), 'entries.json');
  let entries: Entry[] = [];

  try {
    const fileData = await fs.readFile(entriesPath, 'utf-8');
    entries = JSON.parse(fileData);
  } catch (err) {
    console.log("📁 entries.json not found or empty. Starting fresh.");
    // No entries file yet — we’ll start from scratch
  }

  // Append new entry
  entries.push({ fid, timestamp: new Date().toISOString() });

  try {
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    console.log(`✅ Entry saved for FID: ${fid}`);
  } catch (err) {
    console.error("❌ Failed to write entries.json:", err);
    return NextResponse.json({ error: "Failed to write entries" }, { status: 500 });
  }

  // Respond with success Frame metadata
  return NextResponse.json({
    image: 'https://max-craic-poker.vercel.app/success.png',
    buttons: ['OK'],
    version: 'vNext',
  });
}
