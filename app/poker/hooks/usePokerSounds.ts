'use client';

import { useCallback, useRef, useEffect } from 'react';

const SOUND_URLS: Record<string, string> = {
  deal: 'https://cdn.freesound.org/previews/240/240776_4284968-lq.mp3',
  check: 'https://cdn.freesound.org/previews/521/521953_7724592-lq.mp3',
  call: 'https://cdn.freesound.org/previews/521/521953_7724592-lq.mp3',
  fold: 'https://cdn.freesound.org/previews/573/573381_1676145-lq.mp3',
  raise: 'https://cdn.freesound.org/previews/508/508286_6890498-lq.mp3',
  allIn: 'https://cdn.freesound.org/previews/508/508286_6890498-lq.mp3',
};

const SOUND_VOLUMES: Record<string, number> = {
  deal: 0.15,
  check: 0.1,
  call: 0.12,
  fold: 0.08,
  raise: 0.15,
  allIn: 0.18,
  win: 0.12,
  turn: 0.15,
};

type SoundType = 'fold' | 'check' | 'call' | 'raise' | 'allIn' | 'win' | 'deal' | 'turn';

// Synthesized sounds using Web Audio API for turn notification and win chime
function playTurnBeep(volume: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Gentle two-tone beep: short ascending notes
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);

    osc.onended = () => ctx.close();
  } catch {
    // Web Audio API not available
  }
}

function playWinChime(volume: number) {
  try {
    const ctx = new AudioContext();

    // Three-note ascending chime: C5 → E5 → G5
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.start(startTime);
      osc.stop(startTime + 0.4);

      if (i === notes.length - 1) {
        osc.onended = () => ctx.close();
      }
    });
  } catch {
    // Web Audio API not available
  }
}

export function usePokerSounds() {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const enabled = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = SOUND_VOLUMES[key] || 0.1;
      audioCache.current.set(key, audio);
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

    const vol = SOUND_VOLUMES[type] || 0.1;

    // Synthesized sounds for turn and win
    if (type === 'turn') {
      playTurnBeep(vol);
      return;
    }
    if (type === 'win') {
      playWinChime(vol);
      return;
    }

    const audio = audioCache.current.get(type);
    if (audio) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = vol;
      clone.play().catch(() => {});
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
