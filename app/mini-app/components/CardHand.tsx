'use client';

import PlayingCard from './PlayingCard';

interface CardHandProps {
  cards: string[];
  isRevealed: boolean;
}

export default function CardHand({ cards, isRevealed }: CardHandProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {cards.map((card, index) => (
        <PlayingCard
          key={`${card}-${index}`}
          card={card}
          index={index}
          isRevealed={isRevealed}
          delay={index * 200} // 200ms stagger between each card
        />
      ))}
    </div>
  );
}
