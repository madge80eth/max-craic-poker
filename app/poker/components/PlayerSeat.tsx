'use client';

import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';
import ActionTimer from './ActionTimer';

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  seatIndex: number;
  onSeatClick?: (seatIndex: number) => void;
  lastActionTime?: number;
  actionTimeout?: number;
}

const POSITION_CLASSES: Record<string, string> = {
  'top-left': 'top-2 left-2 sm:top-4 sm:left-8',
  'top-center': 'top-2 left-1/2 -translate-x-1/2 sm:top-4',
  'top-right': 'top-2 right-2 sm:top-4 sm:right-8',
  'bottom-right': 'bottom-28 right-2 sm:bottom-4 sm:right-8',
  'bottom-center': 'bottom-28 left-1/2 -translate-x-1/2 sm:bottom-4',
  'bottom-left': 'bottom-28 left-2 sm:bottom-4 sm:left-8',
};

export default function PlayerSeat({
  player,
  isActive,
  isYou,
  position,
  seatIndex,
  onSeatClick,
  lastActionTime = 0,
  actionTimeout = 30,
}: PlayerSeatProps) {
  const positionClass = POSITION_CLASSES[position];

  if (!player) {
    return (
      <div
        className={`absolute ${positionClass} cursor-pointer z-10`}
        onClick={() => onSeatClick?.(seatIndex)}
      >
        <div className="w-20 h-24 sm:w-24 sm:h-32 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-purple-500 hover:bg-gray-700/50 transition-colors">
          <span className="text-gray-400 text-xs sm:text-sm">Seat {seatIndex + 1}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute ${positionClass} z-10`}>
      <div
        className={`
          w-24 sm:w-28 bg-gray-800 rounded-lg p-1.5 sm:p-2 border-2 transition-all
          ${isActive ? 'border-yellow-400 shadow-lg shadow-yellow-400/30 scale-105' : 'border-gray-600'}
          ${isYou ? 'ring-2 ring-purple-500' : ''}
          ${player.folded ? 'opacity-50' : ''}
        `}
      >
        {/* Timer (when active) */}
        {isActive && (
          <div className="mb-1">
            <ActionTimer
              lastActionTime={lastActionTime}
              timeoutSeconds={actionTimeout}
              isActive={isActive}
            />
          </div>
        )}

        {/* Player Info */}
        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs font-medium truncate text-white">
              {player.name}
              {isYou && <span className="text-purple-400 ml-1">(You)</span>}
            </div>
            <div className="text-[10px] sm:text-xs text-green-400 font-mono">
              {player.chips.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Position Badges */}
        <div className="flex flex-wrap gap-0.5 sm:gap-1 mb-1 sm:mb-2">
          {player.isDealer && (
            <span className="px-1 sm:px-1.5 py-0.5 bg-white text-black text-[8px] sm:text-[10px] font-bold rounded">D</span>
          )}
          {player.isSmallBlind && (
            <span className="px-1 sm:px-1.5 py-0.5 bg-blue-500 text-white text-[8px] sm:text-[10px] font-bold rounded">SB</span>
          )}
          {player.isBigBlind && (
            <span className="px-1 sm:px-1.5 py-0.5 bg-red-500 text-white text-[8px] sm:text-[10px] font-bold rounded">BB</span>
          )}
          {player.allIn && (
            <span className="px-1 sm:px-1.5 py-0.5 bg-yellow-500 text-black text-[8px] sm:text-[10px] font-bold rounded animate-pulse">ALL IN</span>
          )}
          {player.folded && (
            <span className="px-1 sm:px-1.5 py-0.5 bg-gray-500 text-white text-[8px] sm:text-[10px] font-bold rounded">FOLD</span>
          )}
        </div>

        {/* Hole Cards */}
        <div className="flex gap-0.5 sm:gap-1 justify-center">
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
          <div className="mt-1 sm:mt-2 text-center">
            <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs rounded-full">
              Bet: {player.bet}
            </span>
          </div>
        )}

        {/* Last Action */}
        {player.lastAction && !isActive && (
          <div className="mt-0.5 sm:mt-1 text-center">
            <span className="text-[8px] sm:text-[10px] text-gray-400 uppercase">
              {player.lastAction}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
