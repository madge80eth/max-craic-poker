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
        // Only advance if we're still in showdown — avoids race condition
        // where the hand already advanced via polling before this timer fires
        if (phaseRef.current === 'showdown') {
          onNextHandRef.current?.();
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
    // Do NOT include 'winners' - it gets a new reference every poll cycle,
    // which would clear the timeout and stall the game
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

  // Card dimensions for placeholders (responsive)
  const cardDimensions = {
    sm: { width: 43, height: 60 },
    md: { width: 54, height: 76 },
    lg: { width: 66, height: 92 },
    xl: { width: 80, height: 112 },
  };

  return (
    <div className="relative w-full h-full min-h-0 overflow-visible">
      {/* Table felt - mobile: squashed 2:1 oval in upper portion; desktop: fills container */}
      <div
        className="absolute"
        style={isMobile ? { left: 20, right: 20, top: '14%' } : { top: 24, left: 24, right: 24, bottom: 24 }}
      >
        <div
          className={`relative w-full rounded-[50%] bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 shadow-[0_0_60px_rgba(16,185,129,0.15)] border-amber-900/70 ${isMobile ? 'border-[6px]' : 'border-[10px]'}`}
          style={isMobile ? { aspectRatio: '2/1' } : { height: '100%' }}
        >
          <div className="absolute -inset-[1px] rounded-[50%] border-2 border-amber-700/30" />
          <div className="absolute inset-3 rounded-[50%] border-2 border-emerald-600/40" />
          <div className="absolute inset-0 rounded-[50%] opacity-[0.07] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
        </div>
      </div>

      {/* Header - Blinds & Hand info - sits at top of oval on mobile */}
      <div className={`absolute ${isMobile ? 'top-[14%]' : 'top-1'} left-1/2 -translate-x-1/2 z-20`}>
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-900/90 backdrop-blur-sm rounded-full text-xs border border-gray-700/40">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Blinds</span>
            <span className="text-white font-bold text-[11px] sm:text-xs">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
          </div>
          <div className="w-px h-3 bg-gray-700" />
          <div className="flex items-center gap-1">
            <span className="text-gray-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Hand</span>
            <span className="text-white font-bold text-[11px] sm:text-xs">#{gameState.handNumber}</span>
          </div>
        </div>
      </div>

      {/* Player Seats */}
      {[0, 1, 2, 3, 4, 5].map((seatIndex) => {
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
      })}

      {/* Center area - Community cards & pot - centered in oval */}
      <div className={`absolute ${isMobile ? 'top-[29%]' : 'top-[42%]'} left-1/2 -translate-x-1/2 -translate-y-1/2 z-10`}>
        {/* Community Cards */}
        <div className="flex gap-1 sm:gap-2 justify-center mb-2 sm:mb-3">
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
              className="rounded-lg sm:rounded-xl border-2 border-dashed border-emerald-600/20"
              style={cardDimensions[cardSize]}
            />
          ))}
        </div>

        {/* Pot */}
        {pot > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-gray-900/85 backdrop-blur-sm rounded-full border border-gray-700/30">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-sm shadow-yellow-500/30" />
              <span className="text-yellow-400 font-bold text-sm sm:text-lg">{pot.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Waiting for players overlay */}
      {phase === 'waiting' && (
        <div className={`absolute ${isMobile ? 'top-[29%]' : 'top-1/2'} left-1/2 -translate-x-1/2 -translate-y-1/2 z-30`}>
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

      {/* Winner banner - brief 3s flash during showdown */}
      {phase === 'showdown' && showWinnerBanner && winners && winners.length > 0 && (
        <div className={`absolute ${isMobile ? 'top-[29%]' : 'top-1/2'} left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none`}>
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
        <div className={`absolute ${isMobile ? 'top-[29%]' : 'top-1/2'} left-1/2 -translate-x-1/2 -translate-y-1/2 z-30`}>
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

      {/* Action Bar */}
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
