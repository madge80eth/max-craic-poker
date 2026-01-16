'use client';

import { useCallback, useRef, useEffect } from 'react';

// Sound URLs - using free poker/casino sounds
const SOUND_URLS = {
  fold: 'https://cdn.freesound.org/previews/240/240776_4284968-lq.mp3',      // card slide
  check: 'https://cdn.freesound.org/previews/240/240777_4284968-lq.mp3',     // tap
  call: 'https://cdn.freesound.org/previews/391/391658_7368311-lq.mp3',      // chips
  raise: 'https://cdn.freesound.org/previews/391/391658_7368311-lq.mp3',     // chips (louder)
  allIn: 'https://cdn.freesound.org/previews/391/391658_7368311-lq.mp3',     // chips cascade
  win: 'https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3',       // success
  deal: 'https://cdn.freesound.org/previews/240/240776_4284968-lq.mp3',      // card deal
  turn: 'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3',      // notification
};

type SoundType = keyof typeof SOUND_URLS;

export function usePokerSounds() {
  const audioCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const enabled = useRef(true);

  // Preload sounds
  useEffect(() => {
    if (typeof window === 'undefined') return;

    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioCache.current.set(key as SoundType, audio);
    });

    return () => {
      audioCache.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current.clear();
    };
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!enabled.current || typeof window === 'undefined') return;

    const audio = audioCache.current.get(type);
    if (audio) {
      // Clone to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = type === 'raise' || type === 'allIn' ? 0.7 : 0.5;
      clone.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, []);

  const toggleSounds = useCallback((enable: boolean) => {
    enabled.current = enable;
  }, []);

  const isSoundEnabled = useCallback(() => enabled.current, []);

  return {
    playSound,
    toggleSounds,
    isSoundEnabled,
  };
}
