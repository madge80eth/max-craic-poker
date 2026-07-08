// Append-only event log entries — GAME-CREATION-SPEC.md §7, MTT-SPEC.md §9.
// This log is the audit story: every structural / gating event a game produces.

import { Address } from './types';

export type GameEventType =
  | 'gate_pass'
  | 'gate_fail'
  | 'unregistered_at_start'
  | 'sponsor_donated'
  | 'sponsor_refunded'
  | 'pool_frozen'
  | 'cancelled'
  | 'platform_fee';

export interface GameEvent {
  type: GameEventType;
  wallet?: Address;
  at: number;
  blockNumber?: number;
  detail?: Record<string, unknown>;
}
