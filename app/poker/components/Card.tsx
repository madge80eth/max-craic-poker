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
  sm: 60,
  md: 76,
  lg: 92,
  xl: 112,
};

function toCardString(card: CardType): string {
  return `${card.rank}${card.suit}`;
}

export default function Card({ card, faceDown, size = 'md', animate = 'none', delay = 0 }: CardProps) {
  const height = SIZE_HEIGHTS[size];

  const animClass = animate === 'deal' ? 'animate-card-deal' : animate === 'flip' ? 'animate-card-flip' : '';
  const animStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  if (faceDown || !card) {
    return (
      <div className={animClass} style={animStyle}>
        <PlayingCard back height={height} />
      </div>
    );
  }

  return (
    <div className={animClass} style={animStyle}>
      <PlayingCard card={toCardString(card)} height={height} />
    </div>
  );
}
