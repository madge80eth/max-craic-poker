'use client';

import { Sparkles } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';

interface TierBadgeProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function TierBadge({ size = 'md' }: TierBadgeProps) {
  const { isBaseApp, ticketMultiplier } = useAppContext();

  if (!isBaseApp) return null; // Only show for Base app users

  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-sm py-1.5 px-3',
    lg: 'text-base py-2 px-4'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full ${sizeClasses[size]} font-bold text-white border-2 border-blue-300/50 shadow-lg`}>
      <Sparkles className="w-4 h-4" />
      <span>{ticketMultiplier}x Base Bonus</span>
    </div>
  );
}
