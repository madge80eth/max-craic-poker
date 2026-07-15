import { NextResponse } from 'next/server';
import { poolOf, sponsor } from '@/lib/mtt/mockEscrow';
import { redisStore } from '@/lib/mtt/redisStore';
import { redisSponsorPoolStore } from '@/lib/mtt/sponsorPoolStore';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';

// PG2 (GAME-CREATION-SPEC §6/§8) sponsorship endpoint — mocked contract
// interface, mirrors CONTRACT-DELTA.md's sponsor()/poolOf() shape.
export async function GET(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const pool = await poolOf(gameId, redisSponsorPoolStore);
  const donors = pool
    ? Object.entries(pool.donated)
        .filter(([, amount]) => amount > 0)
        .map(([wallet, amount]) => ({ wallet, amount }))
        .sort((a, b) => b.amount - a.amount)
    : [];
  return NextResponse.json({ success: true, pool, donors });
}

export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const body = await request.json();
  const { wallet, amount } = body;

  if (!wallet || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Missing wallet or amount' }, { status: 400 });
  }

  const game = await redisStore.getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  // R1 wall (GAME-CREATION-SPEC): a wallet already registered as an entrant may not also sponsor.
  const tournament = await redisTournamentStore.get(gameId);
  if (tournament?.entrants[wallet.toLowerCase()]) {
    return NextResponse.json({ error: 'Registered entrants cannot sponsor this game' }, { status: 403 });
  }

  const result = await sponsor(gameId, wallet, amount, game.config.pool.asset, {
    store: redisSponsorPoolStore,
    getTournament: (id) => redisTournamentStore.get(id),
    appendEvent: (id, event) => redisStore.appendEvent(id, event),
    now: () => Date.now(),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, pool: result.pool });
}
