'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientGameState, PlayerAction } from '@/lib/poker/types';
import PlayerSeat from './PlayerSeat';
import Card from './Card';
import ActionBar from './ActionBar';

interface TableProps {
  gameState: ClientGameState;
  onAction: (action: PlayerAction, amount?: number) => void;
  onSeatClick?: (seatIndex: number) => void;
  onStartGame?: () => void;
  onNextHand?: () => void;
}

export default function Table({
  gameState,
  onAction,
  onSeatClick,
  onStartGame,
  onNextHand,
}: TableProps) {
  const { players, communityCards, pot, phase, yourSeatIndex, validActions, winners, config, lastActionTime } = gameState;

  // Keep onNextHand and phase in refs so the timer callback can access latest values
  const onNextHandRef = useRef(onNextHand);
  onNextHandRef.current = onNextHand;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Track animation state
  const prevCommunityCountRef = useRef(0);
  const prevHandNumberRef = useRef(gameState.handNumber);
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());

  // Detect new community cards for animation
  useEffect(() => {
    const prevCount = prevCommunityCountRef.current;
    const currentCount = communityCards.length;

    if (gameState.handNumber !== prevHandNumberRef.current) {
      prevHandNumberRef.current = gameState.handNumber;
      prevCommunityCountRef.current = 0;
      setAnimatingCards(new Set());
      return;
    }

    if (currentCount > prevCount) {
      const newCardIndices = new Set<number>();
      for (let i = prevCount; i < currentCount; i++) {
        newCardIndices.add(i);
      }
      setAnimatingCards(newCardIndices);
      const timeout = setTimeout(() => setAnimatingCards(new Set()), 600);
      prevCommunityCountRef.current = currentCount;
      return () => clearTimeout(timeout);
    }

    prevCommunityCountRef.current = currentCount;
  }, [communityCards.length, gameState.handNumber]);

  // Auto-advance after showdown (3 second delay)
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  const lastShowdownHandRef = useRef<number>(-1);

  useEffect(() => {
    if (phase === 'showdown' && winners && winners.length > 0 && lastShowdownHandRef.current !== gameState.handNumber) {
      lastShowdownHandRef.current = gameState.handNumber;
      setShowWinnerBanner(true);

      const timeout = setTimeout(() => {
        setShowWinnerBanner(false);
        if (phaseRef.current === 'showdown') {
          onNextHandRef.current?.();
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gameState.handNumber]);

  const blindLevel = config.blindLevels[gameState.blindLevel] || config.blindLevels[0];

  const getPlayerBySeat = (seatIndex: number) => {
    return players.find(p => p.seatIndex === seatIndex) || null;
  };

  // Auto-center: rotate seat positions so "you" is always at the bottom
  const getVisualPosition = (seatIndex: number): number => {
    if (yourSeatIndex === null || yourSeatIndex === undefined) return seatIndex;
    return ((seatIndex - yourSeatIndex) % 6 + 6) % 6;
  };

  const yourPlayer = yourSeatIndex !== null ? getPlayerBySeat(yourSeatIndex) : null;
  const showActionBar = yourSeatIndex !== null && yourPlayer && !yourPlayer.folded && !yourPlayer.allIn &&
    phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished';

  // Responsive: detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('xl');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobile(w < 500);
      if (w < 420) setCardSize('sm');
      else if (w < 540) setCardSize('md');
      else if (w < 768) setCardSize('lg');
      else setCardSize('xl');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Card dimensions for desktop placeholders
  const cardDimensions = {
    sm: { width: 43, height: 60 },
    md: { width: 54, height: 76 },
    lg: { width: 66, height: 92 },
    xl: { width: 80, height: 112 },
  };

  // Shared: seats rendering
  const seatsJSX = [0, 1, 2, 3, 4, 5].map((seatIndex) => {
    const player = getPlayerBySeat(seatIndex);
    const isActive = player && gameState.activePlayerIndex !== -1 &&
      players[gameState.activePlayerIndex]?.seatIndex === seatIndex;

    return (
      <PlayerSeat
        key={seatIndex}
        player={player}
        isActive={isActive || false}
        isYou={seatIndex === yourSeatIndex}
        position={getVisualPosition(seatIndex)}
        onSeatClick={phase === 'waiting' ? () => onSeatClick?.(seatIndex) : undefined}
        lastActionTime={lastActionTime}
        actionTimeout={config.actionTimeout}
        handNumber={gameState.handNumber}
      />
    );
  });

  return (
    <div className="relative w-full h-full min-h-0 overflow-visible">
      {/* Container: on mobile it IS the 360x500 canvas; on desktop it fills parent */}
      <div style={isMobile ? {
        position: 'relative',
        width: '100%',
        height: '100%',
      } : {
        position: 'relative',
        width: '100%',
        height: '100%',
      }}>

        {/* Table felt — ref: left:20, top:80, 320x190 */}
        <div
          className="absolute"
          style={isMobile
            ? { left: 20, top: 80, width: 320, height: 190 }
            : { top: 24, left: 24, right: 24, bottom: 24 }
          }
        >
          <div
            className="relative w-full h-full rounded-[50%] shadow-[0_0_60px_rgba(16,185,129,0.15)]"
            style={isMobile ? {
              background: 'radial-gradient(ellipse at 50% 40%, #1a6b3c, #0d4f2b 60%, #0a3d22)',
              border: '6px solid #8B6914',
              borderRadius: '50%',
              boxShadow: '0 0 0 3px #5a4510, 0 8px 32px rgba(0,0,0,0.5), inset 0 2px 20px rgba(0,0,0,0.3)',
            } : undefined}
          >
            {!isMobile && (
              <>
                <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 border-[10px] border-amber-900/70" />
                <div className="absolute -inset-[1px] rounded-[50%] border-2 border-amber-700/30" />
                <div className="absolute inset-3 rounded-[50%] border-2 border-emerald-600/40" />
                <div className="absolute inset-0 rounded-[50%] opacity-[0.07] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
              </>
            )}
          </div>
        </div>

        {/* Blinds & Hand info — ref: top:95, centered */}
        <div
          className={`absolute z-20 ${isMobile ? '' : 'top-1 left-1/2 -translate-x-1/2'}`}
          style={isMobile ? { top: 95, left: '50%', transform: 'translateX(-50%)' } : undefined}
        >
          <div style={isMobile ? {
            background: 'rgba(0,0,0,0.6)',
            padding: '3px 12px',
            borderRadius: 10,
            fontSize: 11,
            color: '#d1d5db',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          } : undefined}
            className={isMobile ? '' : 'flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-900/90 backdrop-blur-sm rounded-full text-xs border border-gray-700/40'}
          >
            {isMobile ? (
              <>
                <span style={{ color: '#d1d5db' }}>BLINDS</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
                <span style={{ color: '#6b7280' }}>|</span>
                <span style={{ color: '#d1d5db' }}>HAND</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>#{gameState.handNumber}</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Blinds</span>
                  <span className="text-white font-bold text-[11px] sm:text-xs">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
                </div>
                <div className="w-px h-3 bg-gray-700" />
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Hand</span>
                  <span className="text-white font-bold text-[11px] sm:text-xs">#{gameState.handNumber}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Player Seats */}
        {seatsJSX}

        {/* ===== Mobile: Pot — ref: top:138, chip 14px + white amount ===== */}
        {isMobile && pot > 0 && (
          <div style={{
            position: 'absolute', top: 138, left: '50%',
            transform: 'translateX(-50%)', zIndex: 5,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(0,0,0,0.7)',
              padding: '3px 10px', borderRadius: 12,
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: '#f59e0b', border: '2px solid #d97706',
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {pot.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* ===== Mobile: Community Cards — ref: top:165, gap:5 ===== */}
        {isMobile && (
          <div style={{
            position: 'absolute', top: 165, left: '50%',
            transform: 'translateX(-50%)', zIndex: 5,
          }}>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
              {communityCards.map((card, i) => (
                <Card
                  key={`${gameState.handNumber}-${i}`}
                  card={card}
                  size="sm"
                  animate={animatingCards.has(i) ? 'deal' : 'none'}
                  delay={animatingCards.has(i) ? (i - Math.min(...Array.from(animatingCards))) * 80 : 0}
                />
              ))}
              {phase !== 'waiting' && communityCards.length < 5 && Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  style={{
                    width: 42, height: 58, borderRadius: 4,
                    background: '#1e293b', border: '1.5px solid #475569',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== Desktop: Community Cards + Pot (unchanged) ===== */}
        {!isMobile && (
          <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="flex gap-2 justify-center mb-3">
              {communityCards.map((card, i) => (
                <Card
                  key={`${gameState.handNumber}-${i}`}
                  card={card}
                  size={cardSize}
                  animate={animatingCards.has(i) ? 'deal' : 'none'}
                  delay={animatingCards.has(i) ? (i - Math.min(...Array.from(animatingCards))) * 80 : 0}
                />
              ))}
              {phase !== 'waiting' && communityCards.length < 5 && Array.from({ length: 5 - communityCards.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="rounded-xl border-2 border-dashed border-emerald-600/20"
                  style={cardDimensions[cardSize]}
                />
              ))}
            </div>
            {pot > 0 && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900/85 backdrop-blur-sm rounded-full border border-gray-700/30">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-sm shadow-yellow-500/30" />
                  <span className="text-yellow-400 font-bold text-lg">{pot.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Waiting for players overlay — ref: centered in oval area */}
        {phase === 'waiting' && (
          <div
            className={`absolute z-30 ${isMobile ? '' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
            style={isMobile ? { top: 175, left: 180, transform: 'translate(-50%, -50%)' } : undefined}
          >
            <div className="bg-gray-900/95 backdrop-blur-lg px-4 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-center shadow-xl border border-gray-700/50 min-w-[180px] sm:min-w-[240px]">
              <div className="text-white font-bold text-base sm:text-lg mb-1">{players.length}/6 Players</div>
              <div className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-5">Waiting for players...</div>
              {players.length >= 2 && onStartGame && (
                <button
                  onClick={onStartGame}
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
                >
                  Start Game
                </button>
              )}
              {players.length < 2 && (
                <div className="text-gray-500 text-xs sm:text-sm">Need 2+ players</div>
              )}
            </div>
          </div>
        )}

        {/* Winner banner */}
        {phase === 'showdown' && showWinnerBanner && winners && winners.length > 0 && (
          <div
            className={`absolute z-30 pointer-events-none ${isMobile ? '' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
            style={isMobile ? { top: 175, left: 180, transform: 'translate(-50%, -50%)' } : undefined}
          >
            <div className="bg-gray-900/90 backdrop-blur-lg px-4 sm:px-8 py-3 sm:py-5 rounded-xl sm:rounded-2xl text-center shadow-2xl border border-yellow-500/40 min-w-[160px] sm:min-w-[260px]">
              {winners.map((winner, i) => {
                const winnerPlayer = players.find(p => p.odentity === winner.odentity);
                return (
                  <div key={i} className="mb-1">
                    <div className="text-yellow-400 font-bold text-base sm:text-xl">{winnerPlayer?.name || 'Unknown'} wins!</div>
                    <div className="text-emerald-400 font-bold text-lg sm:text-2xl">+{winner.amount.toLocaleString()}</div>
                    {winner.handName && winner.handName !== 'Uncontested' && (
                      <div className="text-gray-300 text-xs sm:text-sm mt-1">{winner.handName}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {phase === 'finished' && (
          <div
            className={`absolute z-30 ${isMobile ? '' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
            style={isMobile ? { top: 175, left: 180, transform: 'translate(-50%, -50%)' } : undefined}
          >
            <div className="bg-gray-900/95 backdrop-blur-lg px-4 sm:px-8 py-4 sm:py-6 rounded-xl sm:rounded-2xl text-center shadow-xl border border-yellow-500/30 min-w-[160px] sm:min-w-[260px]">
              <div className="text-yellow-400 font-bold text-base sm:text-xl mb-2 sm:mb-3">Game Over</div>
              {winners && winners.map((winner, i) => {
                const winnerPlayer = players.find(p => p.odentity === winner.odentity);
                return (
                  <div key={i} className="mb-2">
                    <div className="text-white font-semibold text-sm sm:text-lg">{winnerPlayer?.name || 'Unknown'}</div>
                    <div className="text-emerald-400 font-bold text-base sm:text-xl">+{winner.amount.toLocaleString()}</div>
                  </div>
                );
              })}
              <a
                href="/poker"
                className="mt-3 sm:mt-4 inline-block w-full px-4 sm:px-6 py-2.5 sm:py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg sm:rounded-xl transition-colors text-center text-sm sm:text-base"
              >
                Back to Lobby
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar — OUTSIDE table container (uses fixed positioning) */}
      {showActionBar && (
        <ActionBar
          validActions={validActions}
          currentBet={gameState.currentBet}
          playerBet={yourPlayer.bet}
          playerChips={yourPlayer.chips}
          onAction={onAction}
          disabled={validActions.length === 0}
        />
      )}
    </div>
  );
}
