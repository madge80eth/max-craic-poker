import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const now = new Date().toISOString();

  // Paths
  const sessionPath = path.join(process.cwd(), 'session.json');
  const entriesPath = path.join(process.cwd(), 'entries.json');

  // Update session.json
  await fs.writeFile(sessionPath, JSON.stringify({ sessionStart: now }, null, 2));

  // Clear entries.json
  await fs.writeFile(entriesPath, '[]');

  return NextResponse.json({
    status: 'ok',
    message: `Session started at ${now}`,
  });
}
