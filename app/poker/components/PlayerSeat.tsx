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

// Desktop positions - spread out for larger screens (percentages)
const SEAT_POSITIONS_DESKTOP = [
  { top: '78%', left: '50%' },   // 0 - Bottom center (hero)
  { top: '68%', left: '12%' },   // 1 - Bottom left
  { top: '22%', left: '12%' },   // 2 - Top left
  { top: '12%', left: '50%' },   // 3 - Top center
  { top: '22%', left: '88%' },   // 4 - Top right
  { top: '68%', left: '88%' },   // 5 - Bottom right
];

// Mobile positions — pixel values for 360x500 canvas
// Matches reference HTML exactly. All seats use transform: translate(-50%, -50%)
const SEAT_POSITIONS_MOBILE = [
  { top: 440, left: 180 },  // 0 - Hero (bottom center) — ref seat-3
  { top: 270, left: 45 },   // 1 - Bottom left          — ref seat-4
  { top: 105, left: 45 },   // 2 - Top left              — ref seat-5
  { top: 45, left: 180 },   // 3 - Top center            — ref seat-0
  { top: 105, left: 315 },  // 4 - Top right             — ref seat-1
  { top: 270, left: 315 },  // 5 - Bottom right          — ref seat-2
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 500);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Timer computations (shared by both renders)
  const timerPercent = (timeLeft / actionTimeout) * 100;
  const isLowTime = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  // ========== MOBILE RENDER ==========
  if (isMobile) {
    const mPos = SEAT_POSITIONS_MOBILE[position];

    // Empty seat (mobile) — ref: dashed border, transparent bg, + sign
    if (!player) {
      return (
        <div style={{
          position: 'absolute', left: mPos.left, top: mPos.top,
          transform: 'translate(-50%, -50%)', zIndex: 10,
        }}>
          {onSeatClick ? (
            <button
              onClick={onSeatClick}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'transparent',
                border: '2px dashed #4b5563',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: 18,
              }}
            >
              +
            </button>
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'transparent',
              border: '2px dashed #4b5563',
            }} />
          )}
        </div>
      );
    }

    // Occupied seat (mobile) — column: badge → avatar → name → chips → cards → bet
    return (
      <div style={{
        position: 'absolute', left: mPos.left, top: mPos.top,
        transform: 'translate(-50%, -50%)', zIndex: 10,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative',
          opacity: player.folded ? 0.35 : player.sitOut ? 0.5 : 1,
        }}>
          {/* All-in glow */}
          {player.allIn && !player.folded && (
            <div className="animate-pulse" style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              background: 'rgba(239,68,68,0.3)', filter: 'blur(8px)',
            }} />
          )}

          {/* Hero cards — positioned ABOVE avatar (ref: top:-54px absolute) */}
          {isYou && !player.folded && (
            <div style={{
              position: 'absolute',
              top: -54,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 5,
              zIndex: 20,
            }}>
              {player.holeCards ? (
                <>
                  <Card
                    key={`${handNumber}-0`}
                    card={player.holeCards[0]}
                    size="sm"
                    animate={animateCards ? 'deal' : 'none'}
                    delay={animateCards ? position * 50 : 0}
                  />
                  <Card
                    key={`${handNumber}-1`}
                    card={player.holeCards[1]}
                    size="sm"
                    animate={animateCards ? 'deal' : 'none'}
                    delay={animateCards ? position * 50 + 25 : 0}
                  />
                </>
              ) : null}
            </div>
          )}

          {/* Badge — ref: 9px, padding 1px 5px, border-radius 3px, margin-bottom 2px */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 2, minHeight: 14, alignItems: 'center' }}>
            {player.isDealer && (
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'white', color: '#000', fontSize: 9,
                fontWeight: 700, display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>D</span>
            )}
            {(player.isSmallBlind || player.isBigBlind) && (
              <span style={{
                padding: '1px 5px', borderRadius: 3, fontSize: 9,
                fontWeight: 700, color: '#fff',
                background: player.isBigBlind ? '#ef4444' : '#3b82f6',
              }}>
                {player.isBigBlind ? 'BB' : 'SB'}
              </span>
            )}
          </div>

          {/* Timer ring + Avatar (ref: 36x36) */}
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            {isActive && (
              <svg style={{ position: 'absolute', inset: -4, width: 44, height: 44 }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="47" fill="none"
                  stroke={isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e'}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${timerPercent * 2.95} 295`}
                  transform="rotate(-90 50 50)"
                  className={isCritical ? 'animate-pulse' : ''}
                />
              </svg>
            )}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16,
              background: isYou ? '#7c3aed' : '#374151',
              color: isYou ? '#fff' : '#9ca3af',
              border: isYou
                ? '2px solid #8b5cf6'
                : isActive ? '2px solid #22c55e'
                : player.allIn ? '2px solid #ef4444'
                : '2px solid #22c55e',
              boxShadow: isActive
                ? '0 0 12px rgba(52,211,153,0.4)'
                : player.allIn ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
            }}>
              {player.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Name — ref: 10px, max-width 60px, color #d1d5db */}
          <span style={{
            fontSize: 10, color: '#d1d5db', marginTop: 2,
            maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', textAlign: 'center', display: 'block',
          }}>
            {player.name}
          </span>

          {/* Chips — ref: 10px, color #4ade80, font-weight 600 */}
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>
            {player.chips.toLocaleString()}
          </span>

          {/* Opponent hole cards — ref: gap 2px, below chips */}
          {!isYou && !player.folded && (
            <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
              {player.holeCards ? (
                <>
                  <Card
                    key={`${handNumber}-0`}
                    card={player.holeCards[0]}
                    size="xs"
                    animate={animateCards ? 'deal' : 'none'}
                    delay={animateCards ? position * 50 : 0}
                  />
                  <Card
                    key={`${handNumber}-1`}
                    card={player.holeCards[1]}
                    size="xs"
                    animate={animateCards ? 'deal' : 'none'}
                    delay={animateCards ? position * 50 + 25 : 0}
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

          {/* Bet — ref: chip icon 12px + amount text */}
          {player.bet > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: '#f59e0b', border: '1.5px solid #d97706',
              }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24' }}>
                {player.bet.toLocaleString()}
              </span>
            </div>
          )}

          {/* Status badges */}
          {player.allIn && (
            <div className="animate-pulse" style={{
              marginTop: 2, padding: '1px 6px',
              background: '#dc2626', color: 'white',
              fontWeight: 900, borderRadius: 10, fontSize: 7,
              letterSpacing: '0.05em', border: '1px solid rgba(248,113,113,0.5)',
            }}>ALL IN</div>
          )}
          {player.folded && (
            <div style={{
              marginTop: 2, padding: '1px 6px',
              background: '#374151', color: '#9ca3af',
              fontWeight: 700, borderRadius: 10, fontSize: 7,
            }}>FOLD</div>
          )}
          {player.sitOut && !player.folded && (
            <div style={{
              marginTop: 2, padding: '1px 4px',
              background: '#ea580c', color: 'white',
              fontWeight: 700, borderRadius: 10, fontSize: 7,
            }}>SIT OUT</div>
          )}
          {!player.sitOut && player.consecutiveTimeouts >= 2 && !player.folded && (
            <div style={{
              marginTop: 2, padding: '1px 4px',
              background: 'rgba(220,38,38,0.8)', color: 'white',
              fontWeight: 700, borderRadius: 10, fontSize: 7,
            }}>AFK ({player.consecutiveTimeouts}/3)</div>
          )}
          {player.lastAction && !isActive && !player.folded && !player.allIn && !player.sitOut && player.consecutiveTimeouts < 2 && (
            <div style={{
              marginTop: 2, padding: '1px 6px',
              background: 'rgba(31,41,55,0.9)', color: '#9ca3af',
              borderRadius: 10, fontSize: 7, textTransform: 'uppercase' as const,
              border: '1px solid rgba(55,65,81,0.3)',
            }}>{player.lastAction}</div>
          )}
        </div>
      </div>
    );
  }

  // ========== DESKTOP RENDER (unchanged) ==========
  const pos = SEAT_POSITIONS_DESKTOP[position];

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
            w-14 h-14 text-xl rounded-full flex items-center justify-center font-bold shadow-lg relative
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
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg text-center border border-gray-700/30 px-2 py-1.5">
            <div className="font-semibold text-white truncate text-[11px]">
              {player.name}
              {isYou && <span className="text-purple-400 text-[9px]"> (You)</span>}
            </div>
            <div className="text-emerald-400 font-bold font-mono text-xs">
              {player.chips.toLocaleString()}
            </div>
          </div>

          {/* Bet amount */}
          {player.bet > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap -top-8">
              <span className="bg-yellow-500 text-gray-900 font-bold rounded-full shadow-lg shadow-yellow-500/20 px-3 py-1 text-sm">
                {player.bet.toLocaleString()}
              </span>
            </div>
          )}

          {/* All-in banner */}
          {player.allIn && (
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-6">
              <span className="font-black rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse tracking-wider border border-red-400/50 px-4 py-1 text-[11px]">
                ALL IN
              </span>
            </div>
          )}

          {/* Fold badge */}
          {player.folded && (
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-5">
              <span className="font-bold rounded-full bg-gray-700 text-gray-400 px-2.5 py-0.5 text-[9px]">
                FOLD
              </span>
            </div>
          )}

          {/* Sitting out badge */}
          {player.sitOut && !player.folded && (
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-5">
              <span className="font-bold rounded-full bg-orange-600 text-white px-2.5 py-0.5 text-[9px]">
                SITTING OUT
              </span>
            </div>
          )}

          {/* AFK warning badge */}
          {!player.sitOut && player.consecutiveTimeouts >= 2 && !player.folded && (
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-5">
              <span className="font-bold rounded-full bg-red-600/80 text-white px-2.5 py-0.5 text-[9px]">
                AFK ({player.consecutiveTimeouts}/3)
              </span>
            </div>
          )}

          {/* Last action */}
          {player.lastAction && !isActive && !player.folded && !player.allIn && !player.sitOut && player.consecutiveTimeouts < 2 && (
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-5">
              <span className="text-gray-400 uppercase bg-gray-800/90 rounded-full border border-gray-700/30 px-2 py-0.5 text-[9px]">
                {player.lastAction}
              </span>
            </div>
          )}
        </div>

        {/* Hole cards */}
        {!player.folded && (
          <div className="absolute left-1/2 -translate-x-1/2 flex gap-0.5 -bottom-14">
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
