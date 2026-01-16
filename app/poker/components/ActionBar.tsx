'use client';

import { useState } from 'react';
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

  const raiseAction = validActions.find(a => a.action === 'raise');
  const canFold = validActions.some(a => a.action === 'fold');
  const canCheck = validActions.some(a => a.action === 'check');
  const canCall = validActions.some(a => a.action === 'call');
  const canRaise = !!raiseAction;
  const canAllIn = validActions.some(a => a.action === 'allin');

  const callAmount = currentBet - playerBet;
  const minRaise = raiseAction?.minAmount || 0;
  const maxRaise = raiseAction?.maxAmount || 0;

  // Initialize raise amount when it changes
  if (raiseAction && raiseAmount < minRaise) {
    setRaiseAmount(minRaise);
  }

  if (validActions.length === 0) {
    return (
      <div className="bg-gray-800/80 backdrop-blur p-4 rounded-xl text-center">
        <span className="text-gray-400">Waiting for your turn...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur p-4 rounded-xl">
      {/* Main Actions */}
      <div className="flex gap-2 justify-center mb-3">
        {canFold && (
          <button
            onClick={() => onAction('fold')}
            disabled={disabled}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Fold
          </button>
        )}

        {canCheck && (
          <button
            onClick={() => onAction('check')}
            disabled={disabled}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Check
          </button>
        )}

        {canCall && (
          <button
            onClick={() => onAction('call')}
            disabled={disabled}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Call {callAmount}
          </button>
        )}

        {canRaise && (
          <button
            onClick={() => onAction('raise', raiseAmount)}
            disabled={disabled}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Raise to {raiseAmount}
          </button>
        )}

        {canAllIn && (
          <button
            onClick={() => onAction('allin')}
            disabled={disabled}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            All In ({playerChips + playerBet})
          </button>
        )}
      </div>

      {/* Raise Slider */}
      {canRaise && (
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm w-16">{minRaise}</span>
          <input
            type="range"
            min={minRaise}
            max={maxRaise}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
          <span className="text-gray-400 text-sm w-16 text-right">{maxRaise}</span>
        </div>
      )}

      {/* Quick Raise Buttons */}
      {canRaise && (
        <div className="flex gap-2 justify-center mt-2">
          <button
            onClick={() => setRaiseAmount(minRaise)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            Min
          </button>
          <button
            onClick={() => setRaiseAmount(Math.floor((minRaise + maxRaise) / 4))}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            1/4
          </button>
          <button
            onClick={() => setRaiseAmount(Math.floor((minRaise + maxRaise) / 2))}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            1/2
          </button>
          <button
            onClick={() => setRaiseAmount(Math.floor((minRaise + maxRaise) * 3 / 4))}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            3/4
          </button>
          <button
            onClick={() => setRaiseAmount(maxRaise)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            Max
          </button>
        </div>
      )}
    </div>
  );
}
