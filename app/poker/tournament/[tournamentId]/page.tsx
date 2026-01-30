'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft, Users, Trophy, Clock, Play, UserPlus, Crown } from 'lucide-react';
import { TournamentState } from '@/lib/poker/tournament-types';
import { TournamentPlayerEntry } from '@/lib/poker/tournament-types';

interface PageProps {
  params: Promise<{ tournamentId: string }>;
}

export default function TournamentPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const { address } = useAccount();

  const [tournamentId, setTournamentId] = useState('');
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [players, setPlayers] = useState<TournamentPlayerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const playerIdParam = searchParams.get('playerId');
  const playerNameParam = searchParams.get('playerName');
  const playerId = playerIdParam || address || null;
  const playerName = playerNameParam || (address ? `Player_${address.slice(2, 6)}` : 'Guest');

  useEffect(() => {
    params.then((p) => setTournamentId(p.tournamentId));
  }, [params]);

  const fetchState = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`/api/poker/tournament/${tournamentId}`);
      const data = await res.json();
      if (data.success) {
        setTournament(data.tournament);
        setPlayers(data.players || []);
        setError(null);
      } else {
        setError(data.error || 'Tournament not found');
      }
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [tournamentId, fetchState]);

  // Redirect registered players to their table once tournament starts
  useEffect(() => {
    if (!tournament || !playerId) return;
    if (tournament.status === 'running' || tournament.status === 'final_table') {
      const myEntry = players.find((p) => p.playerId === playerId);
      if (myEntry?.currentTableId) {
        window.location.href = `/poker/${myEntry.currentTableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}`;
      }
    }
  }, [tournament, players, playerId, playerName]);

  const handleRegister = async () => {
    if (!playerId || !tournamentId || actionPending) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/poker/tournament/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, playerName }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to register');
      }
      fetchState();
    } catch {
      alert('Failed to register');
    } finally {
      setActionPending(false);
    }
  };

  const handleStart = async () => {
    if (!playerId || !tournamentId || actionPending) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/poker/tournament/${tournamentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to start');
      }
      fetchState();
    } catch {
      alert('Failed to start tournament');
    } finally {
      setActionPending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-600/20 flex items-center justify-center animate-pulse">
            <Trophy className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="text-gray-400">Loading tournament...</div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Tournament not found'}</div>
          <Link href="/poker" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  const isRegistered = players.some((p) => p.playerId === playerId);
  const isCreator = tournament.creatorId === playerId;
  const canRegister = tournament.status === 'registering' && !isRegistered && playerId;
  const canStart = tournament.status === 'registering' && isCreator && tournament.registeredCount >= 2;

  const statusColors: Record<string, string> = {
    registering: 'bg-emerald-500',
    running: 'bg-yellow-500',
    final_table: 'bg-purple-500',
    finished: 'bg-gray-500',
  };

  const statusLabels: Record<string, string> = {
    registering: 'Registration Open',
    running: 'In Progress',
    final_table: 'Final Table',
    finished: 'Finished',
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/poker" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Lobby</span>
          </Link>
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full text-white ${statusColors[tournament.status]}`}>
            {statusLabels[tournament.status]}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {tournament.registeredCount}/{tournament.maxPlayers}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              {tournament.startingChips} chips
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {tournament.blindIntervalMinutes}m blinds
            </span>
          </div>
        </div>

        {/* Actions */}
        {tournament.status === 'registering' && (
          <div className="flex gap-3 justify-center">
            {canRegister && (
              <button
                onClick={handleRegister}
                disabled={actionPending}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-5 h-5" />
                Register
              </button>
            )}
            {isRegistered && !canStart && (
              <div className="px-6 py-3 bg-gray-800 text-emerald-400 font-medium rounded-xl border border-emerald-500/30">
                Registered — Waiting for start...
              </div>
            )}
            {canStart && (
              <button
                onClick={handleStart}
                disabled={actionPending}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                Start Tournament
              </button>
            )}
          </div>
        )}

        {/* Running state info */}
        {(tournament.status === 'running' || tournament.status === 'final_table') && (
          <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/30">
            <div className="text-lg font-bold text-emerald-400">
              {tournament.remainingCount} players remaining
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {tournament.tableIds.length} table{tournament.tableIds.length !== 1 ? 's' : ''} active
            </div>
            {tournament.status === 'final_table' && (
              <div className="mt-2 text-purple-400 font-medium text-sm">Final Table!</div>
            )}
          </div>
        )}

        {/* Winner */}
        {tournament.status === 'finished' && tournament.winnerId && (
          <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 rounded-xl p-6 text-center border border-yellow-500/30">
            <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-yellow-400">Tournament Winner!</div>
            <div className="text-white mt-1">
              {players.find((p) => p.playerId === tournament.winnerId)?.name || tournament.winnerId}
            </div>
          </div>
        )}

        {/* Player List */}
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
            Players ({players.length})
          </h2>
          <div className="space-y-2">
            {players
              .sort((a, b) => {
                // Winner first, then by status, then by chip count
                if (a.status === 'winner') return -1;
                if (b.status === 'winner') return 1;
                if (a.status === 'playing' && b.status !== 'playing') return -1;
                if (b.status === 'playing' && a.status !== 'playing') return 1;
                return b.chipCount - a.chipCount;
              })
              .map((p, i) => (
                <div
                  key={p.playerId}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    p.status === 'eliminated'
                      ? 'bg-gray-900/30 border-gray-800/30 opacity-50'
                      : p.status === 'winner'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : p.playerId === playerId
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-gray-800/30 border-gray-700/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        p.playerId === playerId
                          ? 'bg-purple-500 text-white'
                          : p.status === 'winner'
                            ? 'bg-yellow-500 text-gray-900'
                            : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {p.name}
                        {p.playerId === playerId && <span className="text-purple-400 text-xs ml-1">(You)</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.status === 'eliminated' && p.finishPosition
                          ? `Finished ${p.finishPosition}${ordSuffix(p.finishPosition)}`
                          : p.status === 'winner'
                            ? 'Winner!'
                            : p.status === 'registered'
                              ? 'Registered'
                              : `${p.chipCount.toLocaleString()} chips`}
                      </div>
                    </div>
                  </div>
                  {p.status === 'eliminated' && (
                    <span className="text-xs text-gray-600 font-medium">OUT</span>
                  )}
                  {p.status === 'winner' && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ordSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
