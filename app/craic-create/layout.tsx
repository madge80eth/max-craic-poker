'use client';

import { ReactNode } from 'react';
import '@coinbase/onchainkit/styles.css';

interface CraicLayoutProps {
  children: ReactNode;
}

export default function CraicLayout({ children }: CraicLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Top-left glow */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
        {/* Bottom-right glow */}
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        {/* Center subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
