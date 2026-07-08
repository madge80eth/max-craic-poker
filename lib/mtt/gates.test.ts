import { describe, expect, it } from 'vitest';
import { checkAllGates, checkGate, checkpointDaysFor, GateDeps } from './gates';
import { Address, Gate } from './types';

const TOKEN = '0x1111111111111111111111111111111111111111' as Address;
const NFT = '0x2222222222222222222222222222222222222222' as Address;
const WALLET = '0x3333333333333333333333333333333333333333' as Address;
const OTHER = '0x4444444444444444444444444444444444444444' as Address;

/** Deterministic fake deps: 1 block per second, balances keyed by block number. */
function makeFakeDeps(opts: {
  nowMs?: number;
  currentBlock?: number;
  erc20Balances?: Map<number, bigint>; // blockNumber -> balance (defaults to currentBlock's value below cutoff)
  erc20DefaultBalance?: bigint;
  erc20DropsBelowBlock?: number; // balance is 0 for any block < this, else default
  erc721Balance?: bigint;
  firstTxTimestamp?: number | null;
}): GateDeps {
  const nowMs = opts.nowMs ?? Date.parse('2026-07-08T00:00:00Z');
  const currentBlock = opts.currentBlock ?? Math.floor(nowMs / 1000);

  return {
    now: () => nowMs,
    async getBlockNumber() {
      return currentBlock;
    },
    async getBlockTimestamp(blockNumber: number) {
      return blockNumber; // 1 block per second, timestamp === block number
    },
    async findBlockAtOrBefore(timestamp: number) {
      return Math.min(timestamp, currentBlock);
    },
    async getErc20Balance(_token, _wallet, blockNumber) {
      const bn = blockNumber ?? currentBlock;
      if (opts.erc20Balances?.has(bn)) return opts.erc20Balances.get(bn)!;
      if (opts.erc20DropsBelowBlock !== undefined && bn < opts.erc20DropsBelowBlock) {
        return BigInt(0);
      }
      return opts.erc20DefaultBalance ?? BigInt(0);
    },
    async getErc721Balance() {
      return opts.erc721Balance ?? BigInt(0);
    },
    async getFirstTxTimestamp() {
      return opts.firstTxTimestamp ?? null;
    },
  };
}

describe('checkpointDaysFor', () => {
  it('produces at least 2 checkpoints for short windows', () => {
    expect(checkpointDaysFor(7)).toEqual([0, 7]);
  });
  it('produces weekly-ish cadence for longer windows', () => {
    expect(checkpointDaysFor(30)).toEqual([0, 8, 15, 23, 30]);
  });
  it('never produces fewer than 2 checkpoints even for minDays=0', () => {
    expect(checkpointDaysFor(0)).toEqual([0, 0]);
  });
});

describe('erc20MinHold', () => {
  it('passes when balance meets the minimum', async () => {
    const deps = makeFakeDeps({ erc20DefaultBalance: BigInt(100) });
    const gate: Gate = { type: 'erc20MinHold', token: TOKEN, minAmount: '100' };
    const result = await checkGate(gate, WALLET, deps);
    expect(result.passed).toBe(true);
  });

  it('fails when balance is below the minimum', async () => {
    const deps = makeFakeDeps({ erc20DefaultBalance: BigInt(50) });
    const gate: Gate = { type: 'erc20MinHold', token: TOKEN, minAmount: '100' };
    const result = await checkGate(gate, WALLET, deps);
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/needs 100/);
  });
});

describe('erc20HeldFor (anti-bot checkpoint gate)', () => {
  it('passes when balance has been held for the whole window', async () => {
    const deps = makeFakeDeps({ erc20DefaultBalance: BigInt(500) });
    const gate: Gate = { type: 'erc20HeldFor', token: TOKEN, minAmount: '500', minDays: 30 };
    const result = await checkGate(gate, WALLET, deps);
    expect(result.passed).toBe(true);
    expect(result.checkpoints).toHaveLength(5);
    expect(result.checkpoints!.every((c) => c.passed)).toBe(true);
  });

  it('fails a wallet that only recently acquired the balance (flash-borrow style)', async () => {
    const nowMs = Date.parse('2026-07-08T00:00:00Z');
    const currentBlock = Math.floor(nowMs / 1000);
    // Balance only exists from "yesterday" onward -> older checkpoints read 0.
    const dropsBelowBlock = currentBlock - 1 * 86400;
    const deps = makeFakeDeps({ nowMs, currentBlock, erc20DropsBelowBlock: dropsBelowBlock, erc20DefaultBalance: BigInt(500) });
    const gate: Gate = { type: 'erc20HeldFor', token: TOKEN, minAmount: '500', minDays: 30 };
    const result = await checkGate(gate, WALLET, deps);
    expect(result.passed).toBe(false);
    const failedCheckpoints = result.checkpoints!.filter((c) => !c.passed);
    expect(failedCheckpoints.length).toBeGreaterThan(0);
  });

  it('does not query historical blocks for the "now" checkpoint (uses getBlockNumber directly)', async () => {
    let historicalCalls = 0;
    const deps = makeFakeDeps({ erc20DefaultBalance: BigInt(500) });
    const wrapped: GateDeps = {
      ...deps,
      async findBlockAtOrBefore(ts) {
        historicalCalls++;
        return deps.findBlockAtOrBefore(ts);
      },
    };
    const gate: Gate = { type: 'erc20HeldFor', token: TOKEN, minAmount: '500', minDays: 7 };
    await checkGate(gate, WALLET, wrapped);
    // 2 checkpoints total (0 and 7 days); day 0 should skip findBlockAtOrBefore.
    expect(historicalCalls).toBe(1);
  });
});

describe('nftHold', () => {
  it('passes when holding at least minCount', async () => {
    const deps = makeFakeDeps({ erc721Balance: BigInt(2) });
    const gate: Gate = { type: 'nftHold', collection: NFT, minCount: 1 };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(true);
  });

  it('fails when holding fewer than minCount', async () => {
    const deps = makeFakeDeps({ erc721Balance: BigInt(0) });
    const gate: Gate = { type: 'nftHold', collection: NFT, minCount: 1 };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(false);
  });
});

describe('walletAge', () => {
  it('passes when the wallet is old enough', async () => {
    const nowMs = Date.parse('2026-07-08T00:00:00Z');
    const firstTx = Math.floor(nowMs / 1000) - 40 * 86400;
    const deps = makeFakeDeps({ nowMs, firstTxTimestamp: firstTx });
    const gate: Gate = { type: 'walletAge', minDays: 30 };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(true);
  });

  it('fails when the wallet is too young', async () => {
    const nowMs = Date.parse('2026-07-08T00:00:00Z');
    const firstTx = Math.floor(nowMs / 1000) - 5 * 86400;
    const deps = makeFakeDeps({ nowMs, firstTxTimestamp: firstTx });
    const gate: Gate = { type: 'walletAge', minDays: 30 };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(false);
  });

  it('fails when the wallet has no transaction history', async () => {
    const deps = makeFakeDeps({ firstTxTimestamp: null });
    const gate: Gate = { type: 'walletAge', minDays: 30 };
    const result = await checkGate(gate, WALLET, deps);
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/No transaction history/);
  });
});

describe('allowlist', () => {
  const deps = makeFakeDeps({});

  it('passes for an address on the list', async () => {
    const gate: Gate = { type: 'allowlist', addresses: [WALLET] };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(true);
  });

  it('is case-insensitive', async () => {
    const gate: Gate = { type: 'allowlist', addresses: [WALLET.toUpperCase() as Address] };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(true);
  });

  it('fails for an address not on the list', async () => {
    const gate: Gate = { type: 'allowlist', addresses: [OTHER] };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(false);
  });

  it('fails safe on an empty allowlist', async () => {
    const gate: Gate = { type: 'allowlist', addresses: [] };
    expect((await checkGate(gate, WALLET, deps)).passed).toBe(false);
  });
});

describe('checkAllGates (AND logic)', () => {
  it('passes only when every gate passes', async () => {
    const deps = makeFakeDeps({ erc20DefaultBalance: BigInt(100), erc721Balance: BigInt(1) });
    const gates: Gate[] = [
      { type: 'erc20MinHold', token: TOKEN, minAmount: '100' },
      { type: 'nftHold', collection: NFT, minCount: 1 },
      { type: 'allowlist', addresses: [WALLET] },
    ];
    const result = await checkAllGates(gates, WALLET, deps);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(3);
  });

  it('fails overall if any single gate fails', async () => {
    const deps = makeFakeDeps({ erc20DefaultBalance: BigInt(100), erc721Balance: BigInt(0) });
    const gates: Gate[] = [
      { type: 'erc20MinHold', token: TOKEN, minAmount: '100' },
      { type: 'nftHold', collection: NFT, minCount: 1 },
    ];
    const result = await checkAllGates(gates, WALLET, deps);
    expect(result.passed).toBe(false);
    expect(result.results.filter((r) => !r.passed)).toHaveLength(1);
  });

  it('passes trivially with zero gates configured', async () => {
    const deps = makeFakeDeps({});
    const result = await checkAllGates([], WALLET, deps);
    expect(result.passed).toBe(true);
  });
});
