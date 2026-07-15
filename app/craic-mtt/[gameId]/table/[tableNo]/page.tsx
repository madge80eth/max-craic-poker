'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { ClientGameState } from '@/lib/poker/types';
import { toSealedGameState } from '@/lib/mtt/clientAdapter';
import type { TournamentState } from '@/lib/mtt/tournament';

const PokerTable = dynamic(() => import('@/app/poker/components/sealed/PokerTable').then((m) => m.PokerTable), { ssr: false });

export default function MttTablePage() {
  const { address } = useAccount();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const tableNo = params.tableNo as string;

  const wallet = (searchParams.get('wallet') || address || '').toLowerCase();

  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [poolLabel, setPoolLabel] = useState('—');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTableRef = useRef(tableNo);

  const fetchState = useCallback(async () => {
    if (!wallet) return;
    try {
      const [tableRes, gameRes] = await Promise.all([
        fetch(`/api/mtt/games/${gameId}/tables/${currentTableRef.current}?wallet=${wallet}`),
        fetch(`/api/mtt/games/${gameId}`),
      ]);
      const tableData = await tableRes.json();
      const gameData = await gameRes.json();
      if (tableData.success) {
        setGameState(tableData.gameState);
        setError(null);
      } else {
        setError(tableData.error || 'Table not found');
      }
      if (gameData.success) setTournament(gameData.tournament);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [gameId, wallet]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 1000);
    return () => clearInterval(id);
  }, [fetchState]);

  useEffect(() => {
    fetch(`/api/mtt/games/${gameId}/sponsor`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.pool) setPoolLabel(`${d.pool.total.toLocaleString()} ${d.pool.asset}`);
      })
      .catch(() => {});
  }, [gameId]);

  async function handleAction(type: string, amount?: number) {
    if (!wallet) return;

    if (type === 'next') {
      const res = await fetch(`/api/mtt/games/${gameId}/tables/${currentTableRef.current}/next-hand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });
      const data = await res.json();
      if (data.success) setGameState(data.gameState);
      return;
    }

    const res = await fetch(`/api/mtt/games/${gameId}/tables/${currentTableRef.current}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, action: type, amount }),
    });
    const data = await res.json();
    if (data.success) {
      setGameState(data.gameState);
      if (data.movedToTable && data.movedToTable !== Number(currentTableRef.current)) {
        currentTableRef.current = String(data.movedToTable);
        router.replace(`/craic-mtt/${gameId}/table/${data.movedToTable}?wallet=${wallet}`);
      }
      if (data.tournamentFinished) {
        router.push(`/craic-mtt/${gameId}`);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1420] flex items-center justify-center text-white">
        Loading table…
      </div>
    );
  }

  if (error || !gameState) {
    return (
      <div className="min-h-screen bg-[#0E1420] flex items-center justify-center text-white flex-col gap-4">
        <p className="text-red-400">{error || 'Table not found'}</p>
        <button onClick={() => router.push(`/craic-mtt/${gameId}`)} className="px-6 py-3 bg-gray-800 rounded-xl">
          Back to lobby
        </button>
      </div>
    );
  }

  const sealedState = toSealedGameState(gameState, tournament, wallet || null, poolLabel);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <PokerTable state={sealedState} onAction={handleAction} />
    </div>
  );
}
