import { NextResponse } from 'next/server';
import { join } from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'frame.png');
  try {
    const imageBuffer = await fs.readFile(filePath);
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new NextResponse('Image not found', { status: 404 });
  }
}
