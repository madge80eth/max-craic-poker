'use client';

interface ChipStackProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showAmount?: boolean;
  className?: string;
}

// Chip colors based on value
const getChipColors = (value: number): string[] => {
  if (value >= 1000) return ['#1a1a1a', '#7c3aed', '#ea580c']; // Black, Purple, Orange
  if (value >= 500) return ['#7c3aed', '#ea580c', '#2563eb']; // Purple, Orange, Blue
  if (value >= 100) return ['#ea580c', '#2563eb', '#16a34a']; // Orange, Blue, Green
  if (value >= 25) return ['#16a34a', '#dc2626', '#f5f5f5']; // Green, Red, White
  return ['#dc2626', '#f5f5f5']; // Red, White
};

// Calculate number of chips to show (max 5)
const getChipCount = (value: number): number => {
  if (value >= 1000) return 5;
  if (value >= 500) return 4;
  if (value >= 100) return 3;
  if (value >= 25) return 2;
  return 1;
};

const sizeConfig = {
  sm: { chipWidth: 16, chipHeight: 4, spacing: 2 },
  md: { chipWidth: 24, chipHeight: 6, spacing: 3 },
  lg: { chipWidth: 32, chipHeight: 8, spacing: 4 },
};

export default function ChipStack({
  amount,
  size = 'md',
  showAmount = true,
  className = '',
}: ChipStackProps) {
  const { chipWidth, chipHeight, spacing } = sizeConfig[size];
  const chipCount = getChipCount(amount);
  const colors = getChipColors(amount);
  const totalHeight = chipCount * (chipHeight + spacing) - spacing;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Chip stack visual */}
      <div
        className="relative"
        style={{ width: chipWidth, height: totalHeight }}
      >
        {Array.from({ length: chipCount }).map((_, i) => {
          const color = colors[i % colors.length];
          const bottomOffset = i * (chipHeight + spacing);

          return (
            <div
              key={i}
              className="absolute rounded-full shadow-md"
              style={{
                width: chipWidth,
                height: chipHeight,
                bottom: bottomOffset,
                left: 0,
                background: `linear-gradient(180deg, ${color} 0%, ${adjustBrightness(color, -30)} 100%)`,
                boxShadow: `
                  inset 0 1px 0 rgba(255,255,255,0.3),
                  inset 0 -1px 0 rgba(0,0,0,0.3),
                  0 1px 2px rgba(0,0,0,0.3)
                `,
              }}
            >
              {/* Chip edge detail */}
              <div
                className="absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  height: Math.max(1, chipHeight / 3),
                  background: 'rgba(255,255,255,0.2)',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Amount label */}
      {showAmount && (
        <span className="text-yellow-400 font-bold text-xs font-mono whitespace-nowrap">
          {formatChipAmount(amount)}
        </span>
      )}
    </div>
  );
}

// Helper to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

// Format chip amount for display
function formatChipAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
}
