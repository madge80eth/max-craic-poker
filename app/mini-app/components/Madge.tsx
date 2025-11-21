'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface MadgeProps {
  isDealing?: boolean;
  message?: string;
}

export default function Madge({ isDealing = false, message }: MadgeProps) {
  const [bobOffset, setBobOffset] = useState(0);

  // Subtle bobbing animation when idle
  useEffect(() => {
    if (isDealing) {
      setBobOffset(0);
      return;
    }

    const interval = setInterval(() => {
      const time = Date.now() / 1000;
      setBobOffset(Math.sin(time * 2) * 2); // Gentle 2px bob
    }, 50);

    return () => clearInterval(interval);
  }, [isDealing]);

  return (
    <div className="flex flex-col items-center">
      {/* Madge Character */}
      <div
        className="relative transition-transform duration-200"
        style={{ transform: `translateY(${bobOffset}px)` }}
      >
        <Image
          src={isDealing ? '/madge-dealing.png' : '/madge-idle.png'}
          alt="Madge the dealer"
          width={100}
          height={100}
          className="rounded-xl"
          priority
        />
      </div>

      {/* Speech Bubble */}
      {message && (
        <div className="mt-3 relative">
          {/* Bubble Pointer */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent border-b-white/20"></div>

          {/* Bubble */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl px-4 py-2 border border-white/20 max-w-xs">
            <p className="text-white text-center text-sm">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
