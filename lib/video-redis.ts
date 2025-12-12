// lib/video-redis.ts
import { redis } from './redis';
import { Video, VideoTip, VideoCategory } from '@/types';

/**
 * Redis Keys:
 * - video:{id} - Video metadata (hash)
 * - videos:all - SET of all video IDs
 * - videos:category:{category} - SET of video IDs by category
 * - video:{id}:tips - LIST of tip objects
 */

export async function createVideo(video: Omit<Video, 'uploadedAt' | 'viewCount' | 'totalTips'>): Promise<Video> {
  const fullVideo: Video = {
    ...video,
    uploadedAt: Date.now(),
    viewCount: 0,
    totalTips: 0
  };

  // Store video metadata
  await redis.hset(`video:${video.id}`, fullVideo as any);

  // Add to all videos set
  await redis.sadd('videos:all', video.id);

  // Add to category set
  await redis.sadd(`videos:category:${video.category}`, video.id);

  return fullVideo;
}

export async function getVideo(id: string): Promise<Video | null> {
  const data = await redis.hgetall(`video:${id}`);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string,
    cloudflareVideoId: data.cloudflareVideoId as string,
    thumbnailUrl: data.thumbnailUrl as string,
    duration: parseInt(data.duration as string),
    category: data.category as VideoCategory,
    uploadedAt: parseInt(data.uploadedAt as string),
    viewCount: parseInt(data.viewCount as string),
    totalTips: parseInt(data.totalTips as string),
    membersOnly: data.membersOnly === 'true' || data.membersOnly === true,
    isShort: data.isShort === 'true' || data.isShort === true
  };
}

export async function getAllVideos(category?: VideoCategory): Promise<Video[]> {
  let videoIds: string[];

  if (category) {
    videoIds = await redis.smembers(`videos:category:${category}`);
  } else {
    videoIds = await redis.smembers('videos:all');
  }

  if (!videoIds || videoIds.length === 0) {
    return [];
  }

  // Fetch all videos in parallel
  const videos = await Promise.all(
    videoIds.map(id => getVideo(id))
  );

  // Filter out nulls and sort by uploadedAt DESC
  return videos
    .filter((v): v is Video => v !== null)
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}

export async function incrementViewCount(videoId: string): Promise<void> {
  await redis.hincrby(`video:${videoId}`, 'viewCount', 1);
}

export async function addTip(tip: VideoTip): Promise<void> {
  // Add tip to video's tip list
  await redis.rpush(`video:${tip.videoId}:tips`, JSON.stringify(tip));

  // Increment total tips on video (use usdValue for multi-asset support)
  const tipValue = tip.usdValue || tip.amount;
  await redis.hincrby(`video:${tip.videoId}`, 'totalTips', tipValue);
}

export async function getVideoTips(videoId: string): Promise<VideoTip[]> {
  const tips = await redis.lrange(`video:${videoId}:tips`, 0, -1);

  if (!tips || tips.length === 0) {
    return [];
  }

  return tips.map(tip => JSON.parse(tip as string));
}

export async function deleteVideo(id: string): Promise<void> {
  const video = await getVideo(id);

  if (!video) {
    return;
  }

  // Remove from sets
  await redis.srem('videos:all', id);
  await redis.srem(`videos:category:${video.category}`, id);

  // Delete video data
  await redis.del(`video:${id}`);
  await redis.del(`video:${id}:tips`);
}
