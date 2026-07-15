// Mock of the sponsorship escrow described in CONTRACT-DELTA.md — PG2
// (GAME-CREATION-SPEC.md §6/§8) builds the lobby/sponsorship UI against this
// interface so the real contract delta (PG3, gated behind Step 10 per
// decision D9) can drop in later with the same shape. Nothing here touches
// real money; `total`/`amount` are plain numbers in the pool's display unit.
//
// Mirrors CONTRACT-DELTA.md §2 function-by-function: sponsor (freeze-at-start
// enforced via TournamentState.lifecycle instead of a Solidity `startTime`),
// refundSponsor, cancelGame, withdrawSponsorship (donor self-service, only
// once cancelled), poolOf/donatedBy views. Donor enumeration is `pool.donated`
// directly here (a real deployment would index SponsorDonated events instead).
//
// Operator-only auth (refundSponsor/cancelGame) is NOT enforced — this repo
// has no host/creator-wallet field on GameRecord yet to check against, and
// this is a mock with no funds at risk. Flagged for the real PG3 pass.

import { GameEvent } from './events';
import { TournamentState } from './tournament';

export interface SponsorPool {
  gameId: string;
  asset: string; // matches GameConfig.pool.asset ('USDC' | 'ETH' | erc20 address)
  total: number;
  cancelled: boolean;
  settled: boolean;
  donated: Record<string, number>; // donor wallet (lowercased) -> amount
}

export interface SponsorPoolStore {
  getPool(gameId: string): Promise<SponsorPool | null>;
  setPool(gameId: string, pool: SponsorPool): Promise<void>;
}

export class MemorySponsorPoolStore implements SponsorPoolStore {
  private pools = new Map<string, SponsorPool>();

  async getPool(gameId: string) {
    return this.pools.get(gameId) ?? null;
  }

  async setPool(gameId: string, pool: SponsorPool) {
    this.pools.set(gameId, pool);
  }
}

export interface MockEscrowDeps {
  store: SponsorPoolStore;
  getTournament: (gameId: string) => Promise<TournamentState | null>;
  appendEvent: (gameId: string, event: GameEvent) => Promise<void>;
  now: () => number;
}

export type EscrowResult = { ok: true; pool: SponsorPool } | { ok: false; error: string };

function ensurePool(existing: SponsorPool | null, gameId: string, asset: string): SponsorPool {
  return existing ?? { gameId, asset, total: 0, cancelled: false, settled: false, donated: {} };
}

/** CONTRACT-DELTA.md §2 `sponsor()`. Freeze-at-start: reverts once the
 *  tournament has left 'created'/'registering' (mirrors `block.timestamp >=
 *  startTime`). */
export async function sponsor(
  gameId: string,
  donor: string,
  amount: number,
  asset: string,
  deps: MockEscrowDeps
): Promise<EscrowResult> {
  const tournament = await deps.getTournament(gameId);
  if (!tournament) return { ok: false, error: 'Game not found' };
  if (tournament.lifecycle !== 'created' && tournament.lifecycle !== 'registering') {
    return { ok: false, error: 'Sponsorship is frozen — the game has already started' };
  }
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Amount must be positive' };

  let pool = ensurePool(await deps.store.getPool(gameId), gameId, asset);
  if (pool.cancelled) return { ok: false, error: 'This game was cancelled' };
  if (pool.settled) return { ok: false, error: 'This game has already settled' };
  if (pool.asset !== asset) return { ok: false, error: `This game's sponsor pool is denominated in ${pool.asset}` };

  const key = donor.toLowerCase();
  pool = { ...pool, total: pool.total + amount, donated: { ...pool.donated, [key]: (pool.donated[key] ?? 0) + amount } };
  await deps.store.setPool(gameId, pool);
  await deps.appendEvent(gameId, {
    type: 'sponsor_donated',
    wallet: key as `0x${string}`,
    at: deps.now(),
    detail: { amount, asset },
  });
  return { ok: true, pool };
}

/** CONTRACT-DELTA.md §2 `refundSponsor()` — R1 wall enforcement (bouncing a
 *  donor who also tries to register, or vice versa). */
export async function refundSponsor(gameId: string, donor: string, deps: MockEscrowDeps): Promise<EscrowResult> {
  const key = donor.toLowerCase();
  const existing = await deps.store.getPool(gameId);
  if (!existing) return { ok: false, error: 'No sponsor pool for this game' };
  if (existing.settled) return { ok: false, error: 'Cannot refund after settlement' };
  const amount = existing.donated[key] ?? 0;
  if (amount <= 0) return { ok: false, error: 'This wallet has no donation to refund' };

  const donated = { ...existing.donated, [key]: 0 };
  const pool = { ...existing, total: existing.total - amount, donated };
  await deps.store.setPool(gameId, pool);
  await deps.appendEvent(gameId, { type: 'sponsor_refunded', wallet: key as `0x${string}`, at: deps.now(), detail: { amount } });
  return { ok: true, pool };
}

/** CONTRACT-DELTA.md §2 `cancelGame()`. */
export async function cancelGame(gameId: string, deps: MockEscrowDeps): Promise<EscrowResult> {
  const existing = ensurePool(await deps.store.getPool(gameId), gameId, 'USDC');
  if (existing.settled) return { ok: false, error: 'Cannot cancel after settlement' };
  const pool = { ...existing, cancelled: true };
  await deps.store.setPool(gameId, pool);
  await deps.appendEvent(gameId, { type: 'cancelled', at: deps.now() });
  return { ok: true, pool };
}

/** CONTRACT-DELTA.md §2 `withdrawSponsorship()` — donor self-service, only
 *  once the game is cancelled. */
export async function withdrawSponsorship(gameId: string, donor: string, deps: MockEscrowDeps): Promise<EscrowResult> {
  const key = donor.toLowerCase();
  const existing = await deps.store.getPool(gameId);
  if (!existing) return { ok: false, error: 'No sponsor pool for this game' };
  if (!existing.cancelled) return { ok: false, error: 'Withdrawals are only available after cancellation' };
  const amount = existing.donated[key] ?? 0;
  if (amount <= 0) return { ok: false, error: 'This wallet has no donation to withdraw' };

  const donated = { ...existing.donated, [key]: 0 };
  const pool = { ...existing, total: existing.total - amount, donated };
  await deps.store.setPool(gameId, pool);
  await deps.appendEvent(gameId, { type: 'sponsor_refunded', wallet: key as `0x${string}`, at: deps.now(), detail: { amount, selfService: true } });
  return { ok: true, pool };
}

/** CONTRACT-DELTA.md §2 view — `poolOf`. */
export async function poolOf(gameId: string, store: SponsorPoolStore): Promise<SponsorPool | null> {
  return store.getPool(gameId);
}

/** CONTRACT-DELTA.md §2 view — `donatedBy`. */
export async function donatedBy(gameId: string, donor: string, store: SponsorPoolStore): Promise<number> {
  const pool = await store.getPool(gameId);
  return pool?.donated[donor.toLowerCase()] ?? 0;
}
