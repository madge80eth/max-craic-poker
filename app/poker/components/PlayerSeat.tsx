'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: number; // 0-5 visual position (0 = bottom/hero)
  onSeatClick?: () => void;
  lastActionTime?: number;
  actionTimeout?: number;
  handNumber?: number;
}

// Positions for 6-max table (percentages)
const SEAT_POSITIONS = [
  { top: '78%', left: '50%' },   // 0 - Bottom center (hero)
  { top: '68%', left: '12%' },   // 1 - Bottom left
  { top: '22%', left: '12%' },   // 2 - Top left
  { top: '12%', left: '50%' },   // 3 - Top center
  { top: '22%', left: '88%' },   // 4 - Top right
  { top: '68%', left: '88%' },   // 5 - Bottom right
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
  // Top-half players (positions 2,3,4): badges go below avatar (toward table center)
  // Bottom-half players (positions 0,1,5): badges go above avatar (toward table center)
  const isTopHalf = position >= 2 && position <= 4;
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
        {onSeatClick ? (
          <button
            onClick={onSeatClick}
            className="w-14 h-14 rounded-full bg-gray-800/30 border-2 border-dashed border-gray-600/40 flex items-center justify-center hover:border-emerald-500/50 hover:bg-gray-700/30 transition-all"
          >
            <span className="text-gray-500 text-lg">+</span>
          </button>
        ) : (
          <div className="w-14 h-14 rounded-full bg-gray-800/20 border-2 border-dashed border-gray-700/20" />
        )}
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
      <div className={`relative ${player.folded ? 'opacity-35' : player.sitOut ? 'opacity-50' : ''}`}>
        {/* All-in red glow effect */}
        {player.allIn && !player.folded && (
          <div className="absolute -inset-3 rounded-full bg-red-500/30 animate-pulse blur-md" />
        )}

        {/* Timer ring for active player */}
        {isActive && (
          <svg className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke={isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${timerPercent * 2.95} 295`}
              transform="rotate(-90 50 50)"
              className={isCritical ? 'animate-pulse' : ''}
            />
          </svg>
        )}

        {/* Player avatar */}
        <div
          className={`
            w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-lg relative
            ${isYou
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-400/70'
              : 'bg-gradient-to-br from-gray-600 to-gray-800'
            }
            ${isActive ? 'ring-2 ring-emerald-400 shadow-emerald-400/30' : ''}
            ${player.allIn ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/50' : ''}
          `}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>

        {/* Dealer button - positioned toward table center */}
        {player.isDealer && (
          <div className={`absolute ${isTopHalf ? '-bottom-2 -right-2' : '-top-2 -right-2'}`}>
            <span className="w-5 h-5 rounded-full bg-white text-gray-900 text-[10px] font-black flex items-center justify-center shadow-md">D</span>
          </div>
        )}

        {/* Blind badges - positioned toward table center */}
        {(player.isSmallBlind || player.isBigBlind) && (
          <div className={`absolute ${isTopHalf ? '-bottom-2 -left-2' : '-top-2 -left-2'}`}>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow ${player.isBigBlind ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
              {player.isBigBlind ? 'BB' : 'SB'}
            </span>
          </div>
        )}

        {/* Player info card */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-24">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1.5 text-center border border-gray-700/30">
            <div className="text-[11px] font-semibold text-white truncate">
              {player.name}
              {isYou && <span className="text-purple-400 text-[9px]"> (You)</span>}
            </div>
            <div className="text-xs text-emerald-400 font-bold font-mono">
              {player.chips.toLocaleString()}
            </div>
          </div>

          {/* Bet amount - positioned toward table center */}
          {player.bet > 0 && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="px-3 py-1 bg-yellow-500 text-gray-900 text-sm font-bold rounded-full shadow-lg shadow-yellow-500/20">
                {player.bet.toLocaleString()}
              </span>
            </div>
          )}

          {/* All-in banner - prominent red */}
          {player.allIn && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
              <span className="px-4 py-1 text-[11px] font-black rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse tracking-wider border border-red-400/50">
                ALL IN
              </span>
            </div>
          )}

          {/* Fold badge */}
          {player.folded && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <span className="px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-gray-700 text-gray-400">
                FOLD
              </span>
            </div>
          )}

          {/* Sitting out badge */}
          {player.sitOut && !player.folded && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <span className="px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-orange-600 text-white">
                SITTING OUT
              </span>
            </div>
          )}

          {/* AFK warning badge */}
          {!player.sitOut && player.consecutiveTimeouts >= 2 && !player.folded && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <span className="px-2.5 py-0.5 text-[9px] font-bold rounded-full bg-red-600/80 text-white">
                AFK ({player.consecutiveTimeouts}/3)
              </span>
            </div>
          )}

          {/* Last action */}
          {player.lastAction && !isActive && !player.folded && !player.allIn && !player.sitOut && player.consecutiveTimeouts < 2 && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <span className="text-[9px] text-gray-400 uppercase bg-gray-800/90 px-2 py-0.5 rounded-full border border-gray-700/30">
                {player.lastAction}
              </span>
            </div>
          )}
        </div>

        {/* Hole cards */}
        {!player.folded && (
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.holeCards ? (
              player.holeCards.map((card, i) => (
                <Card
                  key={`${handNumber}-${i}`}
                  card={card}
                  size={isYou ? 'xl' : 'lg'}
                  animate={animateCards ? 'deal' : 'none'}
                  delay={animateCards ? (position * 50) + (i * 25) : 0}
                />
              ))
            ) : (
              <>
                <Card card={null} faceDown size="md" />
                <Card card={null} faceDown size="md" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
