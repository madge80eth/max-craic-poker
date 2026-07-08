// Gate engine — GAME-CREATION-SPEC.md §4.
// Pure logic depends only on GateDeps, so it can be tested headlessly with
// fakes. Wire `defaultGateDeps` in production call sites.

import { Address, CheckpointResult, Gate, GateCheckResult, GateMatrixResult } from './types';

export interface GateDeps {
  now(): number; // ms epoch
  getBlockNumber(): Promise<number>;
  getBlockTimestamp(blockNumber: number): Promise<number>; // seconds epoch
  findBlockAtOrBefore(timestamp: number): Promise<number>; // seconds epoch -> block number
  getErc20Balance(token: Address, wallet: Address, blockNumber?: number): Promise<bigint>;
  getErc721Balance(collection: Address, wallet: Address, blockNumber?: number): Promise<bigint>;
  getFirstTxTimestamp(wallet: Address): Promise<number | null>; // seconds epoch
}

/**
 * Checkpoint schedule for erc20HeldFor: evenly spaced across the minDays
 * window, weekly by default, minimum 2 checkpoints (spec §4).
 */
export function checkpointDaysFor(minDays: number): number[] {
  const count = Math.max(2, Math.floor(minDays / 7) + 1);
  const days: number[] = [];
  for (let i = 0; i < count; i++) {
    days.push(Math.round((minDays * i) / (count - 1)));
  }
  return days;
}

async function checkErc20MinHold(
  gate: Extract<Gate, { type: 'erc20MinHold' }>,
  wallet: Address,
  deps: GateDeps,
  blockNumber: number
): Promise<GateCheckResult> {
  const balance = await deps.getErc20Balance(gate.token, wallet, blockNumber);
  const required = BigInt(gate.minAmount);
  const passed = balance >= required;
  return {
    gate,
    passed,
    blockNumber,
    reason: passed ? undefined : `Holds ${balance} of ${gate.token}, needs ${required}.`,
  };
}

async function checkErc20HeldFor(
  gate: Extract<Gate, { type: 'erc20HeldFor' }>,
  wallet: Address,
  deps: GateDeps,
  blockNumber: number
): Promise<GateCheckResult> {
  const required = BigInt(gate.minAmount);
  const nowSec = Math.floor(deps.now() / 1000);
  const days = checkpointDaysFor(gate.minDays);

  const checkpoints: CheckpointResult[] = await Promise.all(
    days.map(async (daysAgo) => {
      const targetTimestamp = nowSec - daysAgo * 86400;
      const cpBlock = daysAgo === 0 ? blockNumber : await deps.findBlockAtOrBefore(targetTimestamp);
      const balance = await deps.getErc20Balance(gate.token, wallet, cpBlock);
      const timestamp = daysAgo === 0 ? nowSec : await deps.getBlockTimestamp(cpBlock);
      return {
        daysAgo,
        blockNumber: cpBlock,
        timestamp,
        balance: balance.toString(),
        passed: balance >= required,
      };
    })
  );

  const passed = checkpoints.every((c) => c.passed);
  const failedAt = checkpoints.find((c) => !c.passed);
  return {
    gate,
    passed,
    blockNumber,
    checkpoints,
    reason: passed
      ? undefined
      : `Balance dropped below ${required} ${failedAt ? `${failedAt.daysAgo} day(s) ago` : ''}.`,
  };
}

async function checkNftHold(
  gate: Extract<Gate, { type: 'nftHold' }>,
  wallet: Address,
  deps: GateDeps,
  blockNumber: number
): Promise<GateCheckResult> {
  const balance = await deps.getErc721Balance(gate.collection, wallet, blockNumber);
  const passed = balance >= BigInt(gate.minCount);
  return {
    gate,
    passed,
    blockNumber,
    reason: passed ? undefined : `Holds ${balance} of ${gate.collection}, needs ${gate.minCount}.`,
  };
}

async function checkWalletAge(
  gate: Extract<Gate, { type: 'walletAge' }>,
  wallet: Address,
  deps: GateDeps,
  blockNumber: number
): Promise<GateCheckResult> {
  const firstTx = await deps.getFirstTxTimestamp(wallet);
  if (firstTx === null) {
    return { gate, passed: false, blockNumber, reason: 'No transaction history found for this wallet.' };
  }
  const ageDays = (deps.now() / 1000 - firstTx) / 86400;
  const passed = ageDays >= gate.minDays;
  return {
    gate,
    passed,
    blockNumber,
    reason: passed ? undefined : `Wallet is ${ageDays.toFixed(1)} day(s) old, needs ${gate.minDays}.`,
  };
}

function checkAllowlist(
  gate: Extract<Gate, { type: 'allowlist' }>,
  wallet: Address,
  blockNumber: number
): GateCheckResult {
  const normalized = wallet.toLowerCase();
  const passed = gate.addresses.some((a) => a.toLowerCase() === normalized);
  return { gate, passed, blockNumber, reason: passed ? undefined : 'Wallet is not on the allowlist.' };
}

export async function checkGate(gate: Gate, wallet: Address, deps: GateDeps): Promise<GateCheckResult> {
  const blockNumber = await deps.getBlockNumber();
  switch (gate.type) {
    case 'erc20MinHold':
      return checkErc20MinHold(gate, wallet, deps, blockNumber);
    case 'erc20HeldFor':
      return checkErc20HeldFor(gate, wallet, deps, blockNumber);
    case 'nftHold':
      return checkNftHold(gate, wallet, deps, blockNumber);
    case 'walletAge':
      return checkWalletAge(gate, wallet, deps, blockNumber);
    case 'allowlist':
      return checkAllowlist(gate, wallet, blockNumber);
  }
}

/** AND logic across all configured gates (GAME-CREATION-SPEC §4). */
export async function checkAllGates(gates: Gate[], wallet: Address, deps: GateDeps): Promise<GateMatrixResult> {
  const blockNumber = await deps.getBlockNumber();
  const results = await Promise.all(gates.map((g) => checkGate(g, wallet, deps)));
  return {
    passed: results.every((r) => r.passed),
    results,
    blockNumber,
    checkedAt: deps.now(),
  };
}
