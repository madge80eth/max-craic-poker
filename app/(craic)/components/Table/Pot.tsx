'use client';

import ChipStack from '../ui/ChipStack';

interface PotProps {
  amount: number;
  sidePots?: { amount: number; eligiblePlayers: string[] }[];
  animate?: boolean;
}

export default function Pot({ amount, sidePots, animate = false }: PotProps) {
  if (amount <= 0) return null;

  const formatAmount = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${animate ? 'animate-pulse' : ''}`}>
      {/* Main pot */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/90 backdrop-blur-sm rounded-full border border-gray-700/50 shadow-xl">
        {/* Chip visual */}
        <div className="relative">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg ring-2 ring-amber-500/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-none">
            Pot
          </span>
          <span className="text-yellow-400 font-bold text-lg leading-none">
            {formatAmount(amount)}
          </span>
        </div>
      </div>

      {/* Side pots */}
      {sidePots && sidePots.length > 0 && (
        <div className="flex gap-2">
          {sidePots.map((sidePot, i) => (
            <div
              key={i}
              className="px-2 py-1 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/30 text-xs"
            >
              <span className="text-gray-400">Side {i + 1}: </span>
              <span className="text-yellow-400 font-semibold">{formatAmount(sidePot.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
