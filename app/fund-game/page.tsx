'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wallet,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

// Escrow address for receiving USDC
const ESCROW_ADDRESS = '0xCc7659fbE122AcdE826725cf3a4cd5dfD72763F0';

export default function FundGamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tournamentId = searchParams.get('tournamentId');
  const tableId = searchParams.get('tableId');
  const amount = parseInt(searchParams.get('amount') || '0');
  const playerId = searchParams.get('playerId');
  const playerName = searchParams.get('playerName');

  const [copied, setCopied] = useState(false);
  const [fundingConfirmed, setFundingConfirmed] = useState(false);
  const [fundingTxHash, setFundingTxHash] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const formatUSDC = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(ESCROW_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Poll for funding confirmation
  useEffect(() => {
    if (!tournamentId || fundingConfirmed) return;

    const checkFunding = async () => {
      setChecking(true);
      try {
        const res = await fetch(
          `/api/poker/check-funding?tournamentId=${encodeURIComponent(tournamentId)}&amount=${amount}`
        );
        const data = await res.json();
        if (data.funded) {
          setFundingConfirmed(true);
          setFundingTxHash(data.txHash || null);
        }
      } catch (err) {
        console.error('Error checking funding:', err);
      } finally {
        setChecking(false);
      }
    };

    // Check immediately
    checkFunding();

    // Then poll every 5 seconds
    const interval = setInterval(checkFunding, 5000);
    return () => clearInterval(interval);
  }, [tournamentId, amount, fundingConfirmed]);

  const handleContinue = () => {
    if (tableId && playerId) {
      router.push(`/poker/${tableId}?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName || 'Player')}`);
    } else {
      router.push('/poker');
    }
  };

  if (!tournamentId || !amount) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-6 max-w-sm w-full text-center">
          <p className="text-red-400">Missing tournament details</p>
          <button
            onClick={() => router.push('/poker')}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <button
            onClick={() => router.back()}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Fund Prize Pool</h1>
              <p className="text-xs text-gray-500">Send USDC to escrow</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!fundingConfirmed ? (
            <>
              {/* Amount */}
              <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30 text-center">
                <div className="text-sm text-gray-400 mb-1">Send exactly</div>
                <div className="text-3xl font-black text-yellow-400">{formatUSDC(amount)}</div>
                <div className="text-sm text-gray-500 mt-1">USDC on Base</div>
              </div>

              {/* Address */}
              <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="text-sm text-gray-400 mb-2">To this address:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-white bg-gray-900/50 px-3 py-2 rounded-lg truncate">
                    {ESCROW_ADDRESS}
                  </code>
                  <button
                    onClick={copyAddress}
                    className={`p-2 rounded-lg transition-colors ${
                      copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && (
                  <div className="text-xs text-emerald-400 mt-2">Address copied!</div>
                )}
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-blue-400 font-medium text-sm mb-2">How to fund</p>
                <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
                  <li>Copy the address above</li>
                  <li>Open your wallet (Coinbase, MetaMask, etc.)</li>
                  <li>Send {formatUSDC(amount)} USDC on Base network</li>
                  <li>Wait for confirmation below</li>
                </ol>
              </div>

              {/* Status */}
              <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-3">
                  {checking ? (
                    <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-300">Waiting for payment...</div>
                    <div className="text-xs text-gray-500">Auto-detects when USDC arrives</div>
                  </div>
                </div>
              </div>

              {/* Basescan link */}
              <a
                href={`https://basescan.org/address/${ESCROW_ADDRESS}#tokentxns`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View escrow on Basescan
              </a>
            </>
          ) : (
            <>
              {/* Success */}
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-emerald-400 font-medium">Prize pool funded!</p>
                    <p className="text-gray-400 text-sm">{formatUSDC(amount)} USDC received</p>
                  </div>
                </div>
              </div>

              {fundingTxHash && (
                <a
                  href={`https://basescan.org/tx/${fundingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View transaction
                </a>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleContinue}
            disabled={!fundingConfirmed}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {fundingConfirmed ? (
              <>Continue to Game <ArrowRight className="w-5 h-5" /></>
            ) : (
              'Waiting for payment...'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
