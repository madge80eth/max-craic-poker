import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { handId } = await req.json();

    if (!handId) {
      return NextResponse.json(
        { error: 'Missing handId' },
        { status: 400 }
      );
    }

    // Get queue
    const queueJson = await redis.get('hoth:queue');
    if (!queueJson) {
      return NextResponse.json(
        { error: 'No queue found' },
        { status: 400 }
      );
    }

    const queue = JSON.parse(queueJson as string);
    const newQueue = queue.filter((h: any) => h.id !== handId);

    if (newQueue.length === queue.length) {
      return NextResponse.json(
        { error: 'Hand not found in queue' },
        { status: 404 }
      );
    }

    await redis.set('hoth:queue', JSON.stringify(newQueue));

    console.log(`🗑️  Deleted hand ${handId} from queue`);

    return NextResponse.json({
      success: true,
      queueLength: newQueue.length
    });

  } catch (error) {
    console.error('Error deleting hand:', error);
    return NextResponse.json(
      { error: 'Failed to delete hand' },
      { status: 500 }
    );
  }
}
