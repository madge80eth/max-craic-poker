import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { redisStore } from '@/lib/mtt/redisStore';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';
import { createTournament, openRegistration, TournamentConfig } from '@/lib/mtt/tournament';
import { GameConfig } from '@/lib/mtt/types';

// Minimal creation endpoint for Phase G1 (GAME-CREATION-SPEC §3/§7) + Phase 1
// (MTT-SPEC §2/§3) — one gameId doubles as the tournamentId; creating a game
// immediately opens its tournament for registration.
// The sealed create wizard's onPublish(config) wires here in Phase G2.
export async function POST(request: Request) {
  const config = (await request.json()) as GameConfig;

  if (!config?.title || !config?.startsAt) {
    return NextResponse.json({ error: 'Missing title or startsAt' }, { status: 400 });
  }

  const gameId = randomUUID();
  const record = await redisStore.createGame(gameId, config);

  const tournamentConfig: TournamentConfig = {
    minPlayers: config.minPlayers,
    structure: {
      startingStack: config.structure.startingStack,
      levelMins: config.structure.levelMins,
      lateRegLevels: config.structure.lateRegLevels,
      breaksEnabled: true,
      bbAnteFromLevel: 4,
    },
    payoutTemplate: config.structure.payoutTemplate,
    scheduledStartTime: Date.parse(config.startsAt),
  };
  let tournament = createTournament(gameId, tournamentConfig);
  const opened = openRegistration(tournament);
  if (opened.ok) tournament = opened.state;
  await redisTournamentStore.set(gameId, tournament);

  return NextResponse.json({
    success: true,
    gameId,
    record,
    sponsorLink: `/craic-mtt/${gameId}/sponsor`,
    entryLink: `/craic-mtt/${gameId}`,
  });
}
