import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const body = await req.json();
  const { fid, tournament } = body;

  const filePath = path.join(process.cwd(), 'entries.json');
  const fileData = await fs.readFile(filePath, 'utf-8');
  const entries = JSON.parse(fileData);

  // 🔒 Check if FID already entered
  const existingEntry = entries.find((entry: any) => entry.fid === fid);

  if (existingEntry) {
    return NextResponse.json({
      status: 'exists',
      assigned: existingEntry.tournament,
    });
  }

  // ✅ Save new entry
  const newEntry = {
    fid,
    tournament,
    timestamp: new Date().toISOString(),
  };

  entries.push(newEntry);
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2));

  return NextResponse.json({ status: 'ok', assigned: tournament });
}
