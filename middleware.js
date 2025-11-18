import { NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/healthz'];
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/session', '/api/healthz'];
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/healthz'
];

function isPublicPage(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isPublicApi(pathname) {
  return PUBLIC_API_PATHS.some((path) => pathname === path);
}

function hasValidSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1) Rutas que NO deben pasar por auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/.well-known')
  ) {
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

  const isPagePublic = isPublicPage(pathname);
  const isApiPublic = isPublicApi(pathname);
  const isApi = pathname.startsWith('/api');
  const isAuth = hasValidSession(request);

  // 2) APIs
  if (isApi) {
    if (isApiPublic) return NextResponse.next();

    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.next();
  }

  // 3) Páginas: no autenticado → al login
  if (!isAuth && !isPagePublic) {
    const loginUrl = new URL('/login', request.url);

    // Guardamos "next" solo para rutas normales
    if (pathname !== '/login') {
      loginUrl.searchParams.set('next', pathname || '/');
    }

    return NextResponse.redirect(loginUrl);
  }

  // 4) Páginas: autenticado en login → redirigir a "next" o raíz
  if (isAuth && isPagePublic) {
    const url = new URL(request.url);
    const nextParam = request.nextUrl.searchParams.get('next');

    url.pathname = nextParam && nextParam.startsWith('/') ? nextParam : '/';
    url.search = '';

    return NextResponse.redirect(url);
  }

  // 5) Caso por defecto
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|.well-known).*)']
};
