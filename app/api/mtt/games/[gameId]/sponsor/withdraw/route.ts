import { NextResponse } from 'next/server';
import { withdrawSponsorship } from '@/lib/mtt/mockEscrow';
import { redisStore } from '@/lib/mtt/redisStore';
import { redisSponsorPoolStore } from '@/lib/mtt/sponsorPoolStore';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';

// Donor self-service, only once the game is cancelled (CONTRACT-DELTA §2).
export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const { donor } = await request.json();
  if (!donor) return NextResponse.json({ error: 'Missing donor' }, { status: 400 });

  const result = await withdrawSponsorship(gameId, donor, {
    store: redisSponsorPoolStore,
    getTournament: (id) => redisTournamentStore.get(id),
    appendEvent: (id, event) => redisStore.appendEvent(id, event),
    now: () => Date.now(),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, pool: result.pool });
}
