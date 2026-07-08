// Elimination ranking + payout computation — MTT-SPEC.md Phase 4 (§7, §8).
// Pure, synchronous — no I/O. Feeds off whatever busts multiTable/balancing
// report; doesn't know anything about live poker mechanics itself.

export interface BustEvent {
  wallet: string;
  stackThatHand: number; // §7: tie-break for simultaneous busts — larger stack finishes higher
  registeredAt: number; // §7: split-pot exact-tie remainder goes to the earlier-registered player
}

export interface FinishRecord {
  wallet: string;
  finishPos: number; // for a true tie, all tied wallets share the BEST (lowest) position in their range
  tiedRange?: [number, number]; // set only for a genuine stack-equal tie spanning >1 position
}

export interface RankingState {
  totalEntrants: number;
  nextFinishPos: number; // counts down from totalEntrants to 1 as busts are recorded
  finishOrder: FinishRecord[];
}

export function initRanking(totalEntrants: number): RankingState {
  return { totalEntrants, nextFinishPos: totalEntrants, finishOrder: [] };
}

/**
 * Records one batch of simultaneous busts (all from the same hand — either
 * several players busting at one table's all-in, or one bust per table
 * during a hand-for-hand round). §7: "Finish position = reverse order of
 * busting" — the position numbers assigned here always start at whatever
 * count was reached before, counting down. Within a batch, larger stack
 * that hand finishes higher; an EXACT stack tie is a genuine split — those
 * wallets share the best position in the range (see computePayouts for the
 * split-pot payout math).
 */
export function recordBusts(ranking: RankingState, busts: BustEvent[]): RankingState {
  if (busts.length === 0) return ranking;

  const startPos = ranking.nextFinishPos; // worst position in this batch
  const bestPos = startPos - busts.length + 1; // best position in this batch

  const byStack = new Map<number, BustEvent[]>();
  for (const b of busts) {
    if (!byStack.has(b.stackThatHand)) byStack.set(b.stackThatHand, []);
    byStack.get(b.stackThatHand)!.push(b);
  }
  // largest stack first -> occupies the best (lowest) position(s) in the batch
  const groups = [...byStack.entries()].sort((a, b) => b[0] - a[0]);

  const records: FinishRecord[] = [];
  let cursor = bestPos;
  for (const [, group] of groups) {
    const rangeStart = cursor;
    const rangeEnd = cursor + group.length - 1;
    if (group.length === 1) {
      records.push({ wallet: group[0].wallet, finishPos: rangeStart });
    } else {
      const byRegistration = [...group].sort((a, b) => a.registeredAt - b.registeredAt);
      for (const b of byRegistration) {
        records.push({ wallet: b.wallet, finishPos: rangeStart, tiedRange: [rangeStart, rangeEnd] });
      }
    }
    cursor += group.length;
  }

  return {
    ...ranking,
    nextFinishPos: startPos - busts.length,
    finishOrder: [...ranking.finishOrder, ...records],
  };
}

/** Call once the field is down to one player — they never "bust", so they don't go through recordBusts. */
export function recordWinner(ranking: RankingState, wallet: string): RankingState {
  if (ranking.nextFinishPos !== 1) {
    throw new Error(`Cannot record a winner while ${ranking.nextFinishPos} position(s) remain unassigned`);
  }
  return { ...ranking, nextFinishPos: 0, finishOrder: [...ranking.finishOrder, { wallet, finishPos: 1 }] };
}

/**
 * MTT-SPEC §8 payout computation. `payoutPercents[0]` is 1st place, etc.
 * Positions beyond the paid places get 0. Split-pot ties combine their
 * range's percentages and divide evenly, remainder to the earlier-registered
 * wallet (already sorted first within the tied group by recordBusts).
 * Rounding dust from percentage math is swept to the 1st-place payout so the
 * total exactly equals `poolAmount` — CONTRACT-DELTA.md requires exact-balance
 * settlement, no dust allowed on-chain.
 */
export function computePayouts(finishOrder: FinishRecord[], payoutPercents: number[], poolAmount: number): Record<string, number> {
  const pctForPos = (pos: number) => (pos >= 1 && pos <= payoutPercents.length ? payoutPercents[pos - 1] : 0);
  const payouts: Record<string, number> = {};
  const seen = new Set<string>();

  for (const record of finishOrder) {
    if (seen.has(record.wallet)) continue;

    if (record.tiedRange) {
      const [start, end] = record.tiedRange;
      const tiedWallets = finishOrder.filter((r) => r.tiedRange && r.tiedRange[0] === start && r.tiedRange[1] === end);
      let combinedPct = 0;
      for (let pos = start; pos <= end; pos++) combinedPct += pctForPos(pos);
      const combinedAmount = Math.floor((poolAmount * combinedPct) / 100);
      const share = Math.floor(combinedAmount / tiedWallets.length);
      const remainder = combinedAmount - share * tiedWallets.length;
      tiedWallets.forEach((w, i) => {
        payouts[w.wallet] = share + (i === 0 ? remainder : 0); // earlier-registered (index 0) gets the remainder
        seen.add(w.wallet);
      });
    } else {
      payouts[record.wallet] = Math.floor((poolAmount * pctForPos(record.finishPos)) / 100);
      seen.add(record.wallet);
    }
  }

  const distributed = Object.values(payouts).reduce((sum, v) => sum + v, 0);
  const dust = poolAmount - distributed;
  if (dust !== 0) {
    const winner = finishOrder.find((r) => r.finishPos === 1);
    if (winner) payouts[winner.wallet] = (payouts[winner.wallet] ?? 0) + dust;
  }

  return payouts;
}
