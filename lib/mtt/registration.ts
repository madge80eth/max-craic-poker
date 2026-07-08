// Registration server — GAME-CREATION-SPEC.md §4.
// Gates are checked at registration AND re-checked at T-0 (start). A wallet
// that no longer passes at start is unregistered (blocks flash-borrowing
// tokens to enter then dumping). Both checks are written to the event log.

import { Address, Gate, RegistrationRecord } from './types';
import { GateDeps, checkAllGates } from './gates';
import { Store } from './store';

export interface RegisterResult {
  passed: boolean;
  record: RegistrationRecord;
}

export async function registerEntrant(
  gameId: string,
  wallet: Address,
  gates: Gate[],
  deps: GateDeps,
  store: Store
): Promise<RegisterResult> {
  const existing = await store.getRegistration(gameId, wallet);
  if (existing?.status === 'registered') {
    return { passed: true, record: existing };
  }

  const check = await checkAllGates(gates, wallet, deps);
  const record: RegistrationRecord = {
    gameId,
    wallet,
    registeredAt: deps.now(),
    registrationCheck: check,
    t0Check: null,
    status: check.passed ? 'registered' : 'rejected',
  };

  await store.setRegistration(gameId, wallet, record);
  await store.appendEvent(gameId, {
    type: check.passed ? 'gate_pass' : 'gate_fail',
    wallet,
    at: record.registeredAt,
    blockNumber: check.blockNumber,
    detail: check.passed ? undefined : { reasons: check.results.filter((r) => !r.passed).map((r) => r.reason) },
  });

  if (check.passed) {
    await store.addEntrant(gameId, wallet);
  }

  return { passed: check.passed, record };
}

export interface RevalidationSummary {
  totalChecked: number;
  unregistered: Address[];
}

/** T-0 re-check — call at game start before seating. */
export async function revalidateAtStart(
  gameId: string,
  gates: Gate[],
  deps: GateDeps,
  store: Store
): Promise<RevalidationSummary> {
  const entrants = await store.listEntrants(gameId);
  const unregistered: Address[] = [];

  for (const wallet of entrants) {
    const check = await checkAllGates(gates, wallet, deps);
    const existing = await store.getRegistration(gameId, wallet);

    if (!check.passed) {
      const record: RegistrationRecord = {
        gameId,
        wallet,
        registeredAt: existing?.registeredAt ?? deps.now(),
        registrationCheck: existing?.registrationCheck ?? check,
        t0Check: check,
        status: 'unregistered_at_start',
      };
      await store.setRegistration(gameId, wallet, record);
      await store.removeEntrant(gameId, wallet);
      await store.appendEvent(gameId, {
        type: 'unregistered_at_start',
        wallet,
        at: deps.now(),
        blockNumber: check.blockNumber,
        detail: { reasons: check.results.filter((r) => !r.passed).map((r) => r.reason) },
      });
      unregistered.push(wallet);
    } else if (existing) {
      await store.setRegistration(gameId, wallet, { ...existing, t0Check: check });
    }
  }

  return { totalChecked: entrants.length, unregistered };
}
