'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'green' | 'orange' | 'purple' | 'gold' | 'red' | 'blue' | 'gray';
type BadgeSize = 'sm' | 'md' | 'lg';

interface NeonBadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  glow?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const glowStyles: Record<BadgeVariant, string> = {
  green: 'shadow-[0_0_10px_rgba(0,255,136,0.3)]',
  orange: 'shadow-[0_0_10px_rgba(255,107,53,0.3)]',
  purple: 'shadow-[0_0_10px_rgba(139,92,246,0.3)]',
  gold: 'shadow-[0_0_10px_rgba(255,215,0,0.3)]',
  red: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  blue: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
  gray: '',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function NeonBadge({
  children,
  variant = 'green',
  size = 'md',
  glow = false,
  pulse = false,
  className = '',
}: NeonBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-semibold uppercase tracking-wider
        rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${glow ? glowStyles[variant] : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
