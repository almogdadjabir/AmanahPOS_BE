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

export async function apiGet<T>(path: string, params?: Params, fetchOpts?: FetchOpts): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }

  // When a revalidate TTL is provided, use Next.js Data Cache (keyed by URL + headers).
  // When omitted, bypass the cache entirely so mutations and auth checks are always fresh.
  const cacheInit: RequestInit = fetchOpts?.revalidate !== undefined
    ? { next: { revalidate: fetchOpts.revalidate, ...(fetchOpts.tags?.length ? { tags: fetchOpts.tags } : {}) } as RequestInit['next'] }
    : { cache: 'no-store' };

  const res = await devFetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader(fetchOpts?.token)),
    },
    ...cacheInit,
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) redirect('/ar/login');
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await devFetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) redirect('/ar/login');
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await devFetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) redirect('/ar/login');
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await devFetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) redirect('/ar/login');
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
