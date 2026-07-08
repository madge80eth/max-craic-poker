import { describe, expect, it } from 'vitest';
import { mulberry32, hashSeed } from './rng';
import { BustEvent, computePayouts, FinishRecord, initRanking, RankingState, recordBusts, recordWinner } from './ranking';

describe('recordBusts — sequential single busts', () => {
  it('assigns finish positions in reverse order of busting', () => {
    let ranking = initRanking(6);
    ranking = recordBusts(ranking, [{ wallet: 'p1', stackThatHand: 100, registeredAt: 0 }]);
    ranking = recordBusts(ranking, [{ wallet: 'p2', stackThatHand: 100, registeredAt: 0 }]);
    ranking = recordBusts(ranking, [{ wallet: 'p3', stackThatHand: 100, registeredAt: 0 }]);
    ranking = recordBusts(ranking, [{ wallet: 'p4', stackThatHand: 100, registeredAt: 0 }]);
    ranking = recordBusts(ranking, [{ wallet: 'p5', stackThatHand: 100, registeredAt: 0 }]);
    ranking = recordWinner(ranking, 'p6');

    const posOf = (w: string) => ranking.finishOrder.find((r) => r.wallet === w)?.finishPos;
    expect(posOf('p1')).toBe(6); // first out = worst
    expect(posOf('p2')).toBe(5);
    expect(posOf('p3')).toBe(4);
    expect(posOf('p4')).toBe(3);
    expect(posOf('p5')).toBe(2);
    expect(posOf('p6')).toBe(1); // winner
  });
});

describe('recordBusts — simultaneous busts (§7 tie-break by stack)', () => {
  it('gives the larger stack the better (lower) finish position within the same-hand batch', () => {
    let ranking = initRanking(6);
    ranking = recordBusts(ranking, [
      { wallet: 'small-stack', stackThatHand: 40, registeredAt: 0 },
      { wallet: 'big-stack', stackThatHand: 200, registeredAt: 1 },
    ]);
    const posOf = (w: string) => ranking.finishOrder.find((r) => r.wallet === w)!.finishPos;
    expect(posOf('big-stack')).toBe(5); // better of {5,6}
    expect(posOf('small-stack')).toBe(6);
    expect(ranking.nextFinishPos).toBe(4);
  });

  it('treats an exact stack tie as a genuine split spanning both positions', () => {
    let ranking = initRanking(6);
    ranking = recordBusts(ranking, [
      { wallet: 'tied-later-reg', stackThatHand: 100, registeredAt: 10 },
      { wallet: 'tied-earlier-reg', stackThatHand: 100, registeredAt: 5 },
    ]);
    const a = ranking.finishOrder.find((r) => r.wallet === 'tied-later-reg')!;
    const b = ranking.finishOrder.find((r) => r.wallet === 'tied-earlier-reg')!;
    expect(a.finishPos).toBe(5);
    expect(b.finishPos).toBe(5);
    expect(a.tiedRange).toEqual([5, 6]);
    expect(b.tiedRange).toEqual([5, 6]);
  });
});

describe('computePayouts', () => {
  const TOP3 = [50, 30, 20];

  it('pays exactly the template percentages with no dust lost', () => {
    const finishOrder: FinishRecord[] = [
      { wallet: 'winner', finishPos: 1 },
      { wallet: 'second', finishPos: 2 },
      { wallet: 'third', finishPos: 3 },
      { wallet: 'fourth', finishPos: 4 },
    ];
    const payouts = computePayouts(finishOrder, TOP3, 1000);
    expect(payouts.winner).toBe(500);
    expect(payouts.second).toBe(300);
    expect(payouts.third).toBe(200);
    expect(payouts.fourth).toBe(0); // out of the money, but every finisher gets a defined (zero) payout
    expect(Object.values(payouts).reduce((s, v) => s + v, 0)).toBe(1000);
  });

  it('sweeps rounding dust to 1st place', () => {
    const finishOrder: FinishRecord[] = [
      { wallet: 'winner', finishPos: 1 },
      { wallet: 'second', finishPos: 2 },
      { wallet: 'third', finishPos: 3 },
    ];
    const payouts = computePayouts(finishOrder, TOP3, 1001); // 1001 doesn't divide evenly by these percents
    expect(Object.values(payouts).reduce((s, v) => s + v, 0)).toBe(1001);
  });

  it('splits a tied payout range evenly, remainder to the earlier-registered wallet', () => {
    const finishOrder: FinishRecord[] = [
      { wallet: 'winner', finishPos: 1 },
      { wallet: 'earlier-reg', finishPos: 2, tiedRange: [2, 3] },
      { wallet: 'later-reg', finishPos: 2, tiedRange: [2, 3] },
    ];
    // TOP3 positions 2+3 = 30+20 = 50% of pool
    const payouts = computePayouts(finishOrder, TOP3, 1001);
    const combined = payouts['earlier-reg'] + payouts['later-reg'];
    expect(combined).toBe(Math.floor((1001 * 50) / 100));
    expect(payouts['earlier-reg']).toBeGreaterThanOrEqual(payouts['later-reg']); // remainder favors earlier-reg (index 0)
  });
});

function walletsOf(n: number) {
  return Array.from({ length: n }, (_, i) => `0x${i.toString(16).padStart(40, '0')}`);
}

describe('ranking fuzz — random bust sequences with simultaneous ties', () => {
  it('always produces a complete, non-overlapping partition of positions 1..N and exact-sum payouts, across 5,000 randomized tournaments', () => {
    const TEMPLATES: Record<string, number[]> = {
      top2: [65, 35],
      top3: [50, 30, 20],
      top5: [40, 27, 18, 10, 5],
      top7: [36, 24, 16, 10, 7, 4, 3],
    };
    const templateNames = Object.keys(TEMPLATES);

    for (let iter = 0; iter < 5000; iter++) {
      const rand = mulberry32(hashSeed(`ranking-fuzz-${iter}`));
      const n = 6 + Math.floor(rand() * 55); // 6..60
      const wallets = walletsOf(n);

      let ranking: RankingState = initRanking(n);
      const remaining = [...wallets];

      while (remaining.length > 1) {
        // pick a random batch size (1..min(4, remaining-1)) to bust this "hand"
        const maxBatch = Math.min(4, remaining.length - 1);
        const batchSize = 1 + Math.floor(rand() * maxBatch);
        const busters: BustEvent[] = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = Math.floor(rand() * remaining.length);
          const wallet = remaining.splice(idx, 1)[0];
          // occasionally force an exact tie by reusing the previous stack value
          const stack =
            busters.length > 0 && rand() < 0.2 ? busters[busters.length - 1].stackThatHand : Math.floor(rand() * 10000);
          busters.push({ wallet, stackThatHand: stack, registeredAt: iter * 1000 + i });
        }
        ranking = recordBusts(ranking, busters);
      }
      ranking = recordWinner(ranking, remaining[0]);

      // Every wallet appears exactly once.
      expect(ranking.finishOrder).toHaveLength(n);
      expect(new Set(ranking.finishOrder.map((r) => r.wallet)).size).toBe(n);

      // Reconstruct the position-slot groups (tied groups collapse to one range) and verify
      // they exactly partition [1, N] with no gaps or overlaps.
      const seenGroupKeys = new Set<string>();
      const ranges: [number, number][] = [];
      for (const record of ranking.finishOrder) {
        const range: [number, number] = record.tiedRange ?? [record.finishPos, record.finishPos];
        const key = `${range[0]}-${range[1]}`;
        if (seenGroupKeys.has(key)) continue;
        seenGroupKeys.add(key);
        ranges.push(range);
      }
      ranges.sort((a, b) => a[0] - b[0]);
      let expectedNext = 1;
      for (const [start, end] of ranges) {
        expect(start).toBe(expectedNext);
        expect(end).toBeGreaterThanOrEqual(start);
        expectedNext = end + 1;
      }
      expect(expectedNext - 1).toBe(n);

      // Payouts always sum exactly to the pool, for a random template + pool amount.
      const template = TEMPLATES[templateNames[Math.floor(rand() * templateNames.length)]];
      const pool = 1 + Math.floor(rand() * 1_000_000);
      const payouts = computePayouts(ranking.finishOrder, template, pool);
      expect(Object.values(payouts).reduce((s, v) => s + v, 0)).toBe(pool);
    }
  }, 30_000);
});
