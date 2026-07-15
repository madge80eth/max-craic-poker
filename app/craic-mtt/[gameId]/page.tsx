'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArrowLeft, Users, Trophy, Clock, Wallet, Loader2, Shield, Coins, Play } from 'lucide-react';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { PAYOUT_TEMPLATES } from '@/lib/mtt/tournament';
import { Gate } from '@/lib/mtt/types';

interface GameRecordShape {
  gameId: string;
  config: {
    title: string;
    startsAt: string;
    minPlayers: number;
    structure: {
      levelMins: number;
      startingStack: number;
      lateRegLevels: number;
      payoutTemplate: keyof typeof PAYOUT_TEMPLATES;
    };
    pool: { asset: string; creatorSeed: number };
    gates: Gate[];
  };
  status: string;
}

interface EntrantRecordShape {
  wallet: string;
  tableNo: number | null;
  status: string;
}

interface TournamentShape {
  lifecycle: string;
  currentLevel: number;
  entrants: Record<string, EntrantRecordShape>;
}

interface DonorShape {
  wallet: string;
  amount: number;
}

function gateLabel(gate: Gate): string {
  switch (gate.type) {
    case 'erc20MinHold':
      return `Hold at least ${gate.minAmount} of ${gate.token.slice(0, 6)}…${gate.token.slice(-4)}`;
    case 'erc20HeldFor':
      return `Hold at least ${gate.minAmount} of ${gate.token.slice(0, 6)}…${gate.token.slice(-4)} for ${gate.minDays}+ days`;
    case 'nftHold':
      return `Own ${gate.minCount}+ NFT${gate.minCount > 1 ? 's' : ''} from ${gate.collection.slice(0, 6)}…${gate.collection.slice(-4)}`;
    case 'walletAge':
      return `Wallet must be ${gate.minDays}+ days old`;
    case 'allowlist':
      return `Wallet must be on the allowlist (${gate.addresses.length} address${gate.addresses.length === 1 ? '' : 'es'})`;
  }
}

export default function MttLobby() {
  const { address } = useAccount();
  const { hasInjected, isConnecting, manualConnectors, connectWith } = useWalletConnect();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [record, setRecord] = useState<GameRecordShape | null>(null);
  const [tournament, setTournament] = useState<TournamentShape | null>(null);
  const [donors, setDonors] = useState<DonorShape[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [showConnectorPicker, setShowConnectorPicker] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const [gameRes, sponsorRes] = await Promise.all([
        fetch(`/api/mtt/games/${gameId}`),
        fetch(`/api/mtt/games/${gameId}/sponsor`),
      ]);
      const gameData = await gameRes.json();
      const sponsorData = await sponsorRes.json();
      if (gameData.success) {
        setRecord(gameData.record);
        setTournament(gameData.tournament);
        setError(null);
      } else {
        setError(gameData.error || 'Failed to load game');
      }
      if (sponsorData.success) {
        setDonors(sponsorData.donors ?? []);
        setPoolTotal(sponsorData.pool?.total ?? 0);
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 3000);
    return () => clearInterval(id);
  }, [fetchState]);

  const myEntrant = address ? tournament?.entrants[address.toLowerCase()] : undefined;
  const entrantCount = tournament ? Object.keys(tournament.entrants).length : 0;
  const payoutPcts = record ? PAYOUT_TEMPLATES[record.config.structure.payoutTemplate] : [];

  async function handleRegister() {
    if (!address) {
      setShowConnectorPicker(true);
      return;
    }
    setRegistering(true);
    setRegError(null);
    try {
      const res = await fetch(`/api/mtt/games/${gameId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchState();
      } else {
        setRegError(data.error || (data.reasons ? data.reasons.join('; ') : 'Registration failed'));
      }
    } catch {
      setRegError('Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/mtt/games/${gameId}/start`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchState();
      } else {
        alert(data.error || 'Failed to start');
      }
    } catch {
      alert('Failed to start');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Game not found'}</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium">
            Back
          </button>
        </div>
      </div>
    );
  }

  const { structure } = record.config;
  const startsAt = new Date(record.config.startsAt);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs px-3 py-1 rounded-full bg-gray-800/70 text-gray-400 uppercase tracking-wider">
          {tournament?.lifecycle ?? record.status}
        </span>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black">{record.config.title}</h1>
          <p className="text-sm text-gray-500 mt-1">Starts {startsAt.toLocaleString()}</p>
        </div>

        {/* Structure sheet */}
        <section className="bg-gray-800/20 rounded-2xl border border-gray-700/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" /> Structure
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Starting stack" value={structure.startingStack.toLocaleString()} />
            <Stat label="Level length" value={`${structure.levelMins} min`} />
            <Stat label="Late reg" value={`${structure.lateRegLevels} levels`} />
            <Stat label="Min players" value={String(record.config.minPlayers)} />
          </div>
        </section>

        {/* Payout ladder */}
        <section className="bg-gray-800/20 rounded-2xl border border-gray-700/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Payout ladder
          </h2>
          <div className="space-y-1.5 text-sm">
            {payoutPcts.map((pct, i) => (
              <div key={i} className="flex justify-between text-gray-400">
                <span>{i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`}</span>
                <span className="text-amber-400 font-semibold">{pct}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Gates */}
        {record.config.gates.length > 0 && (
          <section className="bg-gray-800/20 rounded-2xl border border-gray-700/30 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" /> Entry requirements
            </h2>
            <ul className="space-y-1.5 text-sm text-gray-400 list-disc list-inside">
              {record.config.gates.map((g, i) => (
                <li key={i}>{gateLabel(g)}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Sponsor pool */}
        <section className="bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl border border-amber-500/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" /> Prize pool
            </h2>
            <button
              onClick={() => router.push(`/craic-mtt/${gameId}/sponsor`)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            >
              Sponsor this event
            </button>
          </div>
          <p className="text-2xl font-black text-amber-400">
            {poolTotal.toLocaleString()} <span className="text-sm text-gray-500 font-normal">{record.config.pool.asset}</span>
          </p>
          {donors.length > 0 && (
            <div className="space-y-1 pt-1">
              {donors.slice(0, 5).map((d) => (
                <div key={d.wallet} className="flex justify-between text-xs text-gray-500">
                  <span className="font-mono">{d.wallet.slice(0, 6)}…{d.wallet.slice(-4)}</span>
                  <span>{d.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Players */}
        <section className="bg-gray-800/20 rounded-2xl border border-gray-700/30 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Registered ({entrantCount}/{record.config.minPlayers} min)
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {tournament &&
              Object.keys(tournament.entrants).map((w) => (
                <span key={w} className="text-[10px] font-mono px-2 py-1 rounded-lg bg-gray-800/50 text-gray-400">
                  {w.slice(0, 6)}…{w.slice(-4)}
                </span>
              ))}
          </div>
        </section>

        {/* Actions */}
        {tournament?.lifecycle === 'registering' && (
          <div className="space-y-3">
            {!address ? (
              <div className="relative">
                <button
                  onClick={() => setShowConnectorPicker((s) => !s)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-gray-900 font-bold flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" /> Connect wallet to register
                </button>
                {showConnectorPicker && !hasInjected && (
                  <div className="absolute inset-x-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-xl p-2 space-y-1 z-10">
                    {manualConnectors.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => connectWith(c.id)}
                        disabled={isConnecting}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-sm"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : myEntrant ? (
              <div className="py-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-semibold text-center">
                You&apos;re registered
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 rounded-xl text-gray-900 font-bold flex items-center justify-center gap-2"
              >
                {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
              </button>
            )}
            {regError && <p className="text-sm text-red-400 text-center">{regError}</p>}

            {entrantCount >= record.config.minPlayers && (
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 font-semibold flex items-center justify-center gap-2 border border-gray-700"
              >
                {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-4 h-4" />} Start tournament
              </button>
            )}
          </div>
        )}

        {tournament?.lifecycle === 'running' && myEntrant?.tableNo && (
          <button
            onClick={() => router.push(`/craic-mtt/${gameId}/table/${myEntrant.tableNo}?wallet=${address}`)}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-gray-900 font-bold flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" /> Go to your table
          </button>
        )}

        {tournament?.lifecycle === 'finished' && (
          <div className="py-3.5 bg-gray-800/40 rounded-xl text-gray-400 font-semibold text-center">Tournament finished</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className="text-gray-200 font-semibold">{value}</p>
    </div>
  );
}
