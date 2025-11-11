// app/mini-app/layout.tsx
'use client';

import { Metadata } from 'next'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Ticket, BarChart3, Info } from 'lucide-react';

export const dynamic = 'force-dynamic'

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/mini-app' || path === '/mini-app/stats') {
      return pathname === path || pathname === '/mini-app' || pathname === '/mini-app/stats';
    }
    return pathname === path;
  };

  return (
    <>
      {children}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-900 via-purple-900/95 to-transparent backdrop-blur-md border-t border-white/10 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-around">

            <Link
              href="/mini-app/stats"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive('/mini-app/stats') || isActive('/mini-app')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs font-medium">Stats</span>
            </Link>

            <Link
              href="/mini-app/draw"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive('/mini-app/draw')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Ticket className="w-5 h-5" />
              <span className="text-xs font-medium">Draw</span>
            </Link>

            <Link
              href="/mini-app/leaderboard"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive('/mini-app/leaderboard')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-medium">Leaderboard</span>
            </Link>

            <Link
              href="/mini-app/info"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive('/mini-app/info')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Info className="w-5 h-5" />
              <span className="text-xs font-medium">Info</span>
            </Link>

          </div>
        </div>
      </div>
    </>
  );
}