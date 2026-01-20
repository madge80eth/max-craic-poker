'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientGameState, PlayerAction } from '@/lib/poker/types';
import PlayerSeat from './PlayerSeat';
import Card from './Card';
import ActionBar from './ActionBar';
import Pot from './Pot';
import NeonBadge from '../ui/NeonBadge';
import GlowButton from '../ui/GlowButton';

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
  const { players, communityCards, pot, sidePots, phase, yourSeatIndex, validActions, winners, config, lastActionTime } = gameState;

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
    <div className="relative w-full h-full min-h-[520px]">
      {/* Table felt - GGPoker style */}
      <div className="absolute inset-2 sm:inset-6">
        {/* Outer rim */}
        <div className="relative w-full h-full rounded-[50%] bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 shadow-2xl p-2">
          {/* Inner felt */}
          <div className="relative w-full h-full rounded-[50%] bg-[radial-gradient(ellipse_at_center,#1f5a34_0%,#1a472a_40%,#0f2d1a_100%)] shadow-inner">
            {/* Inner rim detail */}
            <div className="absolute inset-2 rounded-[50%] border border-emerald-500/20" />
            <div className="absolute inset-3 rounded-[50%] border border-emerald-600/10" />

            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 rounded-[50%] opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

            {/* Center glow when active */}
            {phase !== 'waiting' && phase !== 'finished' && (
              <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,255,136,0.05)_0%,transparent_50%)]" />
            )}
          </div>
        </div>
      </div>

      {/* Header - Blinds & Hand info */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/90 backdrop-blur-sm rounded-full border border-gray-700/50 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Blinds</span>
            <span className="text-emerald-400 font-bold text-sm">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Hand</span>
            <span className="text-white font-bold text-sm">#{gameState.handNumber}</span>
          </div>
          {blindLevel.ante > 0 && (
            <>
              <div className="w-px h-4 bg-gray-700" />
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Ante</span>
                <span className="text-yellow-400 font-bold text-sm">{blindLevel.ante}</span>
              </div>
            </>
          )}
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
        <div className="flex gap-1.5 justify-center mb-4">
          {communityCards.map((card, i) => (
            <Card
              key={`${gameState.handNumber}-${i}`}
              card={card}
              size="md"
              animate={animatingCards.has(i) ? 'deal' : 'none'}
              delay={animatingCards.has(i) ? (i - Math.min(...Array.from(animatingCards))) * 100 : 0}
            />
          ))}
          {/* Empty card slots */}
          {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-12 h-[68px] rounded-lg border-2 border-dashed border-emerald-600/20 bg-emerald-900/10"
            />
          ))}
        </div>

        {/* Pot */}
        <Pot amount={pot} sidePots={sidePots} />
      </div>

      {/* Waiting for players overlay */}
      {phase === 'waiting' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-gray-900/98 backdrop-blur-xl px-8 py-6 rounded-3xl text-center shadow-2xl border border-gray-700/50">
            <div className="text-3xl font-black mb-2 bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              {players.length}/6
            </div>
            <div className="text-gray-400 text-sm mb-5">Waiting for players...</div>
            {players.length >= 2 && onStartGame && (
              <GlowButton onClick={onStartGame} variant="primary" size="lg" fullWidth glow>
                Start Game
              </GlowButton>
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
          <div className="bg-gray-900/98 backdrop-blur-xl px-8 py-6 rounded-3xl text-center shadow-2xl border border-yellow-500/30 animate-[scaleIn_0.3s_ease-out]">
            {/* Trophy/crown icon */}
            <div className="text-4xl mb-3">
              {phase === 'finished' ? '👑' : '🏆'}
            </div>

            <div className="text-yellow-400 font-black text-xl mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              {phase === 'finished' ? 'GAME OVER!' : 'WINNER!'}
            </div>

            {winners.map((winner, i) => {
              const winnerPlayer = players.find(p => p.odentity === winner.odentity);
              return (
                <div key={i} className="mb-3">
                  <div className="text-white font-bold text-lg">{winnerPlayer?.name || 'Unknown'}</div>
                  <div className="text-emerald-400 font-black text-2xl drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                    +{winner.amount.toLocaleString()}
                  </div>
                  {winner.handName && winner.handName !== 'Uncontested' && (
                    <NeonBadge variant="purple" size="md" glow className="mt-2">
                      {winner.handName}
                    </NeonBadge>
                  )}
                </div>
              );
            })}

            {phase === 'showdown' && onNextHand && (
              <GlowButton onClick={onNextHand} variant="secondary" size="lg" fullWidth className="mt-4">
                Next Hand
              </GlowButton>
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
          pot={pot}
          onAction={onAction}
          disabled={validActions.length === 0}
        />
      )}
    </div>
  );
}
