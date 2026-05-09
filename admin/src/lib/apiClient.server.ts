// Server-side API client for use in Server Components and Route Handlers.
//
// Re-exports the canonical helpers so callers can import from one place.
// Services should use apiGet/apiPost/apiPatch directly; serverApiClient is
// for one-off callers that need custom RequestInit options.
export { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';

import { cookies } from 'next/headers';
import { ApiError, apiGet } from '@/lib/api';

const BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://api.amanapos.com';

const MAX_RETRIES = 2;

async function retryFetch(
  url:     string,
  options: RequestInit,
  attempt: number = 0,
): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 429 && attempt < MAX_RETRIES) {
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    return retryFetch(url, options, attempt + 1);
  }
  return res;
}

// Generic server-side fetch helper with 429 retry and optional fallback.
// Prefer the typed apiGet/apiPost/apiPatch helpers for service layer calls.
export async function serverApiClient<T>(
  path:      string,
  options:   RequestInit = {},
  fallback?: T,
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) throw new Error('Not authenticated');

  const res = await retryFetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 429) {
    console.warn(`[429] Rate limited after retries: ${path}`);
    if (fallback !== undefined) return fallback;
    throw new ApiError(429, {});
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { detail?: string })?.detail ?? `API error ${res.status}`);
  return data as T;
}
