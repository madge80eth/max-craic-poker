'use client';

import { Card as CardType } from '@/lib/poker/types';

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animate?: 'deal' | 'flip' | 'none';
  delay?: number;
  highlight?: boolean;
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const SUIT_COLORS: Record<string, { text: string; bg: string }> = {
  h: { text: 'text-red-500', bg: 'bg-red-500' },
  d: { text: 'text-blue-500', bg: 'bg-blue-500' },
  c: { text: 'text-emerald-600', bg: 'bg-emerald-600' },
  s: { text: 'text-gray-900', bg: 'bg-gray-900' },
};

const SIZE_CLASSES = {
  xs: { container: 'w-7 h-10', text: 'text-[9px]', suit: 'text-sm', corner: 'text-[7px]' },
  sm: { container: 'w-9 h-13', text: 'text-[10px]', suit: 'text-base', corner: 'text-[8px]' },
  md: { container: 'w-12 h-[68px]', text: 'text-xs', suit: 'text-xl', corner: 'text-[10px]' },
  lg: { container: 'w-16 h-[88px]', text: 'text-sm', suit: 'text-2xl', corner: 'text-xs' },
};

const RANK_DISPLAY: Record<string, string> = {
  'T': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
};

export default function Card({
  card,
  faceDown,
  size = 'md',
  animate = 'none',
  delay = 0,
  highlight = false,
}: CardProps) {
  const sizeClass = SIZE_CLASSES[size];

  const getAnimationClass = () => {
    if (animate === 'deal') return 'animate-card-deal';
    if (animate === 'flip') return 'animate-card-flip';
    return '';
  };

  const animationStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  // Face down card - premium back design
  if (faceDown || !card) {
    return (
      <div
        className={`
          ${sizeClass.container} ${getAnimationClass()}
          relative rounded-lg overflow-hidden
          bg-gradient-to-br from-gray-800 via-gray-900 to-black
          shadow-lg border border-gray-700/50
          ${highlight ? 'ring-2 ring-yellow-400/50 shadow-yellow-400/20' : ''}
        `}
        style={animationStyle}
      >
        {/* Card back pattern */}
        <div className="absolute inset-1 rounded border border-emerald-500/20">
          <div className="absolute inset-0.5 rounded bg-gradient-to-br from-emerald-900/40 to-emerald-800/20" />
          {/* Diamond pattern */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 40 60" preserveAspectRatio="none">
              <pattern id="cardPattern" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M4 0L8 4L4 8L0 4Z" fill="currentColor" className="text-emerald-500" />
              </pattern>
              <rect width="40" height="60" fill="url(#cardPattern)" />
            </svg>
          </div>
        </div>
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-emerald-400/40 text-lg font-bold">♠</span>
        </div>
      </div>
    );
  }

  const rankDisplay = RANK_DISPLAY[card.rank] || card.rank;
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colors = SUIT_COLORS[card.suit];

  return (
    <div
      className={`
        ${sizeClass.container} ${getAnimationClass()}
        relative rounded-lg overflow-hidden
        bg-white
        shadow-lg border border-gray-200
        ${highlight ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30' : ''}
      `}
      style={animationStyle}
    >
      {/* Card content */}
      <div className="absolute inset-0 p-0.5 flex flex-col">
        {/* Top left corner */}
        <div className={`flex flex-col items-center leading-none ${colors.text}`}>
          <span className={`${sizeClass.corner} font-bold`}>{rankDisplay}</span>
          <span className={`${sizeClass.corner} -mt-0.5`}>{suitSymbol}</span>
        </div>

        {/* Center suit - large */}
        <div className={`flex-1 flex items-center justify-center ${colors.text}`}>
          <span className={`${sizeClass.suit} opacity-90`}>{suitSymbol}</span>
        </div>

        {/* Bottom right corner (inverted) */}
        <div className={`flex flex-col items-center leading-none rotate-180 ${colors.text}`}>
          <span className={`${sizeClass.corner} font-bold`}>{rankDisplay}</span>
          <span className={`${sizeClass.corner} -mt-0.5`}>{suitSymbol}</span>
        </div>
      </div>

      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
