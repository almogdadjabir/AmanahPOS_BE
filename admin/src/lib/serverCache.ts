import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';

export async function withUserCache<T>(
  fetcher:    (token: string) => Promise<T>,
  tags:       string[],
  revalidate: number,
): Promise<T | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value ?? 'no-token';

  const cached = unstable_cache(
    async (tok: string): Promise<T | null> => {
      try {
        return await fetcher(tok);
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        if (status === 429) {
          console.warn(`[cache] 429 on "${tags[0]}" — caching null for ${revalidate}s`);
          return null;
        }
        console.error(`[cache] error on "${tags[0]}":`, err);
        return null;
      }
    },
    [...tags, token.slice(-16)],
    { tags, revalidate: revalidate === 0 ? false : revalidate },
  );

  return cached(token);
}
