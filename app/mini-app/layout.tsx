// app/mini-app/layout.tsx
'use client';

import { Metadata } from 'next'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Ticket, Receipt, Film, Menu } from 'lucide-react';

export const dynamic = 'force-dynamic'

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/mini-app/home') {
      return pathname === path || pathname === '/mini-app' || pathname === '/mini-app/home';
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
              href="/mini-app/home"
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                isActive('/mini-app/home')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">Home</span>
            </Link>

            <Link
              href="/mini-app/draw"
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                isActive('/mini-app/draw')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Ticket className="w-5 h-5" />
              <span className="text-xs font-medium">Draw</span>
            </Link>

            <Link
              href="/mini-app/payouts"
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                isActive('/mini-app/payouts')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-[11px] font-medium">Payouts</span>
            </Link>

            <Link
              href="/mini-app/media"
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                isActive('/mini-app/media')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Film className="w-5 h-5" />
              <span className="text-[11px] font-medium">Media</span>
            </Link>

            <Link
              href="/mini-app/more"
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                isActive('/mini-app/more')
                  ? 'bg-purple-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-medium">More</span>
            </Link>

          </div>
        </div>
      </div>
    </>
  );
}