'use client';

import { useEffect, useState } from 'react';

interface ActionTimerProps {
  lastActionTime: number;
  timeoutSeconds: number;
  isActive: boolean;
}

export default function ActionTimer({ lastActionTime, timeoutSeconds, isActive }: ActionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);

  useEffect(() => {
    if (!isActive) {
      setSecondsLeft(timeoutSeconds);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - lastActionTime) / 1000);
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastActionTime, timeoutSeconds, isActive]);

  if (!isActive) return null;

  const percentage = (secondsLeft / timeoutSeconds) * 100;
  const isLow = secondsLeft <= 10;
  const isCritical = secondsLeft <= 5;

  return (
    <div className="w-full">
      {/* Timer bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isCritical ? 'bg-red-500 animate-pulse' : isLow ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Timer text */}
      <div className={`text-center text-sm font-mono mt-1 ${
        isCritical ? 'text-red-400 animate-pulse font-bold' : isLow ? 'text-yellow-400' : 'text-gray-400'
      }`}>
        {secondsLeft}s
      </div>
    </div>
  );
}
