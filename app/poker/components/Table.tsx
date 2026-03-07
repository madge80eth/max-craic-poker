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

  // Refs for showdown auto-advance
  const onNextHandRef = useRef(onNextHand);
  onNextHandRef.current = onNextHand;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Community card animation tracking
  const prevCommunityCountRef = useRef(0);
  const prevHandNumberRef = useRef(gameState.handNumber);
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set());

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
      const newIndices = new Set<number>();
      for (let i = prevCount; i < currentCount; i++) newIndices.add(i);
      setAnimatingCards(newIndices);
      const timeout = setTimeout(() => setAnimatingCards(new Set()), 500);
      prevCommunityCountRef.current = currentCount;
      return () => clearTimeout(timeout);
    }

    prevCommunityCountRef.current = currentCount;
  }, [communityCards.length, gameState.handNumber]);

  // Auto-advance after showdown
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

  // Detect hand name for hero's hand
  const heroHandName = winners?.find(w => w.odentity === yourPlayer?.odentity)?.handName || null;

  return (
    <div className="relative w-full h-full">
      {/* Dark background fills entire container */}
      <div className="absolute inset-0" style={{ background: '#0a0c10' }} />

      {/* Table oval */}
      <div
        className="absolute rounded-[50%]"
        style={{
          top: '12%',
          left: '8%',
          right: '8%',
          bottom: '22%',
          background: 'radial-gradient(ellipse at 50% 40%, #1a6b3c, #0d4f2b 60%, #0a3d22)',
          border: '5px solid #8B6914',
          boxShadow: '0 0 0 2px #5a4510, 0 8px 32px rgba(0,0,0,0.6), inset 0 2px 20px rgba(0,0,0,0.3)',
        }}
      />

      {/* Top bar - game info */}
      <div className="absolute top-2 left-0 right-0 z-20 flex justify-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px]"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <span className="text-red-400 font-bold uppercase tracking-wider">Hold&apos;em</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Hand #{gameState.handNumber}</span>
        </div>
      </div>

      {/* Player seats */}
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

      {/* Pot display - centered above community cards */}
      {pot > 0 && (
        <div className="absolute z-15 left-1/2 -translate-x-1/2" style={{ top: '30%' }}>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #ef4444, #b91c1c)',
                border: '1px solid #991b1b',
              }}
            />
            <span className="text-[11px] font-bold text-white">{pot.toLocaleString()}</span>
          </div>
          <div className="text-center mt-0.5">
            <span
              className="text-[9px] font-bold px-1.5 rounded"
              style={{ color: '#4ade80' }}
            >
              Pot {pot.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Community cards - centered on table */}
      <div className="absolute z-10 left-1/2 -translate-x-1/2" style={{ top: '40%' }}>
        <div className="flex gap-1 justify-center">
          {communityCards.map((card, i) => (
            <Card
              key={`${gameState.handNumber}-${i}`}
              card={card}
              size="sm"
              animate={animatingCards.has(i) ? 'deal' : 'none'}
              delay={animatingCards.has(i) ? (i - Math.min(...Array.from(animatingCards))) * 60 : 0}
            />
          ))}
          {/* Empty card placeholders */}
          {phase !== 'waiting' && communityCards.length < 5 && Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded"
              style={{
                width: 40,
                height: 56,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero hole cards - large, at bottom center */}
      {yourPlayer && !yourPlayer.folded && yourPlayer.holeCards && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2" style={{ bottom: '8%' }}>
          <div className="flex flex-col items-center">
            <div className="flex gap-1">
              <Card
                key={`hero-${gameState.handNumber}-0`}
                card={yourPlayer.holeCards[0]}
                size="lg"
              />
              <Card
                key={`hero-${gameState.handNumber}-1`}
                card={yourPlayer.holeCards[1]}
                size="lg"
              />
            </div>
            {/* Hero info below cards */}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-gray-300 font-medium">{yourPlayer.name}</span>
              {heroHandName && heroHandName !== 'Uncontested' && (
                <span className="text-[10px] text-yellow-400 font-bold">{heroHandName}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting for players overlay */}
      {phase === 'waiting' && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="px-6 py-5 rounded-xl text-center min-w-[200px]"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="text-white font-bold text-base mb-1">{players.length}/6 Players</div>
            <div className="text-gray-400 text-xs mb-4">Waiting for players...</div>
            {players.length >= 2 && onStartGame && (
              <button
                onClick={onStartGame}
                className="w-full px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-sm"
              >
                Start Game
              </button>
            )}
            {players.length < 2 && (
              <div className="text-gray-500 text-xs">Need 2+ players</div>
            )}
          </div>
        </div>
      )}

      {/* Winner banner */}
      {phase === 'showdown' && showWinnerBanner && winners && winners.length > 0 && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="px-6 py-4 rounded-xl text-center min-w-[180px]"
            style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(234,179,8,0.3)' }}
          >
            {winners.map((winner, i) => {
              const winnerPlayer = players.find(p => p.odentity === winner.odentity);
              return (
                <div key={i} className="mb-1">
                  <div className="text-yellow-400 font-bold text-sm">{winnerPlayer?.name || 'Unknown'} wins!</div>
                  <div className="text-green-400 font-bold text-lg">+{winner.amount.toLocaleString()}</div>
                  {winner.handName && winner.handName !== 'Uncontested' && (
                    <div className="text-gray-400 text-[11px] mt-0.5">{winner.handName}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {phase === 'finished' && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="px-6 py-5 rounded-xl text-center min-w-[200px]"
            style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(234,179,8,0.3)' }}
          >
            <div className="text-yellow-400 font-bold text-base mb-2">Game Over</div>
            {winners && winners.map((winner, i) => {
              const winnerPlayer = players.find(p => p.odentity === winner.odentity);
              return (
                <div key={i} className="mb-2">
                  <div className="text-white font-semibold text-sm">{winnerPlayer?.name || 'Unknown'}</div>
                  <div className="text-green-400 font-bold text-lg">+{winner.amount.toLocaleString()}</div>
                </div>
              );
            })}
            <a
              href="/poker"
              className="mt-3 inline-block w-full px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors text-center text-sm"
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
