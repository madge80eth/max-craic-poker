'use client';

import { useEffect, useRef, useState } from 'react';
import { ClientGameState, GamePhase, PlayerAction } from '@/lib/poker/types';
import Card from './Card';
import ActionBar from './ActionBar';
import PlayerPlaque from './PlayerPlaque';
import MobileOppStrip from './MobileOppStrip';
import MobileMeStrip from './MobileMeStrip';
import { PokerSounds } from '@/app/poker/lib/sounds';
import '../styles/table.css';

interface TableProps {
  gameState: ClientGameState;
  onAction: (action: PlayerAction, amount?: number) => void;
  onSeatClick?: (seatIndex: number) => void;
  onStartGame?: () => void;
  onNextHand?: () => void;
  onPlayVsBot?: () => void;
}

export default function Table({
  gameState, onAction, onSeatClick, onStartGame, onNextHand, onPlayVsBot,
}: TableProps) {
  const { players, communityCards, pot, phase, yourSeatIndex, validActions, winners, config, lastActionTime } = gameState;

  // ─── Sound state ────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const prevPhaseForSoundRef = useRef<GamePhase | null>(null);

  // Unlock AudioContext on first interaction
  useEffect(() => {
    const unlock = () => PokerSounds.unlock();
    document.addEventListener('click', unlock, { once: true });
    return () => document.removeEventListener('click', unlock);
  }, []);

  // Phase-change sounds
  useEffect(() => {
    if (prevPhaseForSoundRef.current === phase) return;
    prevPhaseForSoundRef.current = phase;
    const map: Partial<Record<GamePhase, string>> = {
      preflop: 'deal',
      flop: 'flop',
      turn: 'turn',
      river: 'river',
      showdown: 'showdown',
    };
    const s = map[phase];
    if (s) PokerSounds.play(s);
  }, [phase]);

  // Action wrapper — plays sound then forwards to parent
  const handleAction = (action: PlayerAction, amount?: number) => {
    const soundMap: Record<PlayerAction, string> = {
      fold: 'fold', check: 'check', call: 'call', raise: 'raise', allin: 'allin',
    };
    PokerSounds.play(soundMap[action]);
    onAction(action, amount);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    PokerSounds.setMute(next);
  };

  // ─── AllIn reveal logic ─────────────────────────────────────────────────────
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

  // ─── Winner banner ──────────────────────────────────────────────────────────
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  const lastShowdownHandRef = useRef<number>(-1);

  useEffect(() => {
    if (phase === 'showdown' && winners && winners.length > 0 && revealComplete && lastShowdownHandRef.current !== gameState.handNumber) {
      lastShowdownHandRef.current = gameState.handNumber;
      setShowWinnerBanner(true);
      PokerSounds.play('win');
      const t = setTimeout(() => { setShowWinnerBanner(false); if (phaseRef.current === 'showdown') onNextHandRef.current?.(); }, 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gameState.handNumber, revealComplete]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const blindLevel = config.blindLevels[gameState.blindLevel] || config.blindLevels[0];
  const getPlayerBySeat = (seatIndex: number) => players.find(p => p.seatIndex === seatIndex) || null;
  const yourPlayer = yourSeatIndex !== null ? getPlayerBySeat(yourSeatIndex) : null;
  const showActionBar = yourSeatIndex !== null && yourPlayer && !yourPlayer.folded && !yourPlayer.allIn &&
    phase !== 'waiting' && phase !== 'showdown' && phase !== 'finished';
  const heroHandName = winners?.find(w => w.odentity === yourPlayer?.odentity)?.handName || null;

  const getVisualPos = (si: number): number => {
    if (yourSeatIndex === null) return si;
    return ((si - yourSeatIndex) % 6 + 6) % 6;
  };

  const opponents = players.filter(p => p.seatIndex !== yourSeatIndex);
  const activePlayer = gameState.activePlayerIndex !== -1 ? players[gameState.activePlayerIndex] : null;
  const activeOppSeatIndex = (activePlayer && activePlayer.seatIndex !== yourSeatIndex)
    ? activePlayer.seatIndex : null;

  return (
    <div className="table-screen">
      <div className="table-area">

        {/* HUD bar */}
        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px]" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <span className="text-red-400 font-bold uppercase tracking-wider">Hold&apos;em</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">{blindLevel.smallBlind}/{blindLevel.bigBlind}</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Hand #{gameState.handNumber}</span>
            <span className="text-gray-500">|</span>
            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12, color: isMuted ? '#ef4444' : '#9ca3af' }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        <div className="table-rail">
          <div className="poker-table">

            <MobileOppStrip
              opponents={opponents}
              activeOppSeatIndex={activeOppSeatIndex}
              lastActionTime={lastActionTime}
              actionTimeout={config.actionTimeout}
            />

            {/* Community cards + pot — Fix 1: size lg */}
            <div className="community-area">
              <div className="community-cards">
                {Array.from({ length: 5 }).map((_, i) => {
                  const card = displayedCommunityCards[i] ?? null;
                  return card ? (
                    <Card
                      key={i}
                      card={card}
                      size="lg"
                      animate={i === latestRevealedIndex ? 'fade' : 'none'}
                    />
                  ) : phase !== 'waiting' ? (
                    <div key={i} className="community-card-placeholder" />
                  ) : null;
                })}
              </div>
              {pot > 0 && (
                <div className="pot-display">
                  <div className="pot-chip" />
                  {pot.toLocaleString()}
                </div>
              )}
            </div>

            <MobileMeStrip
              player={yourPlayer}
              heroHandName={heroHandName}
              handNumber={gameState.handNumber}
            />

            {[0, 1, 2, 3, 4, 5].map((seatIndex) => {
              const player = getPlayerBySeat(seatIndex);
              const visualPos = getVisualPos(seatIndex);
              const isActive = player != null
                && gameState.activePlayerIndex !== -1
                && players[gameState.activePlayerIndex]?.seatIndex === seatIndex;
              return (
                <PlayerPlaque
                  key={seatIndex}
                  player={player}
                  isActive={isActive}
                  isYou={seatIndex === yourSeatIndex}
                  position={visualPos}
                  handNumber={gameState.handNumber}
                  lastActionTime={lastActionTime}
                  actionTimeout={config.actionTimeout}
                  onSeatClick={phase === 'waiting' && onSeatClick ? () => onSeatClick(seatIndex) : undefined}
                />
              );
            })}

          </div>
        </div>

        {/* Waiting overlay */}
        {phase === 'waiting' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30 }}>
            <div className="px-6 py-5 rounded-xl text-center min-w-[200px]" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white font-bold text-base mb-1">{players.length}/6 Players</div>
              <div className="text-gray-400 text-xs mb-4">Waiting for players...</div>
              {/* DEV ONLY — revert to >= 2 before production */}
              {players.length >= 1 && onStartGame && (
                <button onClick={onStartGame} className="w-full px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-sm">Start Game</button>
              )}
              {/* DEV ONLY — remove before production */}
              {onPlayVsBot && players.length >= 1 && (
                <button onClick={onPlayVsBot} className="w-full px-5 py-2.5 mt-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors text-xs">🤖 Play vs Bot (dev only)</button>
              )}
              {players.length < 1 && !onStartGame && <div className="text-gray-500 text-xs">Need 2+ players</div>}
            </div>
          </div>
        )}

        {/* Winner banner */}
        {phase === 'showdown' && showWinnerBanner && winners && winners.length > 0 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30, pointerEvents: 'none' }}>
            <div className="px-6 py-4 rounded-xl text-center min-w-[180px]" style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(234,179,8,0.3)' }}>
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

        {/* Game over overlay */}
        {phase === 'finished' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30 }}>
            <div className="px-6 py-5 rounded-xl text-center min-w-[200px]" style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(234,179,8,0.3)' }}>
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

      </div>

      {/* Action bar — in-flow flex child, no longer fixed */}
      {showActionBar && (
        <ActionBar
          validActions={validActions}
          currentBet={gameState.currentBet}
          playerBet={yourPlayer.bet}
          playerChips={yourPlayer.chips}
          onAction={handleAction}
          disabled={validActions.length === 0}
        />
      )}
    </div>
  );
}
