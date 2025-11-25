import { NextResponse } from 'next/server';
import { getTournamentsData } from '@/lib/session';

export async function GET() {
  try {
    const data = await getTournamentsData();

    if (!data) {
      return NextResponse.json(
        { sessionId: '', streamStartTime: '', tournaments: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { sessionId: '', streamStartTime: '', tournaments: [] },
      { status: 200 }
    );
  }
}
