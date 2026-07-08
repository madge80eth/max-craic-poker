// Deterministic seeded RNG — MTT-SPEC §4: "the seed and algorithm are written
// to the event log before the draw executes, so anyone can reproduce it."
// mulberry32: small, fast, good-enough distribution for draws/balancing (not
// cryptographic — determinism and reproducibility are the requirement here).

export function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') return seed | 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return h;
}

export function mulberry32(seed: number) {
  let s = seed | 0;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle, driven by a seeded RNG for reproducibility. */
export function seededShuffle<T>(items: T[], seed: string | number): T[] {
  const rand = mulberry32(hashSeed(seed));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
