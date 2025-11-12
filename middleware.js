import { NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/healthz'];
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/session', '/api/healthz'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/assets')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
