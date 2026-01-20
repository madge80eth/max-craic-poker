import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCreatorIdFromHostname } from './lib/creator-context';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const creatorId = getCreatorIdFromHostname(hostname);

  // Handle craicprotocol.com and maxcraic.com domains
  const isCraicDomain = hostname.includes('craicprotocol.com') ||
                        hostname.includes('maxcraic.com');

  // Serve Craic Protocol manifest for craic domains
  if (isCraicDomain && pathname === '/.well-known/farcaster.json') {
    return NextResponse.rewrite(new URL('/craic/.well-known/farcaster.json', request.url));
  }

  // Redirect root to Craic Protocol app for craic domains
  if (isCraicDomain && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/craic-home';
    return NextResponse.rewrite(url);
  }

  // Rewrite /create, /game/* paths to (craic) routes for craic domains
  if (isCraicDomain) {
    if (pathname === '/create') {
      return NextResponse.rewrite(new URL('/craic-create', request.url));
    }
    if (pathname.startsWith('/game/')) {
      const gameId = pathname.replace('/game/', '');
      if (pathname.includes('/play')) {
        return NextResponse.rewrite(new URL(`/craic-game/${gameId}/play`, request.url));
      }
      return NextResponse.rewrite(new URL(`/craic-game/${gameId}`, request.url));
    }
  }

  // Add creator context to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-creator-id', creatorId);
  requestHeaders.set('x-is-craic-domain', isCraicDomain ? 'true' : 'false');

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
