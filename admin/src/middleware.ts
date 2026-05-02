import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';

const handleI18n = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('auth_token')?.value;
  const isLoginPage = /\/(ar|en)?\/?(login)/.test(pathname);

  if (!token && !isLoginPage) {
    const locale = pathname.match(/^\/(ar|en)/)?.[1] || 'ar';
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  if (token && isLoginPage) {
    const locale = pathname.match(/^\/(ar|en)/)?.[1] || 'ar';
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  return handleI18n(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|\\.well-known|.*\\..*).*)'],
};
