import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { devFetch } from './dev-logger';

const BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://api.amanapos.com';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API error ${status}`);
    this.name = 'ApiError';
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

// Per-call cache config forwarded to Next.js Data Cache.
export type FetchOpts = {
  revalidate?: number;   // seconds — omit to bypass cache entirely
  tags?: string[];
  token?: string;        // pre-read token; avoids calling cookies() inside unstable_cache
};

async function authHeader(tokenOverride?: string): Promise<Record<string, string>> {
  const token = tokenOverride ?? (await cookies()).get('auth_token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

/**
 * When the backend returns 401, attempt a silent token refresh then retry once.
 * If the refresh token is missing or expired, delete both cookies and redirect
 * to the login page so the user is never silently stuck.
 *
 * This runs server-side (server actions / route handlers) where cookies() is
 * writable. For server components the middleware already handles proactive
 * refresh before the component even renders.
 */
async function tryRefreshAndRetry(
  retryFn: (newToken: string) => Promise<Response>,
  locale = 'ar',
): Promise<Response> {
  const cookieStore  = await cookies();
  const refreshToken = cookieStore.get('auth_refresh_token')?.value;

  if (!refreshToken) {
    redirect(`/${locale}/login`);
  }

  const refreshRes = await fetch(`${BASE}/api-public/v1/auth/token/refresh/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh: refreshToken }),
    cache:   'no-store',
  });

  if (!refreshRes.ok) {
    // Refresh token expired or revoked — clear cookies and force login
    try {
      cookieStore.delete('auth_token');
      cookieStore.delete('auth_refresh_token');
    } catch { /* read-only context (server component) — middleware will handle it */ }
    redirect(`/${locale}/login`);
  }

  const data = await refreshRes.json();
  const newToken: string = data?.data?.access ?? data?.access ?? '';

  if (!newToken) {
    redirect(`/${locale}/login`);
  }

  try {
    cookieStore.set('auth_token', newToken, COOKIE_OPTS);
  } catch { /* read-only context — new token will be set on next GET navigation */ }

  return retryFn(newToken);
}

export async function apiGet<T>(path: string, params?: Params, fetchOpts?: FetchOpts): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const cacheInit: RequestInit = fetchOpts?.revalidate !== undefined
    ? { next: { revalidate: fetchOpts.revalidate, ...(fetchOpts.tags?.length ? { tags: fetchOpts.tags } : {}) } as RequestInit['next'] }
    : { cache: 'no-store' };

  const doFetch = async (token?: string) => devFetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(token ?? fetchOpts?.token)),
    },
    ...cacheInit,
  });

  let res = await doFetch();

  if (res.status === 401 && !fetchOpts?.token) {
    res = await tryRefreshAndRetry((newToken) => doFetch(newToken));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const doFetch = async (token?: string) => devFetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(token)),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  let res = await doFetch();

  if (res.status === 401) {
    res = await tryRefreshAndRetry((newToken) => doFetch(newToken));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const doFetch = async (token?: string) => devFetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(token)),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  let res = await doFetch();

  if (res.status === 401) {
    res = await tryRefreshAndRetry((newToken) => doFetch(newToken));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const doFetch = async (token?: string) => devFetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(token)),
    },
    cache: 'no-store',
  });

  let res = await doFetch();

  if (res.status === 401) {
    res = await tryRefreshAndRetry((newToken) => doFetch(newToken));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
