// Translates real server shapes (lib/poker's ClientGameState + lib/mtt's
// TournamentState) into the sealed PokerTable component's GAME_STATE contract
// (documented in the header of .strategy/new build/sealed/craic-poker-table.jsx,
// copied to app/poker/components/sealed/PokerTable.jsx). Per D1 ("CC writes
// adapters that feed this contract; CC NEVER edits component internals"),
// all translation logic lives here — the sealed component itself is untouched.
//
// Known simplifications (flagged, not bugs — see HANDOFF.md write-up):
// - hero.handLabel (live hand strength badge) is always null — would need a
//   hand evaluator run client-side on partial board+hole cards; the engine
//   only evaluates at showdown. showLabel is populated for showdown winners
//   (from WinnerInfo.handName) but not for other showdown participants.
// - streetFlash and tournament.banner are always null — the real engine has
//   no equivalent transient "just happened" signal yet; wiring these needs a
//   change-detection pass against the event log, deferred as UI polish.
// - tournament.yourRank is only set once a wallet has busted (its recorded
//   finish position); a live in-progress rank among still-active players
//   isn't computed.

import { BlindLevel, BREAK_MINUTES, currentBlindLevel } from './blinds';
import { ClientGameState } from '@/lib/poker/types';
import { TournamentState } from './tournament';

export interface SealedPlayer {
  seat: number;
  name: string;
  stack: number;
  cards: null | [string, string];
  bet: number;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  isDealer: boolean;
  timeLeft: number | null;
  showLabel: string | null;
}

export interface SealedHeroActions {
  canFold: boolean;
  canCheck: boolean;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  actorBet: number;
  pot: number;
}

export interface SealedTournamentHud {
  level: number;
  sb: number;
  bb: number;
  ante: number;
  nextLevelInSec: number;
  playersLeft: number;
  entrants: number;
  avgStack: number;
  yourRank: number | null;
  prizePool: string;
  paidPlaces: number;
  banner: null | { text: string };
}

export interface SealedGameState {
  handId: string;
  stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  blinds: { sb: number; bb: number };
  pot: number;
  board: string[];
  streetFlash: string | null;
  toAct: number | null;
  actingAs: string | null;
  players: SealedPlayer[];
  hero: { seat: number; handLabel: string | null; actions: SealedHeroActions | null };
  winners: null | { seat: number; amount: number; handLabel: string }[];
  tournament?: SealedTournamentHud;
}

function cardCode(rank: string, suit: string): string {
  return `${rank}${suit}`;
}

/** Rotates an engine seatIndex (0-5, fixed at the table draw) so the viewer
 *  always lands on sealed seat 0 (hero, bottom) — standard poker-UI convention. */
function rotateSeat(seatIndex: number, heroSeatIndex: number): number {
  return (seatIndex - heroSeatIndex + 6) % 6;
}

export function toSealedGameState(
  client: ClientGameState,
  tournament: TournamentState | null,
  wallet: string | null,
  prizePoolLabel = '—'
): SealedGameState {
  const heroSeatIndex = client.yourSeatIndex ?? 0;
  const stageForSealed = client.phase === 'finished' ? 'showdown' : (client.phase as SealedGameState['stage']);

  const players: SealedPlayer[] = client.players.map((p) => ({
    seat: rotateSeat(p.seatIndex, heroSeatIndex),
    name: p.name,
    stack: p.chips,
    cards: p.holeCards
      ? [cardCode(p.holeCards[0].rank, p.holeCards[0].suit), cardCode(p.holeCards[1].rank, p.holeCards[1].suit)]
      : p.folded
        ? null
        : ['XX', 'XX'],
    bet: p.bet,
    folded: p.folded,
    allIn: p.allIn,
    sittingOut: p.sitOut,
    isDealer: p.isDealer,
    timeLeft: null,
    showLabel: client.winners?.find((w) => w.odentity === p.odentity)?.handName ?? null,
  }));

  const activePlayer = client.players[client.activePlayerIndex];
  const toAct = activePlayer ? rotateSeat(activePlayer.seatIndex, heroSeatIndex) : null;

  const viewerPlayer = wallet ? client.players.find((p) => p.odentity.toLowerCase() === wallet.toLowerCase()) : undefined;
  const isViewerTurn = !!viewerPlayer && client.yourSeatIndex !== null && client.activePlayerIndex === client.players.indexOf(viewerPlayer);

  let actions: SealedHeroActions | null = null;
  if (isViewerTurn && viewerPlayer) {
    const raiseAction = client.validActions.find((a) => a.action === 'raise');
    const allinAction = client.validActions.find((a) => a.action === 'allin');
    const callAmount = client.validActions.some((a) => a.action === 'call') ? client.currentBet - viewerPlayer.bet : 0;
    actions = {
      canFold: client.validActions.some((a) => a.action === 'fold'),
      canCheck: client.validActions.some((a) => a.action === 'check'),
      callAmount: Math.max(0, callAmount),
      minRaise: raiseAction?.minAmount ?? allinAction?.maxAmount ?? viewerPlayer.chips + viewerPlayer.bet,
      maxRaise: raiseAction?.maxAmount ?? allinAction?.maxAmount ?? viewerPlayer.chips + viewerPlayer.bet,
      actorBet: viewerPlayer.bet,
      pot: client.pot,
    };
  }

  const winners = client.winners
    ? client.winners.map((w) => {
        const player = client.players.find((p) => p.odentity === w.odentity);
        return { seat: player ? rotateSeat(player.seatIndex, heroSeatIndex) : 0, amount: w.amount, handLabel: w.handName };
      })
    : null;

  const result: SealedGameState = {
    handId: String(client.handNumber),
    stage: stageForSealed,
    blinds: { sb: client.config.blindLevels[client.blindLevel]?.smallBlind ?? 0, bb: client.config.blindLevels[client.blindLevel]?.bigBlind ?? 0 },
    pot: client.pot,
    board: client.communityCards.map((c) => cardCode(c.rank, c.suit)),
    streetFlash: null,
    toAct,
    actingAs: null,
    players,
    hero: { seat: rotateSeat(heroSeatIndex, heroSeatIndex), handLabel: null, actions },
    winners,
  };

  if (tournament) {
    const level: BlindLevel = currentBlindLevel(tournament);
    const segMs = (tournament.onBreak ? BREAK_MINUTES * 60_000 : tournament.config.structure.levelMins * 60_000);
    const nextLevelInSec = tournament.levelClockAnchor != null
      ? Math.max(0, Math.round((tournament.levelClockAnchor + segMs - Date.now()) / 1000))
      : 0;
    const activeEntrants = Object.values(tournament.entrants).filter((e) => e.status === 'active');
    const avgStack = activeEntrants.length > 0
      ? Math.round(activeEntrants.reduce((sum, e) => sum + e.stack, 0) / activeEntrants.length)
      : 0;
    const myFinish = wallet ? tournament.ranking.finishOrder.find((f) => f.wallet === wallet.toLowerCase()) : undefined;

    result.tournament = {
      level: level.level,
      sb: level.sb,
      bb: level.bb,
      ante: level.ante,
      nextLevelInSec,
      playersLeft: activeEntrants.length,
      entrants: tournament.ranking.totalEntrants,
      avgStack,
      yourRank: myFinish?.finishPos ?? null,
      prizePool: prizePoolLabel,
      paidPlaces: tournament.payoutTable.length,
      banner: null,
    };
  }

  return result;
}

/** Maps the sealed component's onAction(type, amount) to the real engine's
 *  {action, amount} POST body. 'next' is handled by the caller (it's a
 *  next-hand request, not a table action) and never reaches this function. */
export function toEngineAction(type: string, amount?: number): { action: string; amount?: number } {
  return { action: type, amount };
}
