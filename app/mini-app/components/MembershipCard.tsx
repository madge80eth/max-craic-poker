'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Wallet, Crown, Calendar, CheckCircle } from 'lucide-react';

interface MembershipSettings {
  enabled: boolean;
  monthlyFeeUSDC: number;
  benefits: string[];
  requireMembershipForRaffle: boolean;
}

interface Membership {
  walletAddress: string;
  startDate: number;
  lastPaymentDate: number;
  expiryDate: number;
  status: 'active' | 'expired' | 'cancelled';
  totalPaid: number;
  txHashes: string[];
}

interface MembershipCardProps {
  compact?: boolean; // If true, shows minimal version
}

export default function MembershipCard({ compact = false }: MembershipCardProps) {
  const { address, isConnected } = useAccount();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [settings, setSettings] = useState<MembershipSettings | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Fetch membership status
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/membership/status?wallet=${address}`);
        const data = await res.json();

        if (data.success) {
          setMembership(data.membership);
          setSettings(data.settings);
          setIsMember(data.isMember);
        }
      } catch (err) {
        console.error('Membership status fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatus();
  }, [address]);

  // Handle successful payment
  useEffect(() => {
    if (isConfirmed && hash) {
      recordMembership();
    }
  }, [isConfirmed, hash]);

  const recordMembership = async () => {
    if (!address || !hash || !settings) return;

    try {
      const res = await fetch('/api/membership/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          txHash: hash,
          amount: settings.monthlyFeeUSDC
        })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(data.message);
        setMembership(data.membership);
        setIsMember(true);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || 'Failed to activate membership');
      }
    } catch (err) {
      console.error('Record membership error:', err);
      setError('Failed to activate membership');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!address || !settings) {
      setError('Wallet not connected');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    try {
      const usdcContract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
      const recipientWallet = process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS || '';

      if (!recipientWallet) {
        setError('Payment wallet not configured');
        setIsProcessing(false);
        return;
      }

      // Convert cents to USDC (6 decimals)
      const amountInUSDC = parseUnits((settings.monthlyFeeUSDC / 100).toString(), 6);

      writeContract({
        address: usdcContract as `0x${string}`,
        abi: [
          {
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'transfer',
        args: [recipientWallet as `0x${string}`, amountInUSDC]
      });
    } catch (err: any) {
      console.error('Membership payment error:', err);
      setError(err.message || 'Payment failed');
      setIsProcessing(false);
    }
  };

  // Don't show if membership system is disabled
  if (!isLoading && settings && !settings.enabled) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30">
        <p className="text-yellow-200 text-center text-sm">Loading membership...</p>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return null; // Don't show membership card if not connected
  }

  // Compact version (for header/nav)
  if (compact && isMember && membership) {
    const daysRemaining = Math.ceil((membership.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg px-3 py-1.5 border border-yellow-400/30">
        <Crown className="w-4 h-4 text-yellow-400" />
        <span className="text-yellow-200 text-xs font-semibold">Member ({daysRemaining}d)</span>
      </div>
    );
  }

  // Already a member - show status
  if (isMember && membership) {
    const daysRemaining = Math.ceil((membership.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    const expiryDate = new Date(membership.expiryDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-400/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Active Member</h2>
          </div>
          <div className="bg-green-500/20 rounded-full px-3 py-1 border border-green-400/40">
            <span className="text-green-200 text-xs font-bold">ACTIVE</span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-yellow-100">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Expires: <span className="font-semibold">{expiryDate}</span> ({daysRemaining} days)</span>
          </div>
        </div>

        {settings && settings.benefits.length > 0 && (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-white/60 text-xs font-semibold mb-2">Member Benefits:</p>
            <ul className="space-y-1">
              {settings.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-yellow-100 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={isProcessing || isConfirming}
          className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg text-sm"
        >
          {isProcessing || isConfirming ? 'Processing...' : `Renew Early ($${((settings?.monthlyFeeUSDC || 0) / 100).toFixed(2)})`}
        </button>
      </div>
    );
  }

  // Not a member - show subscribe option
  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-400/30">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Become a Member</h2>
      </div>

      <p className="text-purple-100 text-sm mb-4">
        Get exclusive benefits and support the stream for ${((settings?.monthlyFeeUSDC || 0) / 100).toFixed(2)}/month
      </p>

      {settings && settings.benefits.length > 0 && (
        <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
          <p className="text-white/60 text-xs font-semibold mb-2">What You Get:</p>
          <ul className="space-y-1">
            {settings.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2 text-purple-100 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 rounded-lg p-3 mb-3 border border-green-400/40">
          <p className="text-green-200 text-sm text-center font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 rounded-lg p-3 mb-3 border border-red-400/40">
          <p className="text-red-200 text-sm text-center">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubscribe}
        disabled={isProcessing || isConfirming}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2"
      >
        {isProcessing || isConfirming ? (
          'Processing...'
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            Subscribe for ${((settings?.monthlyFeeUSDC || 0) / 100).toFixed(2)}/month
          </>
        )}
      </button>

      <p className="text-purple-200/60 text-xs text-center mt-3">
        Payment in USDC on Base • Auto-renews monthly
      </p>
    </div>
  );
}
