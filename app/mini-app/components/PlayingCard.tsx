'use client';

import { useState, useEffect } from 'react';

interface PlayingCardProps {
  card: string; // e.g., "AS" for Ace of Spades
  index: number;
  isRevealed: boolean;
  delay?: number; // ms delay before appearing
}

// Parse card code into display info
function parseCard(code: string): { rank: string; suit: string; symbol: string; color: 'red' | 'black' } {
  const rankMap: Record<string, string> = {
    'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 'T': '10',
    '9': '9', '8': '8', '7': '7', '6': '6', '5': '5',
    '4': '4', '3': '3', '2': '2'
  };
  const suitMap: Record<string, { symbol: string; color: 'red' | 'black' }> = {
    'S': { symbol: '♠', color: 'black' },
    'H': { symbol: '♥', color: 'red' },
    'D': { symbol: '♦', color: 'red' },
    'C': { symbol: '♣', color: 'black' }
  };

  const rank = code[0];
  const suit = code[1];

  return {
    rank: rankMap[rank] || rank,
    suit: suit,
    symbol: suitMap[suit]?.symbol || '?',
    color: suitMap[suit]?.color || 'black'
  };
}

export default function PlayingCard({ card, index, isRevealed, delay = 0 }: PlayingCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const { rank, symbol, color } = parseCard(card);

  useEffect(() => {
    if (isRevealed) {
      // Stagger appearance
      const appearTimer = setTimeout(() => {
        setIsVisible(true);
      }, delay);

      // Flip after appearing
      const flipTimer = setTimeout(() => {
        setIsFlipped(true);
      }, delay + 300);

      return () => {
        clearTimeout(appearTimer);
        clearTimeout(flipTimer);
      };
    }
  }, [isRevealed, delay]);

  return (
    <div
      className={`relative w-14 h-20 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20'
      }`}
      style={{
        perspective: '1000px',
        transitionDelay: `${index * 50}ms`
      }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 border-2 border-purple-400 shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Back Pattern */}
          <div className="absolute inset-1 rounded-md bg-gradient-to-br from-purple-500/30 to-purple-800/30 flex items-center justify-center">
            <div className="w-8 h-12 border-2 border-purple-400/50 rounded flex items-center justify-center">
              <span className="text-purple-300 text-lg font-bold">♠</span>
            </div>
          </div>
        </div>

        {/* Card Front */}
        <div
          className="absolute inset-0 rounded-lg bg-white shadow-lg border border-gray-200"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Top Left Corner */}
          <div className={`absolute top-1 left-1.5 flex flex-col items-center ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
            <span className="text-sm font-bold leading-none">{rank}</span>
            <span className="text-xs leading-none">{symbol}</span>
          </div>

          {/* Center Symbol */}
          <div className={`absolute inset-0 flex items-center justify-center ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
            <span className="text-2xl">{symbol}</span>
          </div>

          {/* Bottom Right Corner (inverted) */}
          <div className={`absolute bottom-1 right-1.5 flex flex-col items-center rotate-180 ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
            <span className="text-sm font-bold leading-none">{rank}</span>
            <span className="text-xs leading-none">{symbol}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
