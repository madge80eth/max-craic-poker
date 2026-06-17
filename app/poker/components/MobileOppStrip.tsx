'use client';

import { useEffect, useState } from 'react';
import { ClientPlayer } from '@/lib/poker/types';
import Card from './Card';

interface MobileOppStripProps {
  opponents: ClientPlayer[];
  activeOppSeatIndex: number | null;
  lastActionTime: number;
  actionTimeout: number;
}

function getActionBadge(player: ClientPlayer, isActive: boolean): { text: string; color: string } | null {
  if (player.sitOut && !player.folded) return { text: 'Sit Out', color: '#6b7280' };
  if (player.allIn) return { text: 'All In', color: '#dc2626' };
  if (player.folded) return { text: 'Fold', color: '#374151' };
  if (!player.sitOut && player.consecutiveTimeouts >= 2 && !player.folded)
    return { text: 'AFK', color: '#dc2626' };
  if (player.lastAction && !isActive) {
    const labels: Record<string, string> = {
      check: 'Check', call: 'Call', raise: 'Raise', fold: 'Fold', allin: 'All In',
    };
    return { text: labels[player.lastAction] || player.lastAction, color: '#22c55e' };
  }
  return null;
}

export default function MobileOppStrip({
  opponents, activeOppSeatIndex, lastActionTime, actionTimeout,
}: MobileOppStripProps) {
  const [timeLeft, setTimeLeft] = useState(actionTimeout);
  const isAnyActive = activeOppSeatIndex !== null;

  useEffect(() => {
    if (!isAnyActive) { setTimeLeft(actionTimeout); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - lastActionTime) / 1000);
      setTimeLeft(Math.max(0, actionTimeout - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isAnyActive, lastActionTime, actionTimeout]);

  if (opponents.length === 0) return null;

  const timerPct = isAnyActive ? (timeLeft / actionTimeout) * 100 : 0;
  const isCritical = timeLeft <= 5;
  const isLowTime = timeLeft <= 10;
  const timerColor = isCritical ? '#ef4444' : isLowTime ? '#eab308' : '#22c55e';

  return (
    <div className="mobile-opp-strip">
      <div className="mobile-opp-players">
        {opponents.map((opp) => {
          const isActive = opp.seatIndex === activeOppSeatIndex;
          const badge = getActionBadge(opp, isActive);
          const opacity = opp.folded ? 0.4 : opp.sitOut ? 0.5 : 1;
          const displayName = opp.name.length > 12 ? opp.name.slice(0, 11) + '…' : opp.name;

          return (
            <div key={opp.odentity} className="mobile-opp-player" style={{ opacity }}>
              <div
                className="mobile-opp-avatar"
                style={isActive ? { borderColor: timerColor, borderWidth: 2 } : undefined}
              >
                {opp.name.charAt(0).toUpperCase()}
              </div>
              <div className="mobile-opp-info">
                <div className="mobile-opp-name">{displayName}</div>
                <div className="mobile-opp-stack">{opp.chips.toLocaleString()}</div>
                {badge && (
                  <div className="mobile-opp-action" style={{ background: badge.color }}>
                    {badge.text}
                  </div>
                )}
              </div>
              {!opp.folded && (
                <div className="mobile-opp-hole-cards">
                  {opp.holeCards ? (
                    <>
                      <Card card={opp.holeCards[0]} size="xs" />
                      <Card card={opp.holeCards[1]} size="xs" />
                    </>
                  ) : (
                    <>
                      <div className="mobile-opp-card-back" />
                      <div className="mobile-opp-card-back" />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mobile-timer-bar">
        {isAnyActive && (
          <div
            className="mobile-timer-bar-fill"
            style={{ width: `${timerPct}%`, background: timerColor }}
          />
        )}
      </div>
    </div>
  );
}
