// app/mini-app/media/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, VideoCategory, Membership } from '@/types';
import { Play, Clock, DollarSign, Lock, CheckCircle, X } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CREATOR_ADDRESS = '0x0Eb1d7a479C19897AC6f74E437c8b0c7E83bFe0C';
const USDC_ABI = [{ "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }];

export default function MediaPage() {
  const { address } = useAccount();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | 'all'>('all');
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setpurchaseSuccess] = useState(false);

  const { data: hash, writeContract, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    fetchVideos();
  }, [selectedCategory]);

  useEffect(() => {
    if (address) {
      fetchMembership();
    } else {
      setMembershipLoading(false);
    }
  }, [address]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      handleMembershipConfirmation();
    }
  }, [isConfirmed, hash]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      setPurchaseError(writeError.message || 'Transaction failed');
      setIsPurchasing(false);
    }
  }, [writeError]);

  const fetchMembership = async () => {
    setMembershipLoading(true);
    try {
      const res = await fetch(`/api/membership/check?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setMembership(data.membership || null);
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleMembershipConfirmation = async () => {
    try {
      const res = await fetch('/api/membership/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          txHash: hash,
          amount: 1000 // $10 in cents
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to activate membership');
      }

      const data = await res.json();
      setpurchaseSuccess(true);
      setPurchaseError(null);
      setIsPurchasing(false);

      // Refresh membership status
      await fetchMembership();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setpurchaseSuccess(false);
      }, 5000);
    } catch (error: any) {
      setPurchaseError(error.message || 'Failed to activate membership');
      setIsPurchasing(false);
    }
  };

  const handlePurchaseMembership = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!address) {
      setPurchaseError('Please connect your wallet first');
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      // Transfer $10 USDC to creator
      const amountInCents = 1000; // $10.00
      const usdcAmount = parseUnits((amountInCents / 100).toString(), 6);

      writeContract({
        address: USDC_CONTRACT,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [CREATOR_ADDRESS, usdcAmount]
      });
    } catch (error: any) {
      console.error('Membership purchase error:', error);
      setPurchaseError(error.message || 'Failed to initiate transaction');
      setIsPurchasing(false);
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all'
        ? '/api/videos'
        : `/api/videos?category=${selectedCategory}`;

      const res = await fetch(url);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTips = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const categories: { value: VideoCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Videos' },
    { value: 'highlight', label: 'Highlights' },
    { value: 'breakdown', label: 'Breakdowns' },
    { value: 'strategy', label: 'Strategy' }
  ];

  const isMemberActive = membership?.status === 'active' && membership?.expiryDate > Date.now();
  const highlightVideos = videos.filter(v => !v.membersOnly);
  const memberVideos = videos.filter(v => v.membersOnly);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-blue-900 pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Media</h1>
          </div>
          <p className="text-blue-200">Educational poker content from stream VODs</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-200 mt-4">Loading videos...</p>
          </div>
        )}

        {/* Content when loaded */}
        {!loading && (
          <>
            {/* FREE HIGHLIGHTS SECTION */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">🎬 Free Highlights</h2>
              </div>

              {highlightVideos.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <Play className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-blue-200 text-sm">No free highlights yet. Check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {highlightVideos.map(video => (
                    <Link
                      key={video.id}
                      href={`/mini-app/media/${video.id}`}
                      className="group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-400 transition-all hover:scale-105"
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-purple-900 to-blue-900">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Play className="w-16 h-16 text-white/50" />
                          </div>
                        )}
                        {video.duration > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3 text-white" />
                            <span className="text-xs text-white font-medium">{formatDuration(video.duration)}</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded">
                          <span className="text-xs text-white font-medium capitalize">{video.category}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm text-blue-200">
                          <div className="flex items-center gap-1">
                            <Play className="w-4 h-4" />
                            <span>{video.viewCount.toLocaleString()} views</span>
                          </div>
                          {video.totalTips > 0 && (
                            <div className="flex items-center gap-1 text-green-400">
                              <DollarSign className="w-4 h-4" />
                              <span>{formatTips(video.totalTips)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* MEMBERS-ONLY SECTION */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">👑 Members Exclusive</h2>
                  {isMemberActive && <CheckCircle className="w-6 h-6 text-green-400" />}
                </div>
                {isMemberActive && membership && (
                  <span className="text-xs text-green-300 bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30">
                    Active until {new Date(membership.expiryDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {memberVideos.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <Lock className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-blue-200 text-sm">No exclusive content yet. Check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memberVideos.map(video => {
                    const isLocked = !isMemberActive;
                    return (
                      <div
                        key={video.id}
                        className={`group bg-white/5 rounded-xl overflow-hidden border border-white/10 ${isLocked ? 'opacity-60' : 'hover:border-purple-400 hover:scale-105'} transition-all relative`}
                      >
                        {isLocked ? (
                          <>
                            <div className="relative aspect-video bg-gradient-to-br from-purple-900 to-blue-900 blur-sm">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Play className="w-16 h-16 text-white/50" />
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black/80 p-4 rounded-xl text-center">
                                <Lock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                                <p className="text-white font-bold text-sm">Members Only</p>
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-white mb-2 line-clamp-2 blur-sm">{video.title}</h3>
                            </div>
                          </>
                        ) : (
                          <Link href={`/mini-app/media/${video.id}`}>
                            <div className="relative aspect-video bg-gradient-to-br from-purple-900 to-blue-900">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Play className="w-16 h-16 text-white/50" />
                                </div>
                              )}
                              {video.duration > 0 && (
                                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-white" />
                                  <span className="text-xs text-white font-medium">{formatDuration(video.duration)}</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-1 rounded flex items-center gap-1">
                                <Lock className="w-3 h-3 text-white" />
                                <span className="text-xs text-white font-medium capitalize">Members</span>
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                                {video.title}
                              </h3>
                              <div className="flex items-center justify-between text-sm text-blue-200">
                                <div className="flex items-center gap-1">
                                  <Play className="w-4 h-4" />
                                  <span>{video.viewCount.toLocaleString()} views</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MEMBERSHIP PURCHASE CARD */}
            {!isMemberActive && (
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-8 border border-purple-400/30">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2">👑 Become a Member</h2>
                  <p className="text-purple-100 text-lg">Unlock exclusive content & support the creator</p>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-4xl font-bold text-white">$10</span>
                    <span className="text-purple-100">/ month</span>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                      <p className="text-white">Unlock all exclusive video content</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                      <p className="text-white">Early access to new videos</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                      <p className="text-white">Support poker education</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                      <p className="text-white">Priority access to community features</p>
                    </div>
                  </div>
                </div>

                {address ? (
                  <>
                    <button
                      onClick={handlePurchaseMembership}
                      disabled={isPurchasing || isConfirming}
                      className="w-full bg-white text-purple-700 font-bold py-4 px-6 rounded-lg hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {isPurchasing || isConfirming ? 'Processing...' : 'Subscribe for $10 USDC'}
                    </button>

                    {purchaseError && (
                      <div className="mt-4 bg-red-500/20 border border-red-400 rounded-lg p-3 flex items-start gap-2">
                        <X className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                        <p className="text-red-200 text-sm">{purchaseError}</p>
                      </div>
                    )}

                    {purchaseSuccess && (
                      <div className="mt-4 bg-green-500/20 border border-green-400 rounded-lg p-3 flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                        <p className="text-green-200 text-sm">Welcome! Your membership is now active!</p>
                      </div>
                    )}

                    <p className="text-center text-purple-100 text-xs mt-4">
                      Payment via USDC on Base • Auto-renews monthly
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-white/80 text-sm">Connect your wallet to subscribe</p>
                  </div>
                )}
              </div>
            )}

            {/* Member Info Link */}
            <div className="mt-8 text-center">
              <Link href="/mini-app/info/membership" className="text-purple-300 hover:text-purple-200 underline text-sm">
                Learn more about membership benefits →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
