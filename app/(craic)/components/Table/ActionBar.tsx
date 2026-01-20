'use client';

import { useState, useEffect } from 'react';
import { ValidAction, PlayerAction } from '@/lib/poker/types';
import GlowButton from '../ui/GlowButton';

interface ActionBarProps {
  validActions: ValidAction[];
  currentBet: number;
  playerBet: number;
  playerChips: number;
  pot: number;
  onAction: (action: PlayerAction, amount?: number) => void;
  disabled?: boolean;
}

export default function ActionBar({
  validActions,
  currentBet,
  playerBet,
  playerChips,
  pot,
  onAction,
  disabled,
}: ActionBarProps) {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaisePanel, setShowRaisePanel] = useState(false);

  const raiseAction = validActions.find(a => a.action === 'raise');
  const canFold = validActions.some(a => a.action === 'fold');
  const canCheck = validActions.some(a => a.action === 'check');
  const canCall = validActions.some(a => a.action === 'call');
  const canRaise = !!raiseAction;
  const canAllIn = validActions.some(a => a.action === 'allin');

  const callAmount = currentBet - playerBet;
  const minRaise = raiseAction?.minAmount || 0;
  const maxRaise = raiseAction?.maxAmount || 0;

  // Initialize/update raise amount
  useEffect(() => {
    if (raiseAction && (raiseAmount < minRaise || raiseAmount > maxRaise)) {
      setRaiseAmount(minRaise);
    }
  }, [raiseAction, minRaise, maxRaise, raiseAmount]);

  if (validActions.length === 0) {
    return null;
  }

  const handleRaise = () => {
    onAction('raise', raiseAmount);
    setShowRaisePanel(false);
  };

  // Quick bet calculations
  const halfPot = Math.min(Math.floor(pot / 2), maxRaise);
  const fullPot = Math.min(pot, maxRaise);
  const twoX = Math.min(Math.floor(currentBet * 2), maxRaise);
  const threeX = Math.min(Math.floor(currentBet * 3), maxRaise);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Raise Panel */}
      {showRaisePanel && canRaise && (
        <div className="bg-gray-900/98 backdrop-blur-xl border-t border-emerald-500/20 px-4 py-4">
          <div className="max-w-md mx-auto">
            {/* Amount display */}
            <div className="text-center mb-4">
              <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Raise To</div>
              <div className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
                {raiseAmount.toLocaleString()}
              </div>
            </div>

            {/* Slider */}
            <div className="relative mb-4 px-2">
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full h-3 bg-gray-800 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-7
                  [&::-webkit-slider-thumb]:h-7
                  [&::-webkit-slider-thumb]:bg-gradient-to-br
                  [&::-webkit-slider-thumb]:from-emerald-400
                  [&::-webkit-slider-thumb]:to-emerald-600
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-emerald-500/50
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-emerald-300"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{minRaise.toLocaleString()}</span>
                <span>{maxRaise.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick bet buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              <button
                onClick={() => setRaiseAmount(minRaise)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  raiseAmount === minRaise
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Min
              </button>
              <button
                onClick={() => setRaiseAmount(Math.max(minRaise, twoX))}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  raiseAmount === twoX
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                2x
              </button>
              <button
                onClick={() => setRaiseAmount(Math.max(minRaise, halfPot))}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  raiseAmount === halfPot
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                ½ Pot
              </button>
              <button
                onClick={() => setRaiseAmount(Math.max(minRaise, fullPot))}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  raiseAmount === fullPot
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Pot
              </button>
              <button
                onClick={() => setRaiseAmount(maxRaise)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  raiseAmount === maxRaise
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                Max
              </button>
            </div>

            {/* Confirm/Cancel */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRaisePanel(false)}
                className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-colors border border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRaise}
                disabled={disabled}
                className="flex-1 py-4 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30"
              >
                Raise to {raiseAmount.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      {!showRaisePanel && (
        <div className="bg-gray-900/98 backdrop-blur-xl border-t border-gray-700/50 px-4 py-3 pb-safe">
          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              {/* Fold */}
              {canFold && (
                <button
                  onClick={() => onAction('fold')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-gray-300 font-bold rounded-2xl transition-all border border-gray-700/50 active:scale-[0.98]"
                >
                  <div className="text-sm">Fold</div>
                </button>
              )}

              {/* Check */}
              {canCheck && (
                <button
                  onClick={() => onAction('check')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                >
                  <div className="text-sm">Check</div>
                </button>
              )}

              {/* Call */}
              {canCall && (
                <button
                  onClick={() => onAction('call')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
                >
                  <div className="text-sm">Call</div>
                  <div className="text-xs opacity-80">{callAmount.toLocaleString()}</div>
                </button>
              )}

              {/* Raise */}
              {canRaise && (
                <button
                  onClick={() => setShowRaisePanel(true)}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gradient-to-br from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 disabled:from-gray-600 disabled:to-gray-700 text-gray-900 font-bold rounded-2xl transition-all shadow-lg shadow-yellow-500/30 active:scale-[0.98]"
                >
                  <div className="text-sm">Raise</div>
                  <div className="text-xs opacity-80">{minRaise.toLocaleString()}+</div>
                </button>
              )}

              {/* All In */}
              {canAllIn && !canRaise && (
                <button
                  onClick={() => onAction('allin')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 hover:from-purple-300 hover:via-pink-400 hover:to-red-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-500/30 active:scale-[0.98] animate-pulse"
                >
                  <div className="text-sm">ALL IN</div>
                  <div className="text-xs opacity-80">{(playerChips + playerBet).toLocaleString()}</div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
