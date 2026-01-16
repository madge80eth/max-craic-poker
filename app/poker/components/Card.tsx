'use client';

import { Card as CardType } from '@/lib/poker/types';

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  small?: boolean;
  animate?: 'deal' | 'flip' | 'none';
  delay?: number; // Animation delay in ms
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  h: 'text-red-500',
  d: 'text-red-500',
  c: 'text-gray-900',
  s: 'text-gray-900',
};

const RANK_DISPLAY: Record<string, string> = {
  'T': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
};

export default function Card({ card, faceDown, small, animate = 'none', delay = 0 }: CardProps) {
  const baseClasses = small
    ? 'w-8 h-12 rounded text-xs'
    : 'w-12 h-16 rounded-lg text-sm';

  // Animation classes
  const getAnimationClass = () => {
    if (animate === 'deal') return 'animate-card-deal';
    if (animate === 'flip') return 'animate-card-flip';
    return '';
  };

  const animationStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  if (faceDown || !card) {
    return (
      <div
        className={`${baseClasses} ${getAnimationClass()} bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 shadow-lg flex items-center justify-center`}
        style={animationStyle}
      >
        <div className="w-3/4 h-3/4 border border-blue-400 rounded opacity-50" />
      </div>
    );
  }

  const rankDisplay = RANK_DISPLAY[card.rank] || card.rank;
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = SUIT_COLORS[card.suit];

  return (
    <div
      className={`${baseClasses} ${getAnimationClass()} bg-white border-2 border-gray-300 shadow-lg flex flex-col items-center justify-between p-1`}
      style={animationStyle}
    >
      <div className={`font-bold ${colorClass} self-start`}>
        {rankDisplay}
      </div>
      <div className={`text-xl ${colorClass}`}>
        {suitSymbol}
      </div>
      <div className={`font-bold ${colorClass} self-end rotate-180`}>
        {rankDisplay}
      </div>
    </div>
  );
}
