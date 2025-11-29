import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCreatorIdFromHostname } from './lib/creator-context';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const creatorId = getCreatorIdFromHostname(hostname);

  // Add creator context to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-creator-id', creatorId);

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
