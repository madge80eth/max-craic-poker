'use client';

import { Card as CardType } from '@/lib/poker/types';
import PlayingCard from '@heruka_urgyen/react-playing-cards/lib/TcN';

interface CardProps {
  card: CardType | null;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: 'deal' | 'flip' | 'none';
  delay?: number;
}

const SIZE_HEIGHTS: Record<string, number> = {
  xs: 44,
  sm: 58,
  md: 72,
  lg: 88,
  xl: 108,
};

function toCardString(card: CardType): string {
  return `${card.rank}${card.suit}`;
}

export default function Card({ card, faceDown, size = 'md', animate = 'none', delay = 0 }: CardProps) {
  const height = SIZE_HEIGHTS[size];

  const animClass = animate === 'deal' ? 'animate-card-deal' : '';
  const animStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  return (
    <div
      className={animClass}
      style={{
        ...animStyle,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {faceDown || !card ? (
        <PlayingCard back height={height} />
      ) : (
        <PlayingCard card={toCardString(card)} height={height} />
      )}
    </div>
  );
}
