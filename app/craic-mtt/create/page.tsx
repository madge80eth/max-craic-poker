'use client';

import { useRouter } from 'next/navigation';
import CreateGameWizard from '@/app/craic-mtt/components/CreateGameWizard';
import { Address, Gate, GameConfig } from '@/lib/mtt/types';

interface WizardGate {
  type: 'erc20Hold' | 'nftHold' | 'walletAge' | 'allowlist';
  token?: string;
  minAmount?: number;
  heldForDays?: number;
  collection?: string;
  minCount?: number;
  minDays?: number;
  addresses?: string[];
}

interface WizardConfig {
  title: string;
  startsAt: string;
  timezone: string;
  minPlayers: number;
  visibility: 'public' | 'unlisted';
  structure: GameConfig['structure'];
  pool: GameConfig['pool'];
  gates: WizardGate[];
}

// The sealed wizard emits a single erc20Hold gate type; lib/mtt/types.ts (built
// in PG1, before this adapter existed) splits it into erc20MinHold/erc20HeldFor.
// Reconcile here rather than changing either side.
function mapGate(g: WizardGate): Gate {
  if (g.type === 'erc20Hold') {
    const token = (g.token ?? '') as Address;
    const minAmount = String(g.minAmount ?? 0);
    return g.heldForDays && g.heldForDays > 0
      ? { type: 'erc20HeldFor', token, minAmount, minDays: g.heldForDays }
      : { type: 'erc20MinHold', token, minAmount };
  }
  if (g.type === 'nftHold') {
    return { type: 'nftHold', collection: (g.collection ?? '') as Address, minCount: g.minCount ?? 1 };
  }
  if (g.type === 'walletAge') {
    return { type: 'walletAge', minDays: g.minDays ?? 90 };
  }
  return { type: 'allowlist', addresses: (g.addresses ?? []) as Address[] };
}

export default function CreateMttPage() {
  const router = useRouter();

  async function handlePublish(cfg: WizardConfig) {
    const body: GameConfig = {
      title: cfg.title,
      startsAt: cfg.startsAt,
      timezone: cfg.timezone,
      minPlayers: cfg.minPlayers,
      visibility: cfg.visibility,
      structure: cfg.structure,
      pool: cfg.pool,
      gates: cfg.gates.map(mapGate),
    };

    try {
      const res = await fetch('/api/mtt/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        // The sealed wizard's own success screen shows first (demo-slug links,
        // per its header job list) — redirect to the real lobby once the game
        // actually exists rather than editing that screen's internals.
        router.push(`/craic-mtt/${data.gameId}`);
      } else {
        alert(data.error || 'Failed to create game');
      }
    } catch {
      alert('Failed to create game');
    }
  }

  return <CreateGameWizard onPublish={handlePublish} />;
}
