'use client';

interface TimerRingProps {
  timeLeft: number;
  maxTime: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function TimerRing({
  timeLeft,
  maxTime,
  size = 80,
  strokeWidth = 4,
  className = '',
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.max(0, Math.min(1, timeLeft / maxTime));
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on time remaining
  const getColor = () => {
    if (progress > 0.5) return '#00ff88'; // Green
    if (progress > 0.25) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getGlowColor = () => {
    if (progress > 0.5) return 'rgba(0, 255, 136, 0.5)';
    if (progress > 0.25) return 'rgba(234, 179, 8, 0.5)';
    return 'rgba(239, 68, 68, 0.5)';
  };

  const color = getColor();
  const glowColor = getGlowColor();
  const isCritical = progress <= 0.25;

  return (
    <svg
      width={size}
      height={size}
      className={`${isCritical ? 'animate-pulse' : ''} ${className}`}
      style={{
        filter: `drop-shadow(0 0 8px ${glowColor})`,
      }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
        }}
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontSize={size * 0.25}
        fontWeight="bold"
        fontFamily="monospace"
      >
        {Math.ceil(timeLeft)}
      </text>
    </svg>
  );
}
