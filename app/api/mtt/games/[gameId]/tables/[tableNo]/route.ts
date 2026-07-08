import { NextResponse } from 'next/server';
import { toClientState } from '@/lib/poker/engine';
import { redisTablesStore } from '@/lib/mtt/tablesStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string; tableNo: string }> }
) {
  const { gameId, tableNo } = await params;
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  const state = await redisTablesStore.getTable(gameId, Number(tableNo));
  if (!state) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, gameState: toClientState(state, wallet) });
}
