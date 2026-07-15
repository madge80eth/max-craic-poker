'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArrowLeft, Coins, Loader2, Wallet, Check } from 'lucide-react';
import { useWalletConnect } from '@/hooks/useWalletConnect';

interface DonorShape {
  wallet: string;
  amount: number;
}

export default function SponsorPage() {
  const { address } = useAccount();
  const { hasInjected, isConnecting, manualConnectors, connectWith } = useWalletConnect();
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;

  const [title, setTitle] = useState('');
  const [asset, setAsset] = useState('USDC');
  const [poolTotal, setPoolTotal] = useState(0);
  const [donors, setDonors] = useState<DonorShape[]>([]);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConnectorPicker, setShowConnectorPicker] = useState(false);
  const [isRegisteredEntrant, setIsRegisteredEntrant] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const [gameRes, sponsorRes] = await Promise.all([
        fetch(`/api/mtt/games/${gameId}`),
        fetch(`/api/mtt/games/${gameId}/sponsor`),
      ]);
      const gameData = await gameRes.json();
      const sponsorData = await sponsorRes.json();
      if (gameData.success) {
        setTitle(gameData.record.config.title);
        setAsset(gameData.record.config.pool.asset);
        if (address && gameData.tournament?.entrants[address.toLowerCase()]) {
          setIsRegisteredEntrant(true);
        }
      }
      if (sponsorData.success) {
        setDonors(sponsorData.donors ?? []);
        setPoolTotal(sponsorData.pool?.total ?? 0);
      }
    } catch {
      // best-effort — sponsor form still renders with stale numbers
    } finally {
      setLoading(false);
    }
  }, [gameId, address]);

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 5000);
    return () => clearInterval(id);
  }, [fetchState]);

  async function handleSponsor() {
    if (!address) {
      setShowConnectorPicker(true);
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/mtt/games/${gameId}/sponsor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, amount: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setAmount('');
        await fetchState();
      } else {
        setError(data.error || 'Sponsorship failed');
      }
    } catch {
      setError('Sponsorship failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800/50 px-4 py-3 flex items-center">
        <button onClick={() => router.push(`/craic-mtt/${gameId}`)} className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-8 max-w-lg mx-auto space-y-6 text-center">
        <Coins className="w-12 h-12 mx-auto text-amber-400" />
        <div>
          <h1 className="text-2xl font-black">Sponsor {title}</h1>
          <p className="text-sm text-gray-500 mt-1">Free entry, funded by sponsors like you — no buy-in from players.</p>
        </div>

        <div className="bg-gray-800/20 rounded-2xl border border-gray-700/30 p-5">
          <p className="text-xs uppercase tracking-wider text-gray-600 mb-1">Current pool</p>
          <p className="text-3xl font-black text-amber-400">
            {poolTotal.toLocaleString()} <span className="text-base text-gray-500 font-normal">{asset}</span>
          </p>
        </div>

        {isRegisteredEntrant ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            You&apos;re registered to play this event, so you can&apos;t also sponsor it (entrant/sponsor wall).
          </div>
        ) : done ? (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
            <Check className="w-8 h-8 mx-auto text-emerald-400" />
            <p className="text-emerald-400 font-semibold">Thanks for sponsoring!</p>
            <button onClick={() => setDone(false)} className="text-xs text-gray-500 underline">
              Sponsor again
            </button>
          </div>
        ) : !address ? (
          <div className="relative">
            <button
              onClick={() => setShowConnectorPicker((s) => !s)}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 rounded-xl text-gray-900 font-bold flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" /> Connect wallet to sponsor
            </button>
            {showConnectorPicker && !hasInjected && (
              <div className="mt-2 bg-gray-900 border border-gray-700 rounded-xl p-2 space-y-1 text-left">
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
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-gray-800/40 rounded-xl border border-gray-700/40 px-4 py-3">
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 bg-transparent outline-none text-lg font-semibold"
              />
              <span className="text-gray-500 text-sm">{asset}</span>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={handleSponsor}
              disabled={submitting}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 rounded-xl text-gray-900 font-bold flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sponsor'}
            </button>
          </div>
        )}

        {donors.length > 0 && (
          <div className="bg-gray-800/20 rounded-2xl border border-gray-700/30 p-4 text-left">
            <p className="text-xs uppercase tracking-wider text-gray-600 mb-2">Donors</p>
            <div className="space-y-1.5">
              {donors.map((d) => (
                <div key={d.wallet} className="flex justify-between text-sm">
                  <span className="font-mono text-gray-400">{d.wallet.slice(0, 6)}…{d.wallet.slice(-4)}</span>
                  <span className="text-amber-400 font-semibold">{d.amount.toLocaleString()} {asset}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
