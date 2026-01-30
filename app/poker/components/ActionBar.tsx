'use client';

import { useState, useEffect } from 'react';
import { ValidAction, PlayerAction } from '@/lib/poker/types';

interface ActionBarProps {
  validActions: ValidAction[];
  currentBet: number;
  playerBet: number;
  playerChips: number;
  onAction: (action: PlayerAction, amount?: number) => void;
  disabled?: boolean;
}

export default function ActionBar({
  validActions,
  currentBet,
  playerBet,
  playerChips,
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
  const pot = currentBet; // Simplified - actual pot tracking would need game state

  // Always reset raise amount to minimum when action context changes
  useEffect(() => {
    if (raiseAction) {
      setRaiseAmount(minRaise);
      setShowRaisePanel(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRaise]);

  if (validActions.length === 0) {
    return null;
  }

  const handleRaise = () => {
    onAction('raise', raiseAmount);
    setShowRaisePanel(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Raise Panel */}
      {showRaisePanel && canRaise && (
        <div className="bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50 px-4 py-3">
          <div className="max-w-md mx-auto">
            {/* Amount display */}
            <div className="text-center mb-3">
              <span className="text-2xl font-bold text-white">{raiseAmount.toLocaleString()}</span>
            </div>

            {/* Slider */}
            <div className="relative mb-3">
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:bg-emerald-500
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{minRaise.toLocaleString()}</span>
                <span>{maxRaise.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick bet buttons */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              <button
                onClick={() => setRaiseAmount(minRaise)}
                className="py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Min
              </button>
              <button
                onClick={() => setRaiseAmount(Math.min(Math.floor(currentBet * 2), maxRaise))}
                className="py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                2x
              </button>
              <button
                onClick={() => setRaiseAmount(Math.min(Math.floor(currentBet * 3), maxRaise))}
                className="py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                3x
              </button>
              <button
                onClick={() => setRaiseAmount(Math.floor((minRaise + maxRaise) / 2))}
                className="py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                1/2
              </button>
              <button
                onClick={() => setRaiseAmount(maxRaise)}
                className="py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Max
              </button>
            </div>

            {/* Confirm/Cancel */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowRaisePanel(false)}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRaise}
                disabled={disabled}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-colors"
              >
                {canCheck ? 'Bet' : 'Raise to'} {raiseAmount.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      {!showRaisePanel && (
        <div className="bg-gray-900/95 backdrop-blur-lg border-t border-gray-700/50 px-4 py-3 safe-area-pb">
          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              {/* Fold */}
              {canFold && (
                <button
                  onClick={() => onAction('fold')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-gray-300 font-semibold rounded-xl transition-colors"
                >
                  Fold
                </button>
              )}

              {/* Check */}
              {canCheck && (
                <button
                  onClick={() => onAction('check')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Check
                </button>
              )}

              {/* Call */}
              {canCall && (
                <button
                  onClick={() => onAction('call')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
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
                  className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <div className="text-sm">{canCheck ? 'Bet' : 'Raise'}</div>
                  <div className="text-xs opacity-80">{minRaise.toLocaleString()}+</div>
                </button>
              )}

              {/* All In */}
              {canAllIn && !canRaise && (
                <button
                  onClick={() => onAction('allin')}
                  disabled={disabled}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-xl transition-colors"
                >
                  <div className="text-sm">All In</div>
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
