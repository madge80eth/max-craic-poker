'use client';

import { useState, useEffect } from 'react';

interface MadgeProps {
  isDealing?: boolean;
  message?: string;
}

export default function Madge({ isDealing = false, message }: MadgeProps) {
  const [bobOffset, setBobOffset] = useState(0);

  // Subtle bobbing animation
  useEffect(() => {
    if (isDealing) return; // Don't bob while dealing

    const interval = setInterval(() => {
      setBobOffset(prev => {
        const time = Date.now() / 1000;
        return Math.sin(time * 2) * 3; // Gentle 3px bob
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isDealing]);

  return (
    <div className="flex flex-col items-center">
      {/* Madge Character - Pixel Art Style Dealer */}
      <div
        className={`relative transition-transform duration-200 ${isDealing ? 'scale-110' : ''}`}
        style={{ transform: `translateY(${bobOffset}px)` }}
      >
        {/* Character Container */}
        <div className="relative w-32 h-40">
          {/* Body/Torso - Dealer Vest */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-20 bg-gradient-to-b from-purple-700 to-purple-900 rounded-t-2xl border-2 border-purple-500">
            {/* Vest Details */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-purple-600 to-purple-800 rounded-lg">
              {/* Buttons */}
              <div className="flex flex-col items-center justify-center h-full gap-2 pt-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"></div>
                <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"></div>
              </div>
            </div>
            {/* Collar */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-white rounded-b-lg"></div>
          </div>

          {/* Head */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-b from-amber-200 to-amber-300 rounded-2xl border-2 border-amber-400">
            {/* Hair */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-22 h-8 bg-gradient-to-b from-amber-800 to-amber-900 rounded-t-2xl" style={{ width: '5.5rem' }}></div>

            {/* Dealer Visor */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-18 h-4 bg-gradient-to-b from-green-600 to-green-700 rounded-t-lg border border-green-500" style={{ width: '4.5rem' }}>
              <div className="w-full h-1 bg-green-500/50 rounded-t-lg"></div>
            </div>

            {/* Eyes */}
            <div className="absolute top-8 left-0 w-full flex justify-center gap-4">
              <div className={`w-3 h-3 bg-gray-800 rounded-full ${isDealing ? 'animate-pulse' : ''}`}>
                <div className="w-1 h-1 bg-white rounded-full mt-0.5 ml-0.5"></div>
              </div>
              <div className={`w-3 h-3 bg-gray-800 rounded-full ${isDealing ? 'animate-pulse' : ''}`}>
                <div className="w-1 h-1 bg-white rounded-full mt-0.5 ml-0.5"></div>
              </div>
            </div>

            {/* Smile */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 w-6 h-2 border-b-2 border-gray-700 rounded-b-full"></div>
          </div>

          {/* Arms - Dealing Animation */}
          <div className={`absolute bottom-6 -left-4 w-8 h-4 bg-gradient-to-r from-purple-700 to-purple-800 rounded-full transform origin-right ${isDealing ? 'animate-deal-left' : ''}`}></div>
          <div className={`absolute bottom-6 -right-4 w-8 h-4 bg-gradient-to-l from-purple-700 to-purple-800 rounded-full transform origin-left ${isDealing ? 'animate-deal-right' : ''}`}></div>
        </div>

        {/* Sparkle Effects when dealing */}
        {isDealing && (
          <>
            <div className="absolute -top-2 -left-2 w-3 h-3 text-yellow-400 animate-ping">✦</div>
            <div className="absolute -top-2 -right-2 w-3 h-3 text-yellow-400 animate-ping" style={{ animationDelay: '0.2s' }}>✦</div>
            <div className="absolute top-1/2 -left-4 w-3 h-3 text-purple-400 animate-ping" style={{ animationDelay: '0.4s' }}>✦</div>
            <div className="absolute top-1/2 -right-4 w-3 h-3 text-purple-400 animate-ping" style={{ animationDelay: '0.6s' }}>✦</div>
          </>
        )}
      </div>

      {/* Speech Bubble */}
      {message && (
        <div className="mt-4 relative">
          {/* Bubble Pointer */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white/20"></div>

          {/* Bubble */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl px-6 py-3 border border-white/20 max-w-xs">
            <p className="text-white text-center text-sm font-medium">{message}</p>
          </div>
        </div>
      )}

      {/* CSS for dealing animation */}
      <style jsx>{`
        @keyframes deal-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-30deg); }
        }
        @keyframes deal-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(30deg); }
        }
        .animate-deal-left {
          animation: deal-left 0.3s ease-in-out infinite;
        }
        .animate-deal-right {
          animation: deal-right 0.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
