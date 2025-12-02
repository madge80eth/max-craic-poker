// app/mini-app/media/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video } from '@/types';
import { ArrowLeft, Play, Eye, DollarSign, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';

export default function VideoPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const { address } = useAccount();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipping, setTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (videoId) {
      fetchVideo();
      incrementView();
    }
  }, [videoId]);

  useEffect(() => {
    if (video && address) {
      fetchSignedUrl();
    }
  }, [video, address]);

  const fetchVideo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`);
      const data = await res.json();

      if (res.ok) {
        setVideo(data.video);
      } else {
        console.error('Video not found');
      }
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignedUrl = async () => {
    if (!video || !address) return;

    setUrlLoading(true);
    setAccessDenied(false);

    try {
      const res = await fetch('/api/videos/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          walletAddress: address
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSignedUrl(data.url);
      } else if (res.status === 403) {
        setAccessDenied(true);
      } else {
        console.error('Failed to get signed URL:', data.error);
        // Fallback to public URL
        setSignedUrl(`https://customer-{code}.cloudflarestream.com/${video.cloudflareVideoId}/iframe`);
      }
    } catch (error) {
      console.error('Error fetching signed URL:', error);
      // Fallback to public URL
      setSignedUrl(`https://customer-{code}.cloudflarestream.com/${video.cloudflareVideoId}/iframe`);
    } finally {
      setUrlLoading(false);
    }
  };

  const incrementView = async () => {
    try {
      await fetch(`/api/videos/${videoId}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Error incrementing view:', error);
    }
  };

  const handleTip = async () => {
    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      alert('Please enter a valid tip amount');
      return;
    }

    setTipping(true);

    try {
      // Convert dollars to cents
      const cents = Math.round(parseFloat(tipAmount) * 100);

      // TODO: This will be replaced with actual USDC smart contract call
      // For now, just record the tip intent
      const res = await fetch(`/api/videos/${videoId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cents,
          tipper: 'demo-wallet', // Replace with actual connected wallet
          txHash: undefined // Will be populated by smart contract
        })
      });

      if (res.ok) {
        alert(`Thanks for tipping $${tipAmount}! (Smart contract integration coming soon)`);
        setTipAmount('');
        fetchVideo(); // Refresh to show updated total
      } else {
        alert('Failed to record tip');
      }
    } catch (error) {
      console.error('Error tipping:', error);
      alert('Failed to process tip');
    } finally {
      setTipping(false);
    }
  };

  const formatTips = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-blue-900 flex items-center justify-center pb-24">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-200 mt-4">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-blue-900 flex items-center justify-center pb-24">
        <div className="text-center">
          <Play className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Video Not Found</h2>
          <button
            onClick={() => router.push('/mini-app/media')}
            className="text-purple-400 hover:text-purple-300 flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Media
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-blue-900 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/mini-app/media')}
          className="flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Media</span>
        </button>

        {/* Video Player */}
        <div className="bg-black rounded-xl overflow-hidden mb-6">
          <div className="aspect-video relative">
            {accessDenied ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                <div className="text-center p-8">
                  <Lock className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Members Only</h3>
                  <p className="text-blue-200 mb-4">
                    This video requires an active membership to watch.
                  </p>
                  <button
                    onClick={() => router.push('/mini-app/media')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition"
                  >
                    Subscribe to Watch
                  </button>
                </div>
              </div>
            ) : urlLoading || !signedUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-blue-200">Loading video...</p>
                </div>
              </div>
            ) : (
              <iframe
                src={signedUrl}
                style={{ border: 'none', width: '100%', height: '100%' }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            )}
          </div>
        </div>

        {/* Video Info */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-blue-200">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{video.viewCount.toLocaleString()} views</span>
                </div>
                {video.totalTips > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatTips(video.totalTips)} in tips</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-purple-600 px-3 py-1 rounded-lg">
              <span className="text-sm text-white font-medium capitalize">
                {video.category}
              </span>
            </div>
          </div>

          <p className="text-blue-100 leading-relaxed">{video.description}</p>
        </div>

        {/* Tip Section */}
        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl border border-green-400/30 p-6">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            Tip Dom
          </h3>
          <p className="text-blue-200 mb-4">
            Enjoying the content? Send a tip in USDC to support more great poker education!
          </p>

          <div className="flex gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount (USD)"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-green-400"
            />
            <button
              onClick={handleTip}
              disabled={tipping || !tipAmount}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
            >
              {tipping ? 'Processing...' : 'Send Tip'}
            </button>
          </div>

          <p className="text-xs text-blue-300 mt-3">
            Smart contract integration coming soon. Tips currently recorded for demo purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
