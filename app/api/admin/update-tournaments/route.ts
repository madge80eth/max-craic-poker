import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, streamStartTime, tournaments } = body;

    // Validate required fields
    if (!sessionId || !streamStartTime || !tournaments || !Array.isArray(tournaments)) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, streamStartTime, tournaments' },
        { status: 400 }
      );
    }

    // Validate tournaments array
    if (tournaments.length === 0 || tournaments.length > 10) {
      return NextResponse.json(
        { success: false, message: 'Tournaments must have 1-10 entries' },
        { status: 400 }
      );
    }

    // Validate each tournament has name and buyIn
    for (const tournament of tournaments) {
      if (!tournament.name || !tournament.buyIn) {
        return NextResponse.json(
          { success: false, message: 'Each tournament must have name and buyIn' },
          { status: 400 }
        );
      }
    }

    // Build the tournaments data
    const tournamentsData = {
      sessionId,
      streamStartTime,
      tournaments: tournaments.filter((t: any) => t.name && t.name.trim() !== '')
    };

    // Write to public/tournaments.json
    const filePath = path.join(process.cwd(), 'public', 'tournaments.json');
    await fs.writeFile(filePath, JSON.stringify(tournamentsData, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Tournaments updated successfully',
      data: tournamentsData
    });

  } catch (error) {
    console.error('Update tournaments error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update tournaments', error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'tournaments.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to read tournaments', error: String(error) },
      { status: 500 }
    );
  }
}
