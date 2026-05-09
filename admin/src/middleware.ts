import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

const handleI18n = createMiddleware(routing);

function isTokenExpired(token: string): boolean {
  try {
    const b64     = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return (payload.exp ?? 0) * 1000 < Date.now();
  } catch {
    return true;
  }
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token        = req.cookies.get('auth_token')?.value;
  const refresh      = req.cookies.get('auth_refresh_token')?.value;
  const isLoginPage  = /\/(ar|en)?\/?(login)/.test(pathname);
  const locale       = pathname.match(/^\/(ar|en)/)?.[1] || 'ar';

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  if (token && !isLoginPage && isTokenExpired(token)) {
    if (refresh) {
      const refreshUrl = new URL('/api/auth/refresh', req.url);
      refreshUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(refreshUrl);
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  return handleI18n(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|\\.well-known|.*\\..*).*)'],
};
