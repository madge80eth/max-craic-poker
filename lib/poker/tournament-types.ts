// Multi-Table Tournament (MTT) type definitions

import { SybilResistanceConfig, BlindLevel } from './types';

export type TournamentStatus = 'registering' | 'running' | 'final_table' | 'finished';

export interface TournamentState {
  tournamentId: string;
  name: string;
  status: TournamentStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  creatorId: string;

  // Config
  maxPlayers: number;
  startingChips: number;
  blindIntervalMinutes: number;
  currentBlindLevel: number;
  blindLevels: BlindLevel[];

  // Live state
  registeredCount: number;
  remainingCount: number;
  tableIds: string[];
  finishOrder: string[]; // playerIds in elimination order (first eliminated = index 0)
  winnerId?: string;

  // Optional
  sybilResistance?: SybilResistanceConfig;
}

export interface TournamentPlayerEntry {
  playerId: string;
  name: string;
  status: 'registered' | 'playing' | 'eliminated' | 'winner';
  currentTableId?: string;
  chipCount: number;
  finishPosition?: number; // 1 = winner, 2 = runner-up, etc.
}

export interface PlayerMoveNotification {
  playerId: string;
  fromTableId: string;
  toTableId: string;
  chipCount: number;
  reason: 'rebalance' | 'final_table' | 'table_closed';
  timestamp: number;
}

// Lightweight info for tournament lobby listing
export interface TournamentInfo {
  tournamentId: string;
  name: string;
  status: TournamentStatus;
  registeredCount: number;
  remainingCount: number;
  maxPlayers: number;
  startingChips: number;
  blindIntervalMinutes: number;
  createdAt: number;
  creatorId: string;
}
