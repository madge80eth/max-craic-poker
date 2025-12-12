'use client';

import { useState } from 'react';
import { Upload, Video, CheckCircle, X, AlertCircle } from 'lucide-react';
import { VideoCategory } from '@/types';

export default function MediaUpload() {
  const [cloudflareVideoId, setCloudflareVideoId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VideoCategory>('highlight');
  const [duration, setDuration] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [membersOnly, setMembersOnly] = useState(false);
  const [isShort, setIsShort] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: { value: VideoCategory; label: string }[] = [
    { value: 'highlight', label: 'Highlight' },
    { value: 'breakdown', label: 'Breakdown' },
    { value: 'strategy', label: 'Strategy' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudflareVideoId,
          title,
          description,
          category,
          duration: duration ? parseInt(duration) : 0,
          thumbnailUrl: thumbnailUrl || undefined,
          membersOnly,
          isShort
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload video');
      }

      setSuccess(true);
      // Reset form
      setCloudflareVideoId('');
      setTitle('');
      setDescription('');
      setCategory('highlight');
      setDuration('');
      setThumbnailUrl('');
      setMembersOnly(false);
      setIsShort(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Upload Video to Media</h2>
        <p className="text-blue-200 text-sm">
          Upload videos from Cloudflare Stream to your media library
        </p>
      </div>

      {/* Cloudflare Stream Instructions */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-white font-semibold mb-2">How to use Cloudflare Stream</h3>
            <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
              <li>Upload your video to Cloudflare Stream dashboard</li>
              <li>Copy the Video ID (found in the video details)</li>
              <li>Paste the Video ID below along with title and description</li>
              <li>Select category and set if members-only</li>
              <li>Cloudflare will automatically generate thumbnail URLs</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-400 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-green-200 font-semibold">Video uploaded successfully!</h3>
            <p className="text-green-300 text-sm">Your video is now live in the media section.</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-400 rounded-lg p-4 mb-6 flex items-start gap-3">
          <X className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-200 font-semibold">Upload failed</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cloudflare Video ID */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Cloudflare Video ID <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={cloudflareVideoId}
            onChange={(e) => setCloudflareVideoId(e.target.value)}
            placeholder="e.g. 5d5bc37ffcf54c9b82e996823bffbb81"
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors"
          />
          <p className="text-blue-300 text-xs mt-1">
            Found in your Cloudflare Stream dashboard under video details
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Video Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Amazing River Bluff in $10k Tournament"
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the video content..."
            required
            rows={4}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as VideoCategory)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-colors"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value} className="bg-gray-900">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 180 (for 3 minutes)"
            min="0"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors"
          />
          <p className="text-blue-300 text-xs mt-1">Optional - leave blank for auto-detection</p>
        </div>

        {/* Custom Thumbnail URL */}
        <div>
          <label className="block text-white font-semibold mb-2">
            Custom Thumbnail URL (Optional)
          </label>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-colors"
          />
          <p className="text-blue-300 text-xs mt-1">
            Leave blank to use Cloudflare's auto-generated thumbnail
          </p>
        </div>

        {/* Members Only Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="membersOnly"
            checked={membersOnly}
            onChange={(e) => setMembersOnly(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-400 focus:ring-2"
          />
          <label htmlFor="membersOnly" className="text-white font-semibold cursor-pointer">
            Members Only Content
          </label>
        </div>
        <p className="text-blue-300 text-sm -mt-4 ml-8">
          Check this to make the video exclusive to paying members
        </p>

        {/* Is Short Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isShort"
            checked={isShort}
            onChange={(e) => setIsShort(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-400 focus:ring-2"
          />
          <label htmlFor="isShort" className="text-white font-semibold cursor-pointer">
            Short Video (9:16 Vertical)
          </label>
        </div>
        <p className="text-blue-300 text-sm -mt-4 ml-8">
          Check this for vertical short-form content (TikTok/Reels style). Will display in Highlights section with portrait layout.
        </p>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload Video to Media
            </>
          )}
        </button>
      </form>
    </div>
  );
}
