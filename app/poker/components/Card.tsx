'use client';

import { Card as CardType } from '@/lib/poker/types';

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animate?: 'deal' | 'flip' | 'none';
  delay?: number;
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

const SIZE_CLASSES = {
  xs: 'w-6 h-9 text-[8px] rounded',
  sm: 'w-8 h-12 text-[10px] rounded-md',
  md: 'w-11 h-16 text-xs rounded-lg',
  lg: 'w-14 h-20 text-sm rounded-xl',
};

const RANK_DISPLAY: Record<string, string> = {
  'T': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
};

export default function Card({ card, faceDown, size = 'md', animate = 'none', delay = 0 }: CardProps) {
  const sizeClass = SIZE_CLASSES[size];

  const getAnimationClass = () => {
    if (animate === 'deal') return 'animate-card-deal';
    if (animate === 'flip') return 'animate-card-flip';
    return '';
  };

  const animationStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  // Face down card
  if (faceDown || !card) {
    return (
      <div
        className={`${sizeClass} ${getAnimationClass()} relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-lg border border-slate-600/50 flex items-center justify-center overflow-hidden`}
        style={animationStyle}
      >
        {/* Pattern */}
        <div className="absolute inset-1 rounded border border-slate-500/30 bg-gradient-to-br from-emerald-900/30 to-emerald-800/20" />
        <div className="absolute inset-2 rounded-sm border border-emerald-500/20" />
        <span className="relative text-emerald-400/60 text-lg">♠</span>
      </div>
    );
  }

  const rankDisplay = RANK_DISPLAY[card.rank] || card.rank;
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = SUIT_COLORS[card.suit];
  const isRed = card.suit === 'h' || card.suit === 'd';

  return (
    <div
      className={`${sizeClass} ${getAnimationClass()} relative bg-white shadow-lg border border-gray-200 flex flex-col p-0.5 overflow-hidden`}
      style={animationStyle}
    >
      {/* Top left rank/suit */}
      <div className={`flex flex-col items-center leading-none ${colorClass}`}>
        <span className="font-bold">{rankDisplay}</span>
        <span className="-mt-0.5">{suitSymbol}</span>
      </div>

      {/* Center suit */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
        <span className={`${size === 'xs' ? 'text-lg' : size === 'sm' ? 'text-xl' : size === 'md' ? 'text-2xl' : 'text-3xl'} opacity-90`}>
          {suitSymbol}
        </span>
      </div>
    </div>
  );
}
