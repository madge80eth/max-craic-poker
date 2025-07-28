// app/api/enter/route.ts

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
    console.log('🔍 Incoming POST data:', data);

    const fid = data?.untrustedData?.fid;

    if (!fid || typeof fid !== 'number') {
      console.warn('⚠️ Invalid or missing fid:', fid);
      return NextResponse.json({ error: 'Missing or invalid FID' }, { status: 400 });
    }

    const entriesPath = join(process.cwd(), 'entries.json');

    let entries: Entry[] = [];
    try {
      const fileData = await fs.readFile(entriesPath, 'utf-8');
      entries = JSON.parse(fileData);
    } catch (readError) {
      console.info('ℹ️ No existing entries file found — starting fresh.');
    }

    entries.push({
      fid,
      timestamp: new Date().toISOString(),
    });

    await fs.writeFile(entriesPath, JSON.stringify(entries, null, 2));
    console.log(`✅ Entry recorded for fid ${fid}. Total entries: ${entries.length}`);

    return NextResponse.json({
      image: 'https://max-craic-poker.vercel.app/success.png',
      buttons: ['OK'],
      version: 'vNext',
    });
  } catch (error) {
    console.error('❌ Fatal error in /api/enter:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
