import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'sf_session';
const HOME_PATH = '/';

/**
 * @param {import('next/server').NextRequest} req
 */
export function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;
  const isAuth = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isLogin = pathname === '/login';
  const isApi   = pathname.startsWith('/api');
  const isStatic =
    pathname.startsWith('/_next') || pathname === '/favicon.ico';

  // 0) Nunca tocamos estáticos
  if (isStatic) {
    return NextResponse.next();
  }

  // 1) Rutas de login
  if (isLogin) {
    // Si YA está autenticado y entra a /login → mandarlo al HOME_PATH o al "next"
    if (isAuth) {
      const nextParam = searchParams.get('next');
      const target =
        nextParam && nextParam !== '/login' ? nextParam : HOME_PATH;

      const url = req.nextUrl.clone();
      url.pathname = target;
      url.search = '';
      return NextResponse.redirect(url);
    }

    // No autenticado → dejar ver /login sin tocar nada
    return NextResponse.next();
  }

  // 2) API de auth (login/logout) u otras API → las dejamos pasar
  if (isApi) {
    return NextResponse.next();
  }

  // 3) Rutas protegidas (todo lo demás)
  if (!isAuth) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';

    url.search = '';
    const nextPath = pathname === '/' ? HOME_PATH : pathname;
    url.searchParams.set('next', nextPath);

    return NextResponse.redirect(url);
  }

  // 4) Autenticado en ruta protegida → continuar
  return NextResponse.next();
}

// Matcher genérico, el filtro real lo hacemos dentro
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
