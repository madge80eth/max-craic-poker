'use client';

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

// Map seat indices to positions (6-max layout)
const SEAT_POSITIONS = [
  'bottom-center',  // Seat 0 - Hero position
  'bottom-left',    // Seat 1
  'top-left',       // Seat 2
  'top-center',     // Seat 3
  'top-right',      // Seat 4
  'bottom-right',   // Seat 5
] as const;

export default function Table({
  gameState,
  onAction,
  onSeatClick,
  onStartGame,
  onNextHand,
}: TableProps) {
  const { players, communityCards, pot, phase, yourSeatIndex, validActions, winners, config, lastActionTime } = gameState;

  // Get current blind level info
  const blindLevel = config.blindLevels[gameState.blindLevel] || config.blindLevels[0];

  // Find player by seat
  const getPlayerBySeat = (seatIndex: number) => {
    return players.find(p => p.seatIndex === seatIndex) || null;
  };

  // Get your player
  const yourPlayer = yourSeatIndex !== null ? getPlayerBySeat(yourSeatIndex) : null;

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[500px] sm:h-[600px]">
      {/* Table Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-800 to-green-900 rounded-[60px] sm:rounded-[100px] border-4 sm:border-8 border-amber-900 shadow-2xl">
        {/* Table Felt Pattern */}
        <div className="absolute inset-2 sm:inset-4 rounded-[50px] sm:rounded-[90px] border-2 sm:border-4 border-green-700/50" />
      </div>

      {/* Header Info */}
      <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-2">
        <div className="bg-gray-900/90 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-xs sm:text-sm text-center">
          <span className="text-gray-400">Blinds:</span>{' '}
          <span className="font-bold">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
          {blindLevel.ante > 0 && (
            <span className="ml-2 text-gray-400">
              Ante: <span className="text-white">{blindLevel.ante}</span>
            </span>
          )}
          <span className="mx-2 sm:mx-3 text-gray-600">|</span>
          <span className="text-gray-400">Hand:</span>{' '}
          <span className="font-bold">#{gameState.handNumber}</span>
        </div>
      </div>

      {/* Player Seats */}
      {SEAT_POSITIONS.map((position, seatIndex) => {
        const player = getPlayerBySeat(seatIndex);
        const isActive = player && gameState.activePlayerIndex !== -1 &&
          players[gameState.activePlayerIndex]?.seatIndex === seatIndex;

        return (
          <PlayerSeat
            key={seatIndex}
            player={player}
            isActive={isActive || false}
            isYou={seatIndex === yourSeatIndex}
            position={position}
            seatIndex={seatIndex}
            onSeatClick={phase === 'waiting' ? onSeatClick : undefined}
            lastActionTime={lastActionTime}
            actionTimeout={config.actionTimeout}
          />
        );
      })}

      {/* Community Cards */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex gap-1 sm:gap-2 justify-center mb-2 sm:mb-4">
          {communityCards.map((card, i) => (
            <div key={i} className="transform transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
              <Card card={card} />
            </div>
          ))}
          {/* Empty slots for remaining cards */}
          {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg border-2 border-dashed border-green-600/30"
            />
          ))}
        </div>

        {/* Pot Display */}
        {pot > 0 && (
          <div className="text-center">
            <div className="inline-block bg-black/60 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <span className="text-yellow-400 font-bold text-base sm:text-lg">
                Pot: {pot.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Game Status / Winners */}
      {phase === 'waiting' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 z-20">
          <div className="bg-black/80 backdrop-blur px-4 sm:px-6 py-3 rounded-lg text-center">
            <div className="text-white mb-2 text-sm sm:text-base">
              {players.length}/6 players
            </div>
            {players.length >= 2 && onStartGame && (
              <button
                onClick={onStartGame}
                className="px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
              >
                Start Game
              </button>
            )}
            {players.length < 2 && (
              <div className="text-gray-400 text-xs sm:text-sm">
                Need at least 2 players to start
              </div>
            )}
          </div>
        </div>
      )}

      {/* Winners Display */}
      {(phase === 'showdown' || phase === 'finished') && winners && winners.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 z-20">
          <div className="bg-black/90 backdrop-blur px-4 sm:px-6 py-4 rounded-lg text-center animate-bounce-in">
            <div className="text-yellow-400 font-bold text-base sm:text-lg mb-2">
              {phase === 'finished' ? '🏆 Game Over!' : '🎉 Winner!'}
            </div>
            {winners.map((winner, i) => {
              const winnerPlayer = players.find(p => p.odentity === winner.odentity);
              return (
                <div key={i} className="text-white text-sm sm:text-base">
                  <span className="font-bold">{winnerPlayer?.name || 'Unknown'}</span>
                  <span className="text-green-400 ml-2">+{winner.amount.toLocaleString()}</span>
                  {winner.handName && winner.handName !== 'Uncontested' && (
                    <div className="text-gray-400 text-xs sm:text-sm">({winner.handName})</div>
                  )}
                </div>
              );
            })}
            {phase === 'showdown' && onNextHand && (
              <button
                onClick={onNextHand}
                className="mt-3 px-4 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
              >
                Next Hand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Bar (below table) */}
      {yourSeatIndex !== null && yourPlayer && !yourPlayer.folded && !yourPlayer.allIn && phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished' && (
        <div className="absolute -bottom-28 sm:-bottom-24 left-1/2 -translate-x-1/2 w-full max-w-lg px-2">
          <ActionBar
            validActions={validActions}
            currentBet={gameState.currentBet}
            playerBet={yourPlayer.bet}
            playerChips={yourPlayer.chips}
            onAction={onAction}
            disabled={validActions.length === 0}
          />
        </div>
      )}
    </div>
  );
}
