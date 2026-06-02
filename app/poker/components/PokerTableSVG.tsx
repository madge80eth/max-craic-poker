'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientPlayer, Card as CardType, GamePhase } from '@/lib/poker/types';
import Card from './Card';

// ─── Canvas ───────────────────────────────────────────────────────────────────
const W = 390;
const H = 650;

// ─── Seat anchor points (x, y) on the 390×650 canvas ─────────────────────────
const SEAT_COORDS: [number, number][] = [
  [195, 580], // 0 – Hero (bottom centre)
  [ 52, 460], // 1 – Left bottom
  [ 52, 220], // 2 – Left top
  [195, 105], // 3 – Top centre
  [338, 220], // 4 – Right top
  [338, 460], // 5 – Right bottom
];

// Unit-vector from each seat toward the pot (195, 285), scaled to 40px
// Keeps bet chips visually between the player and the pot.
const BET_OFFSETS: [number, number][] = [
  [  0, -40], // 0 – straight up
  [ 24, -29], // 1 – right + up
  [ 32,  14], // 2 – right + down
  [  0,  40], // 3 – straight down
  [-32,  14], // 4 – left + down
  [-24, -29], // 5 – left + up
];

// ─── Community cards ──────────────────────────────────────────────────────────
// sm card: height=58, width≈41 (aspect 5:7)
const COMM_W  = 42;
const COMM_H  = 58;
const COMM_GAP = 5;
// Total row width = 5×42 + 4×5 = 230.  Centre at x=195 → start x=80.
const COMM_START_X = 195 - (5 * COMM_W + 4 * COMM_GAP) / 2; // 80
const COMM_Y = 311;

// Timer ring geometry
const TIMER_R = 24;
const TIMER_CIRC = 2 * Math.PI * TIMER_R; // ≈150.8

// ─── SVGSeat ──────────────────────────────────────────────────────────────────
interface SVGSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  position: number;   // 0–5 visual position
  phase: GamePhase;
  handNumber: number;
  lastActionTime: number;
  actionTimeout: number;
  onSeatClick?: () => void;
}

function SVGSeat({
  player, isActive, isYou, position, handNumber,
  lastActionTime, actionTimeout, onSeatClick,
}: SVGSeatProps) {
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

  const [cx, cy] = SEAT_COORDS[position];
  const [bx, by] = BET_OFFSETS[position];

  const timerPct   = (timeLeft / actionTimeout) * 100;
  const isCritical = timeLeft <= 5;
  const isLowTime  = timeLeft <= 10;
  const timerColor = isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e';
  const timerDash  = (timerPct / 100) * TIMER_CIRC;

  const opacity = player
    ? player.folded ? 0.4 : player.sitOut ? 0.5 : 1
    : 1;

  const getActionBadge = (): { text: string; fill: string } | null => {
    if (!player) return null;
    if (player.sitOut && !player.folded)
      return { text: 'Sit Out', fill: '#6b7280' };
    if (player.allIn)
      return { text: 'All In', fill: '#dc2626' };
    if (player.folded)
      return { text: 'Fold', fill: '#374151' };
    if (!player.sitOut && player.consecutiveTimeouts >= 2 && !player.folded)
      return { text: `AFK ${player.consecutiveTimeouts}/3`, fill: '#dc2626' };
    if (player.lastAction && !isActive) {
      const labels: Record<string, string> = {
        check: 'Check', call: 'Call', raise: 'Raise', fold: 'Fold', allin: 'All In',
      };
      return { text: labels[player.lastAction] || player.lastAction, fill: '#22c55e' };
    }
    return null;
  };

  // ── Empty seat ──────────────────────────────────────────────────────────────
  if (!player) {
    return (
      <g
        transform={`translate(${cx}, ${cy})`}
        onClick={onSeatClick}
        style={{ cursor: onSeatClick ? 'pointer' : 'default' }}
      >
        <circle
          r="22"
          fill="rgba(255,255,255,0.03)"
          stroke={onSeatClick ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        {onSeatClick && (
          <text x="0" y="5.5" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="18" fontWeight="bold">+</text>
        )}
      </g>
    );
  }

  const badge = getActionBadge();
  const avatarFill   = isYou ? 'url(#heroGrad)' : 'url(#oppGrad)';
  const avatarStroke = isActive ? timerColor : 'rgba(255,255,255,0.18)';

  // Bet label — abbreviate large amounts
  const betLabel = player.bet >= 1000
    ? `${(player.bet / 1000).toFixed(player.bet % 1000 === 0 ? 0 : 1)}k`
    : player.bet.toString();

  // Name — truncate at 8 chars
  const displayName = player.name.length > 8 ? player.name.slice(0, 7) + '…' : player.name;

  return (
    <g transform={`translate(${cx}, ${cy})`} opacity={opacity}>

      {/* ── Timer ring ──────────────────────────────────────────────────────── */}
      {isActive && (
        <>
          <circle r={TIMER_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle
            r={TIMER_R}
            fill="none"
            stroke={timerColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${timerDash} ${TIMER_CIRC}`}
            transform="rotate(-90)"
          />
        </>
      )}

      {/* ── Avatar circle ───────────────────────────────────────────────────── */}
      <circle
        r="20"
        fill={avatarFill}
        stroke={avatarStroke}
        strokeWidth={isActive ? 2 : 1.5}
      />
      <text x="0" y="5" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
        {player.name.charAt(0).toUpperCase()}
      </text>

      {/* ── Timer seconds badge ─────────────────────────────────────────────── */}
      {isActive && (
        <g transform="translate(14, -14)">
          <circle r="9" fill={timerColor} />
          <text x="0" y="3.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            {timeLeft}
          </text>
        </g>
      )}

      {/* ── Dealer button ───────────────────────────────────────────────────── */}
      {player.isDealer && (
        <g transform="translate(16, 16)">
          <circle r="7" fill="white" />
          <text x="0" y="3.5" textAnchor="middle" fill="black" fontSize="7" fontWeight="900">D</text>
        </g>
      )}

      {/* ── Name plate ──────────────────────────────────────────────────────── */}
      <rect x="-36" y="24" width="72" height="14" rx="3" fill="rgba(0,0,0,0.72)" />
      <text x="0" y="34.5" textAnchor="middle" fill="#e5e7eb" fontSize="9" fontWeight="500">
        {displayName}
      </text>

      {/* ── Chip count ──────────────────────────────────────────────────────── */}
      <text x="0" y="48" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold">
        {player.chips.toLocaleString()}
      </text>

      {/* ── SB / BB badge ───────────────────────────────────────────────────── */}
      {(player.isSmallBlind || player.isBigBlind) && !player.isDealer && (
        <g transform="translate(22, 26)">
          <rect x="-8" y="-6" width="16" height="12" rx="3"
            fill={player.isBigBlind ? '#ef4444' : '#3b82f6'} />
          <text x="0" y="2.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
            {player.isBigBlind ? 'BB' : 'SB'}
          </text>
        </g>
      )}

      {/* ── Action badge (above avatar) ─────────────────────────────────────── */}
      {badge && (
        <g>
          <rect x="-26" y="-47" width="52" height="14" rx="3" fill={badge.fill} />
          <text x="0" y="-37" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
            {badge.text}
          </text>
        </g>
      )}

      {/* ── Hole cards for non-hero players ─────────────────────────────────── */}
      {!isYou && !player.folded && (
        player.holeCards ? (
          <>
            <foreignObject x="-33" y="-68" width="32" height="44">
              <div>
                <Card card={player.holeCards[0]} size="xs" />
              </div>
            </foreignObject>
            <foreignObject x="1" y="-68" width="32" height="44">
              <div>
                <Card card={player.holeCards[1]} size="xs" />
              </div>
            </foreignObject>
          </>
        ) : (
          <>
            <rect x="-19" y="-54" width="16" height="22" rx="2"
              fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="1" />
            <rect x="-1" y="-54" width="16" height="22" rx="2"
              fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="1" />
          </>
        )
      )}

      {/* ── Bet chip (positioned toward pot centre) ─────────────────────────── */}
      {player.bet > 0 && (
        <g transform={`translate(${bx}, ${by})`}>
          <circle r="11" fill="url(#chipGrad)" stroke="#b45309" strokeWidth="1" />
          <text x="0" y="3.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
            {betLabel}
          </text>
        </g>
      )}

    </g>
  );
}

// ─── PokerTableSVG ────────────────────────────────────────────────────────────
export interface PokerTableSVGProps {
  players: ClientPlayer[];
  communityCards: CardType[];
  pot: number;
  phase: GamePhase;
  yourSeatIndex: number | null;
  activePlayerIndex: number;
  latestRevealedIndex: number | null;
  handNumber: number;
  lastActionTime: number;
  actionTimeout: number;
  onSeatClick?: (seatIndex: number) => void;
}

export default function PokerTableSVG({
  players, communityCards, pot, phase, yourSeatIndex, activePlayerIndex,
  latestRevealedIndex, handNumber, lastActionTime, actionTimeout, onSeatClick,
}: PokerTableSVGProps) {
  const getPlayerBySeat = (si: number) => players.find(p => p.seatIndex === si) || null;

  const getVisualPos = (si: number): number => {
    if (yourSeatIndex === null || yourSeatIndex === undefined) return si;
    return ((si - yourSeatIndex) % 6 + 6) % 6;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Felt gradient */}
        <radialGradient id="feltGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#1a6b3c" />
          <stop offset="60%"  stopColor="#0d4f2b" />
          <stop offset="100%" stopColor="#0a3d22" />
        </radialGradient>
        {/* Hero avatar gradient */}
        <radialGradient id="heroGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        {/* Opponent avatar gradient */}
        <radialGradient id="oppGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#4b5563" />
          <stop offset="100%" stopColor="#374151" />
        </radialGradient>
        {/* Bet chip gradient */}
        <radialGradient id="chipGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        {/* Table drop shadow */}
        <filter id="tableShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="black" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Background */}
      <rect width={W} height={H} fill="#0a0c10" />

      {/* Oval table */}
      <ellipse
        cx="195" cy="340" rx="160" ry="200"
        fill="url(#feltGrad)"
        stroke="#8B6914"
        strokeWidth="6"
        filter="url(#tableShadow)"
      />
      {/* Inner rail accent */}
      <ellipse
        cx="195" cy="340" rx="155" ry="195"
        fill="none"
        stroke="#5a4510"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* ── Pot pill ────────────────────────────────────────────────────────── */}
      {pot > 0 && (
        <g transform="translate(195, 285)">
          <rect x="-38" y="-11" width="76" height="22" rx="11" fill="rgba(0,0,0,0.65)" />
          <circle r="5" cx="-22" cy="0" fill="url(#chipGrad)" />
          <text x="-14" y="4" fill="white" fontSize="11" fontWeight="bold">
            {pot.toLocaleString()}
          </text>
        </g>
      )}

      {/* ── Community cards ─────────────────────────────────────────────────── */}
      {Array.from({ length: 5 }).map((_, i) => {
        const card = communityCards[i] ?? null;
        const x = COMM_START_X + i * (COMM_W + COMM_GAP);
        return card ? (
          <foreignObject key={i} x={x} y={COMM_Y} width={COMM_W} height={COMM_H}>
            <div>
              <Card
                card={card}
                size="sm"
                animate={i === latestRevealedIndex ? 'fade' : 'none'}
              />
            </div>
          </foreignObject>
        ) : phase !== 'waiting' ? (
          <rect
            key={i}
            x={x} y={COMM_Y}
            width={COMM_W} height={COMM_H}
            rx={4}
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.08)"
          />
        ) : null;
      })}

      {/* ── Six seats ───────────────────────────────────────────────────────── */}
      {[0, 1, 2, 3, 4, 5].map((seatIndex) => {
        const player   = getPlayerBySeat(seatIndex);
        const visualPos = getVisualPos(seatIndex);
        const isActive = player != null
          && activePlayerIndex !== -1
          && players[activePlayerIndex]?.seatIndex === seatIndex;
        return (
          <SVGSeat
            key={seatIndex}
            player={player}
            isActive={isActive}
            isYou={seatIndex === yourSeatIndex}
            position={visualPos}
            phase={phase}
            handNumber={handNumber}
            lastActionTime={lastActionTime}
            actionTimeout={actionTimeout}
            onSeatClick={onSeatClick ? () => onSeatClick(seatIndex) : undefined}
          />
        );
      })}
    </svg>
  );
}
