'use client';

// Singleton map of currently in-flight requests.
// If the same key is requested while one is in-flight, the caller receives
// the SAME promise — no duplicate network call goes out.
const inFlight = new Map<string, Promise<unknown>>();

export async function deduplicatedFetch<T>(
  key:     string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
