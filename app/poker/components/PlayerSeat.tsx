'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: number; // 0-5 for 6-max
  onSeatClick?: (seatIndex: number) => void;
  lastActionTime?: number;
  actionTimeout?: number;
  handNumber?: number;
}

// Positions for 6-max table (percentages from center)
const SEAT_POSITIONS = [
  { top: '75%', left: '50%' },   // 0 - Bottom center (hero)
  { top: '65%', left: '15%' },   // 1 - Bottom left
  { top: '25%', left: '15%' },   // 2 - Top left
  { top: '15%', left: '50%' },   // 3 - Top center
  { top: '25%', left: '85%' },   // 4 - Top right
  { top: '65%', left: '85%' },   // 5 - Bottom right
];

export default function PlayerSeat({
  player,
  isActive,
  isYou,
  position,
  onSeatClick,
  lastActionTime = 0,
  actionTimeout = 30,
  handNumber = 0,
}: PlayerSeatProps) {
  const pos = SEAT_POSITIONS[position];
  const prevHandNumberRef = useRef(handNumber);
  const [animateCards, setAnimateCards] = useState(false);
  const [timeLeft, setTimeLeft] = useState(actionTimeout);

  // Timer for active player
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(actionTimeout);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - lastActionTime) / 1000);
      setTimeLeft(Math.max(0, actionTimeout - elapsed));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isActive, lastActionTime, actionTimeout]);

  // Card animation on new hand
  useEffect(() => {
    if (handNumber !== prevHandNumberRef.current && player?.holeCards) {
      setAnimateCards(true);
      prevHandNumberRef.current = handNumber;
      const timeout = setTimeout(() => setAnimateCards(false), 600);
      return () => clearTimeout(timeout);
    }
    prevHandNumberRef.current = handNumber;
  }, [handNumber, player?.holeCards]);

  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ top: pos.top, left: pos.left }}
      >
        <button
          onClick={() => onSeatClick?.(position)}
          className="w-16 h-16 rounded-full bg-gray-800/40 border-2 border-dashed border-gray-600/50 flex items-center justify-center hover:border-emerald-500/50 hover:bg-gray-700/40 transition-all"
        >
          <span className="text-gray-500 text-xs">+</span>
        </button>
      </div>
    );
  }

  const timerPercent = (timeLeft / actionTimeout) * 100;
  const isLowTime = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className={`relative ${player.folded ? 'opacity-40' : ''}`}>
        {/* Timer ring for active player */}
        {isActive && (
          <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke={isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${timerPercent * 3.02} 302`}
              transform="rotate(-90 50 50)"
              className={isCritical ? 'animate-pulse' : ''}
            />
          </svg>
        )}

        {/* Player avatar */}
        <div
          className={`
            w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold
            ${isYou
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-400'
              : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }
            ${isActive ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/30' : ''}
          `}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>

        {/* Position badges */}
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          {player.isDealer && (
            <span className="w-5 h-5 rounded-full bg-white text-gray-900 text-[10px] font-bold flex items-center justify-center shadow">D</span>
          )}
        </div>

        {/* Blind badges */}
        {(player.isSmallBlind || player.isBigBlind) && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${player.isBigBlind ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
              {player.isBigBlind ? 'BB' : 'SB'}
            </span>
          </div>
        )}

        {/* Player info card */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-20">
          {/* Name and chips */}
          <div className="bg-gray-900/90 backdrop-blur rounded-lg px-2 py-1 text-center">
            <div className="text-[10px] font-medium text-white truncate">
              {player.name}
              {isYou && <span className="text-purple-400"> (You)</span>}
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">
              {player.chips.toLocaleString()}
            </div>
          </div>

          {/* Bet amount */}
          {player.bet > 0 && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="px-2 py-0.5 bg-yellow-500 text-gray-900 text-[10px] font-bold rounded-full shadow">
                {player.bet.toLocaleString()}
              </span>
            </div>
          )}

          {/* Status badges */}
          {(player.allIn || player.folded) && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <span className={`px-2 py-0.5 text-[8px] font-bold rounded ${
                player.allIn ? 'bg-yellow-500 text-gray-900 animate-pulse' : 'bg-gray-600 text-gray-300'
              }`}>
                {player.allIn ? 'ALL IN' : 'FOLD'}
              </span>
            </div>
          )}

          {/* Last action */}
          {player.lastAction && !isActive && !player.folded && !player.allIn && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <span className="text-[8px] text-gray-400 uppercase bg-gray-800/80 px-1.5 py-0.5 rounded">
                {player.lastAction}
              </span>
            </div>
          )}
        </div>

        {/* Hole cards */}
        {!player.folded && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.holeCards ? (
              player.holeCards.map((card, i) => (
                <Card
                  key={`${handNumber}-${i}`}
                  card={card}
                  size="xs"
                  animate={animateCards ? 'deal' : 'none'}
                  delay={animateCards ? (position * 50) + (i * 25) : 0}
                />
              ))
            ) : (
              <>
                <Card card={null} faceDown size="xs" />
                <Card card={null} faceDown size="xs" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
