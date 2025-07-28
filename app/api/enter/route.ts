import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

type Entry = {
  fid: number;
  timestamp: string;
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json({ error: 'Missing FID' }, { status: 400 });
    }

    const entriesPath = join(process.cwd(), 'entries.json');
    let entries: Entry[] = [];

    try {
      const fileData = await fs.readFile(entriesPath, 'utf-8');
      entries = JSON.parse(fileData);
    } catch {
      // File doesn't exist or is empty — start fresh
      entries = [];
    }

    // Save new entry
    entries.push({ fid, timestamp: new Date().toISOString() });
    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));

    console.log(`✅ Entry saved for FID: ${fid}`);

    // Return success Frame metadata
    return NextResponse.json({
      image: 'https://max-craic-poker.vercel.app/success.png', // Swap this later for celebration frame
      buttons: ['OK'],
      version: 'vNext',
    });
  } catch (error) {
    console.error('❌ Error in /api/enter:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
