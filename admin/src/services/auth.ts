import { cache }          from 'react';
import { unstable_cache } from 'next/cache';
import { cookies }        from 'next/headers';
import { CACHE_TAGS }     from '@/lib/cacheTags';
import type { UserProfile } from '@/types/api';

const BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://api.amanapos.com';

// React.cache()  — deduplicates concurrent calls within the same render
//                  (layout + page both call this → one promise shared)
// unstable_cache — persists across navigations for 120s
//
// CRITICAL: the inner fetch returns null on 429 instead of throwing.
// unstable_cache only stores RETURNED values. A throw is never cached,
// so the next render would be a cache miss and hit the throttled API again.
// null is a valid return value and gets stored, so subsequent renders within
// the 120s TTL skip the network entirely.
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  // Fast path: profile was stored in the session cookie at login time.
  // Zero API calls — this is the normal path for every page load.
  const profileCookie = cookieStore.get('user_profile')?.value;
  if (profileCookie) {
    try {
      return JSON.parse(profileCookie) as UserProfile;
    } catch {
      // Malformed cookie — fall through to API
    }
  }

  // Slow path: cookie missing (first load after login cookie expires, or
  // login response did not include a user object).
  // Returns null on 429 so unstable_cache stores null and subsequent renders
  // skip the API entirely for the 120s TTL window.
  const fetcher = unstable_cache(
    async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/auth/profile/`, {
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (res.status === 429) {
          console.warn('[auth] profile rate-limited — caching null for 120s');
          return null;
        }

        if (res.status === 401 || res.status === 403) return null;
        if (!res.ok) return null;

        const data = await res.json();
        return (data?.data ?? null) as UserProfile | null;
      } catch {
        return null;
      }
    },
    [CACHE_TAGS.profile, token.slice(-16)],
    { tags: [CACHE_TAGS.profile], revalidate: 120 },
  );

  return fetcher();
});

export function isPlatformAdmin(user: UserProfile): boolean {
  return user.is_staff === true;
}

export function isBusinessOwner(user: UserProfile): boolean {
  return !user.is_staff && user.role === 'owner';
}
