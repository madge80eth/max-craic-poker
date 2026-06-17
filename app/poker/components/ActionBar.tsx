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
  const raiseAction = validActions.find(a => a.action === 'raise');
  const canFold  = validActions.some(a => a.action === 'fold');
  const canCheck = validActions.some(a => a.action === 'check');
  const canCall  = validActions.some(a => a.action === 'call');
  const canRaise = !!raiseAction;
  const canAllIn = validActions.some(a => a.action === 'allin');

  const callAmount = currentBet - playerBet;
  const minRaise   = raiseAction?.minAmount ?? 0;
  const maxRaise   = raiseAction?.maxAmount ?? 0;

  const [raiseAmt, setRaiseAmt] = useState(minRaise);

  useEffect(() => {
    if (raiseAction) setRaiseAmt(minRaise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRaise]);

  if (validActions.length === 0) return null;

  const clamp = (v: number) => Math.max(minRaise, Math.min(maxRaise, v));

  return (
    <div className="bottom-zone">
      <div className="action-panel">
        <div className="action-main">
          <div className="action-btns-col">

            <div className="action-btn-grid">
              {canFold && (
                <button
                  className="btn-action btn-fold"
                  disabled={disabled}
                  onClick={() => onAction('fold')}
                >
                  <span>Fold</span>
                </button>
              )}

              {(canCheck || canCall) && (
                <button
                  className="btn-action btn-check"
                  data-action={canCall ? 'call' : 'check'}
                  disabled={disabled}
                  onClick={() => onAction(canCall ? 'call' : 'check')}
                >
                  <span>{canCall ? 'Call' : 'Check'}</span>
                  {canCall && (
                    <span className="btn-action-sub">{callAmount.toLocaleString()}</span>
                  )}
                </button>
              )}

              {canRaise && (
                <button
                  className="btn-action btn-bet"
                  disabled={disabled}
                  onClick={() => onAction('raise', raiseAmt)}
                >
                  <span>{canCheck ? 'Bet' : 'Raise'}</span>
                  <span className="btn-action-sub">{raiseAmt.toLocaleString()}</span>
                </button>
              )}

              {canAllIn && !canRaise && (
                <button
                  className="btn-action btn-allin"
                  disabled={disabled}
                  onClick={() => onAction('allin')}
                >
                  <span>All In</span>
                  <span className="btn-action-sub">{(playerChips + playerBet).toLocaleString()}</span>
                </button>
              )}
            </div>

            {canRaise && (
              <div className="sizing-row">
                <button className="sizing-quick" onClick={() => setRaiseAmt(minRaise)}>Min</button>
                <button className="sizing-quick" onClick={() => setRaiseAmt(clamp(currentBet * 2))}>2×</button>
                <button className="sizing-quick" onClick={() => setRaiseAmt(clamp(currentBet * 3))}>3×</button>
                <button className="sizing-quick" onClick={() => setRaiseAmt(clamp(Math.floor((minRaise + maxRaise) / 2)))}>½</button>
                <button className="sizing-quick" onClick={() => setRaiseAmt(maxRaise)}>Max</button>
                <input
                  type="range"
                  className="sizing-slider"
                  min={minRaise}
                  max={maxRaise}
                  value={raiseAmt}
                  onChange={e => setRaiseAmt(parseInt(e.target.value))}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
