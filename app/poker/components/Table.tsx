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

  const blindLevel = config.blindLevels[gameState.blindLevel] || config.blindLevels[0];

  const getPlayerBySeat = (seatIndex: number) => {
    return players.find(p => p.seatIndex === seatIndex) || null;
  };

  const yourPlayer = yourSeatIndex !== null ? getPlayerBySeat(yourSeatIndex) : null;
  const showActionBar = yourSeatIndex !== null && yourPlayer && !yourPlayer.folded && !yourPlayer.allIn &&
    phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished';

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Table felt */}
      <div className="absolute inset-4 sm:inset-8">
        <div className="relative w-full h-full rounded-[50%] bg-gradient-to-b from-emerald-800 to-emerald-900 shadow-2xl border-8 border-amber-900/80">
          {/* Inner table rim */}
          <div className="absolute inset-3 rounded-[50%] border-4 border-emerald-700/50" />

          {/* Table pattern */}
          <div className="absolute inset-0 rounded-[50%] opacity-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
        </div>
      </div>

      {/* Header - Blinds & Hand info */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 backdrop-blur rounded-full text-xs">
          <span className="text-gray-400">Blinds</span>
          <span className="text-white font-semibold">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">Hand</span>
          <span className="text-white font-semibold">#{gameState.handNumber}</span>
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
            position={seatIndex}
            onSeatClick={phase === 'waiting' ? onSeatClick : undefined}
            lastActionTime={lastActionTime}
            actionTimeout={config.actionTimeout}
            handNumber={gameState.handNumber}
          />
        );
      })}

      {/* Center area - Community cards & pot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        {/* Community Cards */}
        <div className="flex gap-1 justify-center mb-3">
          {communityCards.map((card, i) => (
            <Card
              key={`${gameState.handNumber}-${i}`}
              card={card}
              size="md"
              animate={animatingCards.has(i) ? 'deal' : 'none'}
              delay={animatingCards.has(i) ? (i - Math.min(...Array.from(animatingCards))) * 80 : 0}
            />
          ))}
          {/* Empty card slots */}
          {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-11 h-16 rounded-lg border-2 border-dashed border-emerald-600/30"
            />
          ))}
        </div>

        {/* Pot */}
        {pot > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/80 backdrop-blur rounded-full">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <span className="text-yellow-400 font-bold">{pot.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Waiting for players overlay */}
      {phase === 'waiting' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-gray-900/95 backdrop-blur-lg px-6 py-5 rounded-2xl text-center shadow-xl border border-gray-700/50">
            <div className="text-white font-semibold mb-1">{players.length}/6 Players</div>
            <div className="text-gray-400 text-sm mb-4">Waiting for players to join...</div>
            {players.length >= 2 && onStartGame && (
              <button
                onClick={onStartGame}
                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
              >
                Start Game
              </button>
            )}
            {players.length < 2 && (
              <div className="text-gray-500 text-xs">Need at least 2 players</div>
            )}
          </div>
        </div>
      )}

      {/* Winners overlay */}
      {(phase === 'showdown' || phase === 'finished') && winners && winners.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-gray-900/95 backdrop-blur-lg px-6 py-5 rounded-2xl text-center shadow-xl border border-yellow-500/30 animate-bounce-in">
            <div className="text-2xl mb-2">{phase === 'finished' ? '🏆' : '🎉'}</div>
            <div className="text-yellow-400 font-bold text-lg mb-3">
              {phase === 'finished' ? 'Game Over!' : 'Winner!'}
            </div>
            {winners.map((winner, i) => {
              const winnerPlayer = players.find(p => p.odentity === winner.odentity);
              return (
                <div key={i} className="mb-2">
                  <div className="text-white font-semibold">{winnerPlayer?.name || 'Unknown'}</div>
                  <div className="text-emerald-400 font-bold">+{winner.amount.toLocaleString()}</div>
                  {winner.handName && winner.handName !== 'Uncontested' && (
                    <div className="text-gray-400 text-sm">{winner.handName}</div>
                  )}
                </div>
              );
            })}
            {phase === 'showdown' && onNextHand && (
              <button
                onClick={onNextHand}
                className="mt-3 w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
              >
                Next Hand
              </button>
            )}
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
