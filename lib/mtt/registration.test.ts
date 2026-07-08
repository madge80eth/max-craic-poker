import { beforeEach, describe, expect, it } from 'vitest';
import { GateDeps } from './gates';
import { registerEntrant, revalidateAtStart } from './registration';
import { MemoryStore } from './store';
import { Address, Gate } from './types';

const TOKEN = '0x1111111111111111111111111111111111111111' as Address;
const WALLET = '0x3333333333333333333333333333333333333333' as Address;
const WALLET_2 = '0x5555555555555555555555555555555555555555' as Address;

/** Mutable fake deps so tests can simulate balance changing between registration and T-0. */
function makeMutableDeps(initialBalance: bigint) {
  let balance = initialBalance;
  let block = 1000;
  const deps: GateDeps = {
    now: () => Date.now(),
    async getBlockNumber() {
      return block;
    },
    async getBlockTimestamp(bn) {
      return bn;
    },
    async findBlockAtOrBefore(ts) {
      return ts;
    },
    async getErc20Balance() {
      return balance;
    },
    async getErc721Balance() {
      return BigInt(0);
    },
    async getFirstTxTimestamp() {
      return null;
    },
  };
  return {
    deps,
    setBalance: (b: bigint) => {
      balance = b;
    },
    advanceBlock: () => {
      block += 1;
    },
  };
}

describe('registerEntrant', () => {
  let store: MemoryStore;
  const gates: Gate[] = [{ type: 'erc20MinHold', token: TOKEN, minAmount: '100' }];

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('registers a wallet that passes all gates', async () => {
    const { deps } = makeMutableDeps(BigInt(100));
    const result = await registerEntrant('game1', WALLET, gates, deps, store);

    expect(result.passed).toBe(true);
    expect(result.record.status).toBe('registered');
    expect(await store.listEntrants('game1')).toContain(WALLET.toLowerCase());

    const events = store.events.get('game1')!;
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('gate_pass');
  });

  it('rejects a wallet that fails a gate, without adding it as an entrant', async () => {
    const { deps } = makeMutableDeps(BigInt(10));
    const result = await registerEntrant('game1', WALLET, gates, deps, store);

    expect(result.passed).toBe(false);
    expect(result.record.status).toBe('rejected');
    expect(await store.listEntrants('game1')).not.toContain(WALLET.toLowerCase());

    const events = store.events.get('game1')!;
    expect(events[0].type).toBe('gate_fail');
    expect(events[0].detail?.reasons).toBeDefined();
  });

  it('is idempotent for an already-registered wallet (does not re-run gate checks)', async () => {
    const { deps } = makeMutableDeps(BigInt(100));
    await registerEntrant('game1', WALLET, gates, deps, store);

    let checksRan = 0;
    const countingDeps: GateDeps = {
      ...deps,
      getErc20Balance: async (...args) => {
        checksRan++;
        return deps.getErc20Balance(...args);
      },
    };
    const second = await registerEntrant('game1', WALLET, gates, countingDeps, store);

    expect(second.passed).toBe(true);
    expect(checksRan).toBe(0);
  });
});

describe('revalidateAtStart (flash-borrow protection)', () => {
  let store: MemoryStore;
  const gates: Gate[] = [{ type: 'erc20MinHold', token: TOKEN, minAmount: '100' }];

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('unregisters a wallet whose balance dropped below the gate before T-0', async () => {
    const { deps, setBalance } = makeMutableDeps(BigInt(100));
    await registerEntrant('game1', WALLET, gates, deps, store);
    expect(await store.listEntrants('game1')).toContain(WALLET.toLowerCase());

    // Wallet dumps the token (or it was a flash-borrowed balance) before start.
    setBalance(BigInt(0));
    const summary = await revalidateAtStart('game1', gates, deps, store);

    expect(summary.unregistered).toEqual([WALLET.toLowerCase()]);
    expect(await store.listEntrants('game1')).not.toContain(WALLET.toLowerCase());

    const record = await store.getRegistration('game1', WALLET);
    expect(record?.status).toBe('unregistered_at_start');
    expect(record?.t0Check?.passed).toBe(false);

    const events = store.events.get('game1')!;
    expect(events.some((e) => e.type === 'unregistered_at_start')).toBe(true);
  });

  it('keeps a wallet registered when it still passes at T-0', async () => {
    const { deps } = makeMutableDeps(BigInt(100));
    await registerEntrant('game1', WALLET, gates, deps, store);

    const summary = await revalidateAtStart('game1', gates, deps, store);

    expect(summary.unregistered).toEqual([]);
    expect(await store.listEntrants('game1')).toContain(WALLET.toLowerCase());
    const record = await store.getRegistration('game1', WALLET);
    expect(record?.status).toBe('registered');
    expect(record?.t0Check?.passed).toBe(true);
  });

  it('handles a mixed cohort — only the failing wallet is dropped', async () => {
    const { deps, setBalance } = makeMutableDeps(BigInt(100));
    await registerEntrant('game1', WALLET, gates, deps, store);

    // WALLET_2 registers with its own deps instance so we can vary its balance independently.
    const wallet2Deps = makeMutableDeps(BigInt(100));
    await registerEntrant('game1', WALLET_2, gates, wallet2Deps.deps, store);

    setBalance(BigInt(0)); // only WALLET dumps

    // revalidateAtStart needs one GateDeps for the whole game; simulate per-wallet balance
    // via a dispatcher that shares the entrants list but branches on wallet.
    const dispatchDeps: GateDeps = {
      ...deps,
      getErc20Balance: async (token, wallet, bn) => {
        if (wallet.toLowerCase() === WALLET_2.toLowerCase()) return wallet2Deps.deps.getErc20Balance(token, wallet, bn);
        return deps.getErc20Balance(token, wallet, bn);
      },
    };

    const summary = await revalidateAtStart('game1', gates, dispatchDeps, store);
    expect(summary.totalChecked).toBe(2);
    expect(summary.unregistered).toEqual([WALLET.toLowerCase()]);
    expect(await store.listEntrants('game1')).toContain(WALLET_2.toLowerCase());
  });
});
