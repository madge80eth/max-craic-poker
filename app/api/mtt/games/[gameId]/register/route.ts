import { NextResponse } from 'next/server';
import { defaultGateDeps } from '@/lib/mtt/gateDeps';
import { donatedBy } from '@/lib/mtt/mockEscrow';
import { redisStore } from '@/lib/mtt/redisStore';
import { registerEntrant as registerGateCheck } from '@/lib/mtt/registration';
import { redisSponsorPoolStore } from '@/lib/mtt/sponsorPoolStore';
import { registerEntrant as registerTournamentSeat } from '@/lib/mtt/tournament';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';
import { Address } from '@/lib/mtt/types';

// Registration — GAME-CREATION-SPEC §4 (gate check) + MTT-SPEC §2 (tournament
// entrant list). revalidate/route.ts re-checks the same wallets at T-0.
export async function POST(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const body = await request.json();
  const wallet = body?.wallet as Address | undefined;

  if (!wallet) {
    return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });
  }

  const game = await redisStore.getGame(gameId);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // R1 wall (GAME-CREATION-SPEC): a wallet that has sponsored this game may not also register to play.
  const alreadyDonated = await donatedBy(gameId, wallet, redisSponsorPoolStore);
  if (alreadyDonated > 0) {
    return NextResponse.json({ error: 'Sponsors cannot register to play this game' }, { status: 403 });
  }

  const gateResult = await registerGateCheck(gameId, wallet, game.config.gates, defaultGateDeps, redisStore);

  if (!gateResult.passed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Gate check failed',
        reasons: gateResult.record.registrationCheck.results.filter((r) => !r.passed).map((r) => r.reason),
      },
      { status: 403 }
    );
  }

  const tournament = await redisTournamentStore.get(gameId);
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  if (!tournament.entrants[wallet.toLowerCase()]) {
    const seated = registerTournamentSeat(tournament, wallet);
    if (!seated.ok) {
      return NextResponse.json({ error: seated.error }, { status: 409 });
    }
    await redisTournamentStore.set(gameId, seated.state);
  }

  return NextResponse.json({ success: true, record: gateResult.record });
}
