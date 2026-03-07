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

// Seat positions (percentage based, works at any size)
// Position 0 = bottom center (hero), clockwise from bottom-left
const SEAT_POSITIONS: { top: string; left: string }[] = [
  { top: '82%', left: '50%' },   // 0 - Bottom center (hero)
  { top: '62%', left: '6%' },    // 1 - Left bottom
  { top: '18%', left: '6%' },    // 2 - Left top
  { top: '5%', left: '50%' },    // 3 - Top center
  { top: '18%', left: '94%' },   // 4 - Right top
  { top: '62%', left: '94%' },   // 5 - Right bottom
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
      const timeout = setTimeout(() => setAnimateCards(false), 500);
      return () => clearTimeout(timeout);
    }
    prevHandNumberRef.current = handNumber;
  }, [handNumber, player?.holeCards]);

  const pos = SEAT_POSITIONS[position];
  const timerPercent = (timeLeft / actionTimeout) * 100;
  const isCritical = timeLeft <= 5;
  const isLowTime = timeLeft <= 10;
  const timerColor = isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e';

  // Determine action badge
  const getActionBadge = (): { text: string; bg: string; color: string } | null => {
    if (player?.sitOut && !player.folded) return { text: 'Sit Out', bg: '#6b7280', color: '#fff' };
    if (player?.allIn) return { text: 'All In', bg: '#dc2626', color: '#fff' };
    if (player?.folded) return { text: 'Fold', bg: '#374151', color: '#9ca3af' };
    if (!player?.sitOut && player && player.consecutiveTimeouts >= 2 && !player.folded)
      return { text: `AFK ${player.consecutiveTimeouts}/3`, bg: '#dc2626', color: '#fff' };
    if (player?.lastAction && !isActive) {
      const labels: Record<string, string> = {
        check: 'Check', call: 'Call', raise: 'Raise', fold: 'Fold', allin: 'All In'
      };
      return { text: labels[player.lastAction] || player.lastAction, bg: '#22c55e', color: '#fff' };
    }
    return null;
  };

  // Empty seat
  if (!player) {
    return (
      <div
        className="absolute z-10"
        style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
      >
        {onSeatClick ? (
          <button
            onClick={onSeatClick}
            className="w-10 h-10 rounded-full border-2 border-dashed border-gray-600/50 flex items-center justify-center hover:border-gray-400/60 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="text-gray-500 text-sm">+</span>
          </button>
        ) : (
          <div
            className="w-10 h-10 rounded-full border-2 border-dashed border-gray-700/30"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          />
        )}
      </div>
    );
  }

  const badge = getActionBadge();

  return (
    <div
      className="absolute z-10"
      style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="flex flex-col items-center"
        style={{ opacity: player.folded ? 0.4 : player.sitOut ? 0.5 : 1 }}
      >
        {/* Action badge - above avatar */}
        {badge && (
          <div
            className="mb-1 px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.text}
          </div>
        )}

        {/* Avatar container with timer ring */}
        <div className="relative">
          {/* Timer ring */}
          {isActive && (
            <svg
              className="absolute"
              style={{ top: -4, left: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="4"
              />
              <circle
                cx="50" cy="50" r="46"
                fill="none"
                stroke={timerColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${timerPercent * 2.89} 289`}
                transform="rotate(-90 50 50)"
                className={isCritical ? 'animate-pulse' : ''}
              />
            </svg>
          )}

          {/* Avatar circle */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold relative overflow-hidden"
            style={{
              background: isYou
                ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                : 'linear-gradient(135deg, #374151, #4b5563)',
              border: isActive ? `2px solid ${timerColor}` : '2px solid rgba(255,255,255,0.15)',
              boxShadow: isActive ? `0 0 10px ${timerColor}40` : 'none',
              color: '#fff',
            }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>

          {/* Timer seconds badge (top right of avatar) */}
          {isActive && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{
                background: timerColor,
                color: '#fff',
                boxShadow: `0 0 6px ${timerColor}60`,
              }}
            >
              {timeLeft}
            </div>
          )}

          {/* Dealer button */}
          {player.isDealer && (
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
              style={{
                background: '#fff',
                color: '#000',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              D
            </div>
          )}
        </div>

        {/* Name plate (dark card below avatar) */}
        <div
          className="mt-1 px-2 py-0.5 rounded text-center min-w-[54px]"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="text-[10px] text-gray-200 font-medium truncate max-w-[60px]">
            {player.name}
          </div>
          <div className="text-[10px] text-green-400 font-bold">
            {player.chips.toLocaleString()}
          </div>
        </div>

        {/* Bet chip + amount (shown near player when they have a bet) */}
        {player.bet > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #f59e0b, #d97706)',
                border: '1px solid #b45309',
              }}
            />
            <span className="text-[10px] font-bold text-white">
              {player.bet.toLocaleString()}
            </span>
          </div>
        )}

        {/* Hole cards for non-hero players */}
        {!isYou && !player.folded && (
          <div className="flex gap-0.5 mt-1">
            {player.holeCards ? (
              <>
                <Card
                  key={`${handNumber}-0`}
                  card={player.holeCards[0]}
                  size="xs"
                  animate={animateCards ? 'deal' : 'none'}
                  delay={animateCards ? position * 40 : 0}
                />
                <Card
                  key={`${handNumber}-1`}
                  card={player.holeCards[1]}
                  size="xs"
                  animate={animateCards ? 'deal' : 'none'}
                  delay={animateCards ? position * 40 + 20 : 0}
                />
              </>
            ) : (
              <>
                <Card card={null} faceDown size="xs" />
                <Card card={null} faceDown size="xs" />
              </>
            )}
          </div>
        )}

        {/* Blind badges */}
        {(player.isSmallBlind || player.isBigBlind) && !player.isDealer && (
          <div className="mt-0.5">
            <span
              className="px-1.5 py-0 rounded text-[8px] font-bold text-white"
              style={{ background: player.isBigBlind ? '#ef4444' : '#3b82f6' }}
            >
              {player.isBigBlind ? 'BB' : 'SB'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
