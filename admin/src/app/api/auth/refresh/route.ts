import { NextRequest, NextResponse } from 'next/server';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// POST handler: safety net for any POST request that reaches this route
// (e.g., edge cases where a redirect is followed as POST).
// Behaves identically to GET — refresh the token and redirect to login on failure.
export async function POST(req: NextRequest) {
  return GET(req);
}

export async function GET(req: NextRequest) {
  const redirectTo = req.nextUrl.searchParams.get('redirect') || '/ar';
  const locale     = redirectTo.match(/^\/(ar|en)/)?.[1] || 'ar';
  const loginUrl   = new URL(`/${locale}/login`, req.url);

  const refreshToken = req.cookies.get('auth_refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const res = await fetch(`${API()}/api-public/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!res.ok) throw new Error('refresh failed');

    const data            = await res.json();
    const newAccessToken: string = data?.data?.access ?? data?.access ?? '';
    if (!newAccessToken) throw new Error('no access token');

    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    response.cookies.set('auth_token', newAccessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    response.cookies.delete('auth_refresh_token');
    return response;
  }
}
