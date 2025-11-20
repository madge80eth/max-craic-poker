// app/mini-app/media/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, VideoCategory } from '@/types';
import { Play, Clock, DollarSign } from 'lucide-react';

export default function MediaPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | 'all'>('all');

  useEffect(() => {
    fetchVideos();
  }, [selectedCategory]);

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

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-200 mt-4">Loading videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <Play className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Videos Yet</h3>
            <p className="text-blue-200">
              {selectedCategory === 'all'
                ? 'Check back soon for poker content!'
                : `No ${selectedCategory} videos available yet.`}
            </p>
          </div>
        )}

        {/* Video Grid */}
        {!loading && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <Link
                key={video.id}
                href={`/mini-app/media/${video.id}`}
                className="group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-400 transition-all hover:scale-105"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-purple-900 to-blue-900">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Play className="w-16 h-16 text-white/50" />
                    </div>
                  )}

                  {/* Duration Badge */}
                  {video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium">
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2 bg-purple-600 px-2 py-1 rounded">
                    <span className="text-xs text-white font-medium capitalize">
                      {video.category}
                    </span>
                  </div>
                </div>

                {/* Info */}
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
    </div>
  );
}
