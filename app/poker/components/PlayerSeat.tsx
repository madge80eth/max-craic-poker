'use client';

import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  seatIndex: number;
  onSeatClick?: (seatIndex: number) => void;
}

const POSITION_CLASSES: Record<string, string> = {
  'top-left': 'top-4 left-8',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-8',
  'bottom-right': 'bottom-4 right-8',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-8',
};

export default function PlayerSeat({
  player,
  isActive,
  isYou,
  position,
  seatIndex,
  onSeatClick,
}: PlayerSeatProps) {
  const positionClass = POSITION_CLASSES[position];

  if (!player) {
    return (
      <div
        className={`absolute ${positionClass} cursor-pointer`}
        onClick={() => onSeatClick?.(seatIndex)}
      >
        <div className="w-24 h-32 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-purple-500 hover:bg-gray-700/50 transition-colors">
          <span className="text-gray-400 text-sm">Seat {seatIndex + 1}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute ${positionClass}`}>
      <div
        className={`
          w-28 bg-gray-800 rounded-lg p-2 border-2 transition-all
          ${isActive ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600'}
          ${isYou ? 'ring-2 ring-purple-500' : ''}
          ${player.folded ? 'opacity-50' : ''}
        `}
      >
        {/* Player Info */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate text-white">
              {player.name}
              {isYou && <span className="text-purple-400 ml-1">(You)</span>}
            </div>
            <div className="text-xs text-green-400 font-mono">
              {player.chips.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Position Badges */}
        <div className="flex gap-1 mb-2">
          {player.isDealer && (
            <span className="px-1.5 py-0.5 bg-white text-black text-[10px] font-bold rounded">D</span>
          )}
          {player.isSmallBlind && (
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded">SB</span>
          )}
          {player.isBigBlind && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">BB</span>
          )}
          {player.allIn && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">ALL IN</span>
          )}
          {player.folded && (
            <span className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] font-bold rounded">FOLD</span>
          )}
        </div>

        {/* Hole Cards */}
        <div className="flex gap-1 justify-center">
          {player.holeCards ? (
            player.holeCards.map((card, i) => (
              <Card key={i} card={card} small />
            ))
          ) : !player.folded ? (
            <>
              <Card card={null} faceDown small />
              <Card card={null} faceDown small />
            </>
          ) : null}
        </div>

        {/* Current Bet */}
        {player.bet > 0 && (
          <div className="mt-2 text-center">
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
              Bet: {player.bet}
            </span>
          </div>
        )}

        {/* Last Action */}
        {player.lastAction && (
          <div className="mt-1 text-center">
            <span className="text-[10px] text-gray-400 uppercase">
              {player.lastAction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
