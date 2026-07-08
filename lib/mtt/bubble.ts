// Hand-for-hand bubble — MTT-SPEC.md Phase 4 (§6). Pure barrier logic: once
// exactly one elimination stands between the field and the money, every live
// table must finish its current hand and then WAIT until every other table
// has too, so all tables start their next hand simultaneously. Repeats until
// the bubble bursts (someone busts, dropping the field into the paid places).

export type TablePhase = 'live' | 'waiting' | 'empty';

/** §6: "When exactly one elimination remains before the money." */
export function isBubble(activeCount: number, paidPlaces: number): boolean {
  return activeCount === paidPlaces + 1;
}

/** True once every live table has finished its hand and is parked at the barrier. */
export function allTablesAtBarrier(tablePhases: Record<number, TablePhase>): boolean {
  return Object.values(tablePhases).every((p) => p !== 'live');
}

/**
 * Decides which tables may start their next hand right now.
 * - Normal play: any table sitting at 'waiting' may go immediately (P2 behaviour).
 * - Hand-for-hand: no table may start until ALL are at 'waiting' (the barrier),
 *   then they all go together.
 */
export function tablesReadyToStart(tablePhases: Record<number, TablePhase>, handForHand: boolean): number[] {
  const waiting = Object.entries(tablePhases)
    .filter(([, phase]) => phase === 'waiting')
    .map(([tableNo]) => Number(tableNo));

  if (!handForHand) return waiting;
  return allTablesAtBarrier(tablePhases) ? waiting : [];
}
