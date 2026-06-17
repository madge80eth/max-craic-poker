'use client';

import { useEffect, useState } from 'react';
import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';

interface PlayerPlaqueProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: number;
  handNumber: number;
  lastActionTime: number;
  actionTimeout: number;
  onSeatClick?: () => void;
}

const TIMER_R = 28;
const TIMER_CIRC = 2 * Math.PI * TIMER_R;

function getActionBadge(player: ClientPlayer, isActive: boolean): { text: string; color: string } | null {
  if (player.sitOut && !player.folded) return { text: 'Sit Out', color: '#6b7280' };
  if (player.allIn) return { text: 'All In', color: '#dc2626' };
  if (player.folded) return { text: 'Fold', color: '#374151' };
  if (!player.sitOut && player.consecutiveTimeouts >= 2 && !player.folded)
    return { text: `AFK ${player.consecutiveTimeouts}/3`, color: '#dc2626' };
  if (player.lastAction && !isActive) {
    const labels: Record<string, string> = {
      check: 'Check', call: 'Call', raise: 'Raise', fold: 'Fold', allin: 'All In',
    };
    return { text: labels[player.lastAction] || player.lastAction, color: '#22c55e' };
  }
  return null;
}

export default function PlayerPlaque({
  player, isActive, isYou, position, handNumber,
  lastActionTime, actionTimeout, onSeatClick,
}: PlayerPlaqueProps) {
  const [timeLeft, setTimeLeft] = useState(actionTimeout);

  useEffect(() => {
    if (!isActive) { setTimeLeft(actionTimeout); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastActionTime) / 1000);
      setTimeLeft(Math.max(0, actionTimeout - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, lastActionTime, actionTimeout]);

  if (!player) {
    return (
      <div className="player-plaque" data-pos={position}>
        <div
          className={`plaque-empty${onSeatClick ? ' clickable' : ''}`}
          onClick={onSeatClick}
        >
          {onSeatClick ? '+' : ''}
        </div>
      </div>
    );
  }

  const timerPct = (timeLeft / actionTimeout) * 100;
  const isCritical = timeLeft <= 5;
  const isLowTime = timeLeft <= 10;
  const timerColor = isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e';
  const timerDash = (timerPct / 100) * TIMER_CIRC;

  const opacity = player.folded ? 0.4 : player.sitOut ? 0.5 : 1;
  const badge = getActionBadge(player, isActive);
  const betLabel = player.bet >= 1000
    ? `${(player.bet / 1000).toFixed(player.bet % 1000 === 0 ? 0 : 1)}k`
    : player.bet.toString();
  const displayName = player.name.length > 10 ? player.name.slice(0, 9) + '…' : player.name;

  return (
    <div className="player-plaque" data-pos={position} style={{ opacity }}>
      {/* Opponent cards — shown above avatar */}
      {!isYou && !player.folded && (
        <div className="plaque-cards">
          {player.holeCards ? (
            <>
              <Card card={player.holeCards[0]} size="sm" />
              <Card card={player.holeCards[1]} size="sm" />
            </>
          ) : (
            <>
              <div className="plaque-card-back" />
              <div className="plaque-card-back" />
            </>
          )}
        </div>
      )}

      {/* Action badge */}
      {badge && (
        <div className="plaque-badge" style={{ background: badge.color }}>
          {badge.text}
        </div>
      )}

      {/* Avatar with SVG timer ring */}
      <div className="plaque-avatar-wrap">
        <svg className="plaque-timer-svg" viewBox="0 0 62 62">
          {isActive && (
            <>
              <circle cx="31" cy="31" r={TIMER_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="31" cy="31" r={TIMER_R}
                fill="none"
                stroke={timerColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${timerDash} ${TIMER_CIRC}`}
                transform="rotate(-90 31 31)"
              />
            </>
          )}
        </svg>
        <div
          className={`plaque-avatar ${isYou ? 'is-hero' : 'is-opp'}`}
          style={isActive ? { borderColor: timerColor } : undefined}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
        {player.isDealer && <div className="plaque-dealer-btn">D</div>}
        {isActive && (
          <div className="plaque-timer-badge" style={{ background: timerColor }}>
            {timeLeft}
          </div>
        )}
      </div>

      {/* Hero cards — shown below avatar, large and prominent */}
      {isYou && !player.folded && player.holeCards && (
        <div className="plaque-cards" style={{ marginTop: 4 }}>
          <Card key={`plaque-hero-${handNumber}-0`} card={player.holeCards[0]} size="xxl" />
          <Card key={`plaque-hero-${handNumber}-1`} card={player.holeCards[1]} size="xxl" />
        </div>
      )}

      <div className="plaque-name">{displayName}</div>
      <div className="plaque-stack">{player.chips.toLocaleString()}</div>

      {player.bet > 0 && (
        <div className="plaque-bet">
          <div className="pot-chip" />
          {betLabel}
        </div>
      )}
    </div>
  );
}
