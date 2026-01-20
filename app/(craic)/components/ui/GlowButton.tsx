'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  glow?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-br from-emerald-400 to-emerald-600
    hover:from-emerald-300 hover:to-emerald-500
    text-gray-900 font-bold
    shadow-lg shadow-emerald-500/30
    hover:shadow-xl hover:shadow-emerald-500/40
  `,
  secondary: `
    bg-gradient-to-br from-purple-400 to-purple-600
    hover:from-purple-300 hover:to-purple-500
    text-white font-bold
    shadow-lg shadow-purple-500/30
    hover:shadow-xl hover:shadow-purple-500/40
  `,
  danger: `
    bg-gradient-to-br from-red-400 to-red-600
    hover:from-red-300 hover:to-red-500
    text-white font-bold
    shadow-lg shadow-red-500/30
    hover:shadow-xl hover:shadow-red-500/40
  `,
  gold: `
    bg-gradient-to-br from-yellow-400 to-amber-500
    hover:from-yellow-300 hover:to-amber-400
    text-gray-900 font-bold
    shadow-lg shadow-yellow-500/30
    hover:shadow-xl hover:shadow-yellow-500/40
  `,
  ghost: `
    bg-white/5 hover:bg-white/10
    text-white font-medium
    border border-white/10 hover:border-white/20
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

const glowStyles: Record<ButtonVariant, string> = {
  primary: 'animate-pulse ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-[#0a0a0a]',
  secondary: 'animate-pulse ring-2 ring-purple-400/50 ring-offset-2 ring-offset-[#0a0a0a]',
  danger: 'animate-pulse ring-2 ring-red-400/50 ring-offset-2 ring-offset-[#0a0a0a]',
  gold: 'animate-pulse ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-[#0a0a0a]',
  ghost: '',
};

export default function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  glow = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: GlowButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        relative inline-flex items-center justify-center gap-2
        transition-all duration-200
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${glow && !isDisabled ? glowStyles[variant] : ''}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
