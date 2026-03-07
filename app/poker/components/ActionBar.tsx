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

  useEffect(() => {
    if (raiseAction) {
      setRaiseAmount(minRaise);
      setShowRaisePanel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRaise]);

  if (validActions.length === 0) return null;

  const handleRaise = () => {
    onAction('raise', raiseAmount);
    setShowRaisePanel(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Raise slider panel */}
      {showRaisePanel && canRaise && (
        <div style={{ background: 'rgba(10, 12, 18, 0.97)' }} className="border-t border-gray-800 px-4 py-3">
          <div className="max-w-md mx-auto">
            {/* Amount */}
            <div className="text-center mb-3">
              <span className="text-xl font-bold text-white">{raiseAmount.toLocaleString()}</span>
            </div>

            {/* Slider */}
            <div className="mb-3">
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:bg-red-500
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>{minRaise.toLocaleString()}</span>
                <span>{maxRaise.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {['Min', '2x', '3x', '1/2', 'Max'].map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === 'Min') setRaiseAmount(minRaise);
                    else if (label === '2x') setRaiseAmount(Math.min(Math.floor(currentBet * 2), maxRaise));
                    else if (label === '3x') setRaiseAmount(Math.min(Math.floor(currentBet * 3), maxRaise));
                    else if (label === '1/2') setRaiseAmount(Math.floor((minRaise + maxRaise) / 2));
                    else setRaiseAmount(maxRaise);
                  }}
                  className="py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Confirm / Cancel */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowRaisePanel(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRaise}
                disabled={disabled}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors text-sm"
              >
                {canCheck ? 'Bet' : 'Raise'} {raiseAmount.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main action buttons */}
      {!showRaisePanel && (
        <div style={{ background: 'rgba(10, 12, 18, 0.97)' }} className="border-t border-gray-800 px-3 py-3 safe-area-pb">
          <div className="max-w-md mx-auto flex gap-2">
            {/* Fold */}
            {canFold && (
              <button
                onClick={() => onAction('fold')}
                disabled={disabled}
                className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 font-semibold rounded-lg transition-colors text-sm"
              >
                Fold
              </button>
            )}

            {/* Check */}
            {canCheck && (
              <button
                onClick={() => onAction('check')}
                disabled={disabled}
                className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Check
              </button>
            )}

            {/* Call */}
            {canCall && (
              <button
                onClick={() => onAction('call')}
                disabled={disabled}
                className="flex-1 py-3.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Call {callAmount.toLocaleString()}
              </button>
            )}

            {/* Raise / Bet */}
            {canRaise && (
              <button
                onClick={() => setShowRaisePanel(true)}
                disabled={disabled}
                className="flex-1 py-3.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {canCheck ? 'Bet' : 'Raise'}
              </button>
            )}

            {/* All In (only when can't raise) */}
            {canAllIn && !canRaise && (
              <button
                onClick={() => onAction('allin')}
                disabled={disabled}
                className="flex-1 py-3.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-lg transition-colors text-sm"
              >
                All In {(playerChips + playerBet).toLocaleString()}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
