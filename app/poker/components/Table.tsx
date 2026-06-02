'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientGameState, PlayerAction } from '@/lib/poker/types';
import Card from './Card';
import ActionBar from './ActionBar';
import PokerTableSVG from './PokerTableSVG';

interface TableProps {
  gameState: ClientGameState;
  onAction: (action: PlayerAction, amount?: number) => void;
  onSeatClick?: (seatIndex: number) => void;
  onStartGame?: () => void;
  onNextHand?: () => void;
}

export default function Table({
  gameState, onAction, onSeatClick, onStartGame, onNextHand,
}: TableProps) {
  const { players, communityCards, pot, phase, yourSeatIndex, validActions, winners, config, lastActionTime } = gameState;
  const onNextHandRef = useRef(onNextHand);
  onNextHandRef.current = onNextHand;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const prevCommunityCountRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const [isAllInReveal, setIsAllInReveal] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [revealComplete, setRevealComplete] = useState(false);
  const [latestRevealedIndex, setLatestRevealedIndex] = useState<number | null>(null);

  useEffect(() => {
    prevCommunityCountRef.current = 0;
    setIsAllInReveal(false); setRevealedCount(0); setRevealComplete(false); setLatestRevealedIndex(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.handNumber]);

  useEffect(() => {
    if (phase !== 'showdown') prevCommunityCountRef.current = communityCards.length;
  }, [communityCards.length, phase]);

  useEffect(() => {
    if (phase === 'showdown' && prevPhaseRef.current !== 'showdown') {
      const n = prevCommunityCountRef.current;
      if (n < communityCards.length) { setIsAllInReveal(true); setRevealedCount(n); setRevealComplete(false); }
      else { setIsAllInReveal(false); setRevealComplete(true); }
    }
    prevPhaseRef.current = phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!isAllInReveal || revealComplete || phase !== 'showdown') return;
    if (revealedCount >= communityCards.length) {
      const t = setTimeout(() => setRevealComplete(true), 2000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLatestRevealedIndex(revealedCount);
      setRevealedCount(prev => prev + 1);
      setTimeout(() => setLatestRevealedIndex(null), 500);
    }, 1500);
    return () => clearTimeout(t);
  }, [isAllInReveal, revealedCount, communityCards.length, phase, revealComplete]);

  const displayedCommunityCards = isAllInReveal ? communityCards.slice(0, revealedCount) : communityCards;

  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  const lastShowdownHandRef = useRef<number>(-1);

  useEffect(() => {
    if (phase === 'showdown' && winners && winners.length > 0 && revealComplete && lastShowdownHandRef.current !== gameState.handNumber) {
      lastShowdownHandRef.current = gameState.handNumber;
      setShowWinnerBanner(true);
      const t = setTimeout(() => { setShowWinnerBanner(false); if (phaseRef.current === 'showdown') onNextHandRef.current?.(); }, 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gameState.handNumber, revealComplete]);

  const blindLevel = config.blindLevels[gameState.blindLevel] || config.blindLevels[0];
  const getPlayerBySeat = (seatIndex: number) => players.find(p => p.seatIndex === seatIndex) || null;
  const yourPlayer = yourSeatIndex !== null ? getPlayerBySeat(yourSeatIndex) : null;
  const showActionBar = yourSeatIndex !== null && yourPlayer && !yourPlayer.folded && !yourPlayer.allIn &&
    phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished';
  const heroHandName = winners?.find(w => w.odentity === yourPlayer?.odentity)?.handName || null;
  return (
    <div className="relative w-full h-full">
      {/* SVG-based table: oval + seats + pot + community cards in one coordinate space */}
      <div className="absolute inset-0">
        <PokerTableSVG
          players={players}
          communityCards={displayedCommunityCards}
          pot={pot}
          phase={phase}
          yourSeatIndex={yourSeatIndex}
          activePlayerIndex={gameState.activePlayerIndex}
          latestRevealedIndex={latestRevealedIndex}
          handNumber={gameState.handNumber}
          lastActionTime={lastActionTime}
          actionTimeout={config.actionTimeout}
          onSeatClick={phase === 'waiting' ? onSeatClick : undefined}
        />
      </div>
      <div className="absolute top-2 left-0 right-0 z-20 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px]" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <span className="text-red-400 font-bold uppercase tracking-wider">Hold&apos;em</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Hand #{gameState.handNumber}</span>
        </div>
      </div>
      {yourPlayer && !yourPlayer.folded && yourPlayer.holeCards && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2" style={{ bottom:'8%' }}>
          <div className="flex flex-col items-center">
            <div className="flex gap-1">
              <Card key={`hero-${gameState.handNumber}-0`} card={yourPlayer.holeCards[0]} size="xxl" />
              <Card key={`hero-${gameState.handNumber}-1`} card={yourPlayer.holeCards[1]} size="xxl" />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-gray-300 font-medium">{yourPlayer.name}</span>
              {heroHandName && heroHandName !== 'Uncontested' && <span className="text-[10px] text-yellow-400 font-bold">{heroHandName}</span>}
            </div>
          </div>
        </div>
      )}
      {phase === 'waiting' && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="px-6 py-5 rounded-xl text-center min-w-[200px]" style={{ background:'rgba(0,0,0,0.85)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-white font-bold text-base mb-1">{players.length}/6 Players</div>
            <div className="text-gray-400 text-xs mb-4">Waiting for players...</div>
            {/* DEV ONLY — revert to >= 2 before production */}
            {players.length >= 1 && onStartGame && (
              <button onClick={onStartGame} className="w-full px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-sm">Start Game</button>
            )}
            {players.length < 1 && <div className="text-gray-500 text-xs">Need 2+ players</div>}
          </div>
        </div>
      )}
      {phase === 'showdown' && showWinnerBanner && winners && winners.length > 0 && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="px-6 py-4 rounded-xl text-center min-w-[180px]" style={{ background:'rgba(0,0,0,0.9)', border:'1px solid rgba(234,179,8,0.3)' }}>
            {winners.map((winner, i) => {
              const winnerPlayer = players.find(p => p.odentity === winner.odentity);
              return (
                <div key={i} className="mb-1">
                  <div className="text-yellow-400 font-bold text-sm">{winnerPlayer?.name || 'Unknown'} wins!</div>
                  <div className="text-green-400 font-bold text-lg">+{winner.amount.toLocaleString()}</div>
                  {winner.handName && winner.handName !== 'Uncontested' && <div className="text-gray-400 text-[11px] mt-0.5">{winner.handName}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {phase === 'finished' && (
        <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="px-6 py-5 rounded-xl text-center min-w-[200px]" style={{ background:'rgba(0,0,0,0.9)', border:'1px solid rgba(234,179,8,0.3)' }}>
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
            <a href="/poker" className="mt-3 inline-block w-full px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors text-center text-sm">Back to Lobby</a>
          </div>
        </div>
      )}
      {showActionBar && (
        <ActionBar validActions={validActions} currentBet={gameState.currentBet} playerBet={yourPlayer.bet} playerChips={yourPlayer.chips} onAction={onAction} disabled={validActions.length === 0} />
      )}
    </div>
  );
}
