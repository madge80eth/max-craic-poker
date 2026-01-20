'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';
import NeonBadge from '../ui/NeonBadge';
import ChipStack from '../ui/ChipStack';

interface PlayerSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: number;
  onSeatClick?: (seatIndex: number) => void;
  lastActionTime?: number;
  actionTimeout?: number;
  handNumber?: number;
}

// GGPoker-style seat positions (percentages from center)
const SEAT_POSITIONS = [
  { top: '78%', left: '50%' },   // 0 - Bottom center (hero)
  { top: '68%', left: '12%' },   // 1 - Bottom left
  { top: '28%', left: '12%' },   // 2 - Top left
  { top: '12%', left: '50%' },   // 3 - Top center
  { top: '28%', left: '88%' },   // 4 - Top right
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
    const interval = setInterval(updateTimer, 100);
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

  const timerPercent = (timeLeft / actionTimeout) * 100;
  const isLowTime = timeLeft <= 10;
  const isCritical = timeLeft <= 5;
  const circumference = 2 * Math.PI * 32;

  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ top: pos.top, left: pos.left }}
      >
        <button
          onClick={() => onSeatClick?.(position)}
          className="w-16 h-16 rounded-full bg-gray-800/40 border-2 border-dashed border-gray-600/50 flex items-center justify-center hover:border-emerald-500/50 hover:bg-gray-700/40 transition-all group"
        >
          <span className="text-gray-500 text-2xl group-hover:text-emerald-400 transition-colors">+</span>
        </button>
      </div>
    );
  }

  // Get timer color
  const getTimerColor = () => {
    if (isCritical) return '#ef4444';
    if (isLowTime) return '#eab308';
    return '#00ff88';
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className={`relative ${player.folded ? 'opacity-40' : ''}`}>
        {/* Timer ring for active player */}
        {isActive && (
          <div className="absolute -inset-2 flex items-center justify-center">
            <svg
              width="72"
              height="72"
              className={isCritical ? 'animate-pulse' : ''}
              style={{
                filter: `drop-shadow(0 0 8px ${getTimerColor()}50)`,
              }}
            >
              {/* Background ring */}
              <circle
                cx="36"
                cy="36"
                r="32"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              {/* Progress ring */}
              <circle
                cx="36"
                cy="36"
                r="32"
                fill="none"
                stroke={getTimerColor()}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - timerPercent / 100)}
                transform="rotate(-90 36 36)"
                style={{
                  transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease',
                }}
              />
            </svg>
          </div>
        )}

        {/* Player avatar */}
        <div
          className={`
            w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold
            ${isYou
              ? 'bg-gradient-to-br from-purple-400 to-pink-500'
              : 'bg-gradient-to-br from-gray-500 to-gray-700'
            }
            ${isActive ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/40' : ''}
            ${isYou && !isActive ? 'ring-2 ring-purple-400/50' : ''}
            border-2 border-gray-900
            shadow-xl
          `}
        >
          <span className="text-white drop-shadow-lg">
            {player.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Position badges */}
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          {player.isDealer && (
            <span className="w-5 h-5 rounded-full bg-white text-gray-900 text-[10px] font-bold flex items-center justify-center shadow-lg ring-1 ring-gray-900/20">
              D
            </span>
          )}
        </div>

        {/* Blind badges */}
        {(player.isSmallBlind || player.isBigBlind) && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <span className={`
              px-1.5 py-0.5 rounded text-[8px] font-bold shadow-lg
              ${player.isBigBlind
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
              }
            `}>
              {player.isBigBlind ? 'BB' : 'SB'}
            </span>
          </div>
        )}

        {/* Player info card */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-24">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl px-2 py-1.5 text-center border border-gray-700/50 shadow-xl">
            <div className="text-[11px] font-semibold text-white truncate mb-0.5">
              {player.name}
              {isYou && <span className="text-purple-400 ml-1">(You)</span>}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono font-bold">
              {player.chips.toLocaleString()}
            </div>
          </div>

          {/* Bet amount - chip stack */}
          {player.bet > 0 && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <ChipStack amount={player.bet} size="sm" />
            </div>
          )}

          {/* Status badges */}
          {(player.allIn || player.folded) && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <NeonBadge
                variant={player.allIn ? 'gold' : 'gray'}
                size="sm"
                glow={player.allIn}
                pulse={player.allIn}
              >
                {player.allIn ? 'ALL IN' : 'FOLD'}
              </NeonBadge>
            </div>
          )}

          {/* Last action */}
          {player.lastAction && !isActive && !player.folded && !player.allIn && (
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <NeonBadge variant="blue" size="sm">
                {player.lastAction.toUpperCase()}
              </NeonBadge>
            </div>
          )}
        </div>

        {/* Hole cards */}
        {!player.folded && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-0.5">
            {player.holeCards ? (
              player.holeCards.map((card, i) => (
                <Card
                  key={`${handNumber}-${i}`}
                  card={card}
                  size="xs"
                  animate={animateCards ? 'deal' : 'none'}
                  delay={animateCards ? (position * 50) + (i * 30) : 0}
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

        {/* "Your Turn" indicator */}
        {isActive && isYou && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <NeonBadge variant="green" glow pulse>
              YOUR TURN
            </NeonBadge>
          </div>
        )}
      </div>
    </div>
  );
}
