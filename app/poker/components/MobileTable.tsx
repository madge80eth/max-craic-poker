'use client';

import { ClientGameState, ClientPlayer, PlayerAction } from '@/lib/poker/types';
import Card from './Card';
import ActionBar from './ActionBar';

interface MobileTableProps {
  gameState: ClientGameState;
  onAction: (action: PlayerAction, amount?: number) => void;
  onSeatClick?: (seatIndex: number) => void;
  onStartGame?: () => void;
  showWinnerBanner: boolean;
  animatingCards: Set<number>;
}

// Mobile seat layout: positions 0-5 mapped to visual grid
// Position 0 = You (bottom center)
// Arranged as: top row (1 seat), middle row (2 seats), bottom row (3 seats with you in center)
const MOBILE_SEAT_ORDER = [
  [3],           // Top row: position 3
  [2, 4],        // Middle row: positions 2, 4
  [1, 0, 5],     // Bottom row: positions 1, 0 (you), 5
];

interface MobileSeatProps {
  player: ClientPlayer | null;
  isActive: boolean;
  isYou: boolean;
  seatIndex: number;
  onSeatClick?: () => void;
  showCards?: boolean;
}

function MobileSeat({ player, isActive, isYou, seatIndex, onSeatClick, showCards }: MobileSeatProps) {
  // Empty seat
  if (!player) {
    return (
      <button
        onClick={onSeatClick}
        disabled={!onSeatClick}
        className={`
          flex items-center justify-center w-full h-full min-h-[44px]
          rounded-xl border-2 border-dashed transition-all
          ${onSeatClick
            ? 'border-gray-600/50 hover:border-emerald-500/50 hover:bg-gray-800/30'
            : 'border-gray-700/30 bg-gray-800/10'
          }
        `}
      >
        {onSeatClick && <span className="text-gray-500 text-lg">+</span>}
      </button>
    );
  }

  const opacity = player.folded ? 'opacity-40' : player.sitOut ? 'opacity-60' : '';

  return (
    <div className={`relative ${opacity}`}>
      {/* Main seat card */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all
          ${isYou
            ? 'bg-purple-900/40 border border-purple-500/50'
            : 'bg-gray-800/60 border border-gray-700/40'
          }
          ${isActive ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20' : ''}
          ${player.allIn ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/30' : ''}
        `}
      >
        {/* Avatar */}
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
            ${isYou
              ? 'bg-gradient-to-br from-purple-500 to-pink-500'
              : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }
          `}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-white truncate">
              {player.name}
            </span>
            {isYou && <span className="text-[9px] text-purple-400">(You)</span>}
            {player.isDealer && (
              <span className="w-4 h-4 bg-white text-gray-900 text-[9px] font-black rounded-full flex items-center justify-center">D</span>
            )}
          </div>
          <div className="text-[11px] text-emerald-400 font-bold font-mono">
            {player.chips.toLocaleString()}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-0.5">
          {player.bet > 0 && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-gray-900 text-[10px] font-bold rounded">
              {player.bet.toLocaleString()}
            </span>
          )}
          {player.allIn && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded">
              ALL IN
            </span>
          )}
          {player.folded && (
            <span className="text-[9px] text-gray-500 font-medium">FOLD</span>
          )}
          {(player.isSmallBlind || player.isBigBlind) && !player.bet && (
            <span className={`px-1 py-0.5 text-[9px] font-bold rounded ${player.isBigBlind ? 'bg-red-500/80' : 'bg-blue-500/80'} text-white`}>
              {player.isBigBlind ? 'BB' : 'SB'}
            </span>
          )}
        </div>
      </div>

      {/* Hole cards - only show for this player or during showdown */}
      {showCards && player.holeCards && !player.folded && (
        <div className="flex gap-0.5 justify-center mt-1">
          {player.holeCards.map((card, i) => (
            <Card key={i} card={card} size={isYou ? 'sm' : 'xs'} />
          ))}
        </div>
      )}

      {/* Face-down cards for other players */}
      {!showCards && !player.folded && !isYou && (
        <div className="flex gap-0.5 justify-center mt-1">
          <Card card={null} faceDown size="xs" />
          <Card card={null} faceDown size="xs" />
        </div>
      )}
    </div>
  );
}

export default function MobileTable({
  gameState,
  onAction,
  onSeatClick,
  onStartGame,
  showWinnerBanner,
  animatingCards,
}: MobileTableProps) {
  const { players, communityCards, pot, phase, yourSeatIndex, validActions, winners, config } = gameState;
  const blindLevel = config.blindLevels[gameState.blindLevel] || config.blindLevels[0];

  const getPlayerBySeat = (seatIndex: number) => {
    return players.find(p => p.seatIndex === seatIndex) || null;
  };

  // Auto-center: rotate seat positions so "you" is always at position 0 (bottom center)
  const getVisualPosition = (seatIndex: number): number => {
    if (yourSeatIndex === null || yourSeatIndex === undefined) return seatIndex;
    return ((seatIndex - yourSeatIndex) % 6 + 6) % 6;
  };

  // Build visual layout with rotated positions
  const getSeatsForRow = (visualPositions: number[]) => {
    return visualPositions.map(visualPos => {
      // Find which actual seat index maps to this visual position
      for (let actualSeat = 0; actualSeat < 6; actualSeat++) {
        if (getVisualPosition(actualSeat) === visualPos) {
          return {
            seatIndex: actualSeat,
            player: getPlayerBySeat(actualSeat),
            isYou: actualSeat === yourSeatIndex,
            isActive: players[gameState.activePlayerIndex]?.seatIndex === actualSeat,
          };
        }
      }
      return null;
    }).filter(Boolean);
  };

  const yourPlayer = yourSeatIndex !== null ? getPlayerBySeat(yourSeatIndex) : null;
  const showActionBar = yourSeatIndex !== null && yourPlayer && !yourPlayer.folded && !yourPlayer.allIn &&
    phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished';

  const isShowdown = phase === 'showdown';

  return (
    <div className="flex flex-col h-full w-full max-w-[400px] mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-t-xl border-b border-gray-700/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase">Blinds</span>
          <span className="text-xs font-bold text-white">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase">Hand</span>
          <span className="text-xs font-bold text-white">#{gameState.handNumber}</span>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 relative bg-gradient-to-b from-emerald-900/40 to-emerald-950/60 rounded-b-xl overflow-hidden">
        {/* Table felt pattern */}
        <div className="absolute inset-2 rounded-2xl border-4 border-amber-900/50 bg-gradient-to-b from-emerald-700/30 to-emerald-800/30" />

        {/* Seats grid */}
        <div className="relative z-10 flex flex-col h-full py-2 px-2 gap-2">
          {/* Top row - 1 seat centered */}
          <div className="flex justify-center px-8">
            {getSeatsForRow([3]).map((seat: any) => (
              <div key={seat.seatIndex} className="w-32">
                <MobileSeat
                  player={seat.player}
                  isActive={seat.isActive}
                  isYou={seat.isYou}
                  seatIndex={seat.seatIndex}
                  onSeatClick={phase === 'waiting' ? () => onSeatClick?.(seat.seatIndex) : undefined}
                  showCards={isShowdown || seat.isYou}
                />
              </div>
            ))}
          </div>

          {/* Middle row - 2 seats on sides */}
          <div className="flex justify-between px-1">
            {getSeatsForRow([2, 4]).map((seat: any) => (
              <div key={seat.seatIndex} className="w-[45%]">
                <MobileSeat
                  player={seat.player}
                  isActive={seat.isActive}
                  isYou={seat.isYou}
                  seatIndex={seat.seatIndex}
                  onSeatClick={phase === 'waiting' ? () => onSeatClick?.(seat.seatIndex) : undefined}
                  showCards={isShowdown || seat.isYou}
                />
              </div>
            ))}
          </div>

          {/* Community cards & pot - center */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-2">
            {/* Community cards */}
            <div className="flex gap-1 justify-center">
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
                  className="w-[43px] h-[60px] rounded-lg border-2 border-dashed border-emerald-600/30"
                />
              ))}
            </div>

            {/* Pot */}
            {pot > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/70 rounded-full">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600" />
                <span className="text-yellow-400 font-bold text-sm">{pot.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Bottom row - 3 seats with you in center */}
          <div className="flex justify-between gap-1 px-1">
            {getSeatsForRow([1, 0, 5]).map((seat: any, idx: number) => (
              <div key={seat.seatIndex} className={idx === 1 ? 'w-[36%]' : 'w-[30%]'}>
                <MobileSeat
                  player={seat.player}
                  isActive={seat.isActive}
                  isYou={seat.isYou}
                  seatIndex={seat.seatIndex}
                  onSeatClick={phase === 'waiting' ? () => onSeatClick?.(seat.seatIndex) : undefined}
                  showCards={isShowdown || seat.isYou}
                />
              </div>
            ))}
          </div>

          {/* Your hole cards - larger, below your seat */}
          {yourPlayer && yourPlayer.holeCards && !yourPlayer.folded && (
            <div className="flex gap-1 justify-center pt-1">
              {yourPlayer.holeCards.map((card, i) => (
                <Card key={`your-${i}`} card={card} size="lg" />
              ))}
            </div>
          )}
        </div>

        {/* Waiting overlay */}
        {phase === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
            <div className="bg-gray-900/95 px-6 py-5 rounded-2xl text-center border border-gray-700/50 mx-4">
              <div className="text-white font-bold text-lg mb-1">{players.length}/6 Players</div>
              <div className="text-gray-400 text-sm mb-4">Waiting for players...</div>
              {players.length >= 2 && onStartGame && (
                <button
                  onClick={onStartGame}
                  className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
                >
                  Start Game
                </button>
              )}
              {players.length < 2 && (
                <div className="text-gray-500 text-sm">Need at least 2 players</div>
              )}
            </div>
          </div>
        )}

        {/* Winner banner */}
        {phase === 'showdown' && showWinnerBanner && winners && winners.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 pointer-events-none">
            <div className="bg-gray-900/90 px-6 py-4 rounded-2xl text-center border border-yellow-500/40 mx-4">
              {winners.map((winner, i) => {
                const winnerPlayer = players.find(p => p.odentity === winner.odentity);
                return (
                  <div key={i}>
                    <div className="text-yellow-400 font-bold text-lg">{winnerPlayer?.name || 'Unknown'} wins!</div>
                    <div className="text-emerald-400 font-bold text-xl">+{winner.amount.toLocaleString()}</div>
                    {winner.handName && winner.handName !== 'Uncontested' && (
                      <div className="text-gray-300 text-sm mt-1">{winner.handName}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {phase === 'finished' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <div className="bg-gray-900/95 px-6 py-5 rounded-2xl text-center border border-yellow-500/30 mx-4">
              <div className="text-yellow-400 font-bold text-lg mb-3">Game Over</div>
              {winners && winners.map((winner, i) => {
                const winnerPlayer = players.find(p => p.odentity === winner.odentity);
                return (
                  <div key={i} className="mb-2">
                    <div className="text-white font-semibold">{winnerPlayer?.name || 'Unknown'}</div>
                    <div className="text-emerald-400 font-bold text-lg">+{winner.amount.toLocaleString()}</div>
                  </div>
                );
              })}
              <a
                href="/poker"
                className="mt-3 inline-block w-full px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
              >
                Back to Lobby
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
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
