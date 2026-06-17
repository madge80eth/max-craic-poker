'use client';

import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';

interface MobileMeStripProps {
  player: ClientPlayer | null;
  heroHandName: string | null;
  handNumber: number;
}

export default function MobileMeStrip({ player, heroHandName, handNumber }: MobileMeStripProps) {
  if (!player || player.folded || !player.holeCards) return null;

  const displayName = player.name.length > 12 ? player.name.slice(0, 11) + '…' : player.name;

  return (
    <div className="mobile-me-strip">
      <div className="mobile-me-avatar">
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="mobile-me-info">
        <div className="mobile-me-name">{displayName}</div>
        <div className="mobile-me-stack">{player.chips.toLocaleString()}</div>
        {heroHandName && heroHandName !== 'Uncontested' && (
          <div className="mobile-me-hand-name">{heroHandName}</div>
        )}
      </div>
      {player.isDealer && <div className="mobile-me-dealer">D</div>}
      <div className="mobile-me-cards">
        <Card key={`me-${handNumber}-0`} card={player.holeCards[0]} size="xl" />
        <Card key={`me-${handNumber}-1`} card={player.holeCards[1]} size="xl" />
      </div>
    </div>
  );
}
