// Per-process read cache for full-collection reads that back client-side
// features (fuzzy medicine search, pickers, ledger joins). Several pages and
// hooks request the same collection on every mount — compounded by React
// StrictMode double-mounting in development — which streams the whole catalog
// repeatedly and exhausts Firestore's free-tier daily read quota. This layer
// deduplicates concurrent loads (in-flight promise sharing) and serves
// subsequent reads from memory until the TTL lapses or a mutation invalidates
// the entry. Server-action modules must call the invalidation helpers after
// any transaction that writes the underlying documents.

type CacheEntry<T> = { value: T; fetchedAt: number };

const entries = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export const COLLECTION_CACHE_TTL_MS = 5 * 60 * 1000;

function key(cacheName: string, userId: string): string {
  return `${cacheName}:${userId}`;
}

export async function cachedCollection<T>(
  cacheName: string,
  userId: string,
  fetcher: () => Promise<T>,
  ttlMs: number = COLLECTION_CACHE_TTL_MS
): Promise<T> {
  const cacheKey = key(cacheName, userId);
  const hit = entries.get(cacheKey) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.fetchedAt < ttlMs) {
    return hit.value;
  }

  const pending = inFlight.get(cacheKey) as Promise<T> | undefined;
  if (pending) return pending;

  const load = fetcher()
    .then((value) => {
      entries.set(cacheKey, { value, fetchedAt: Date.now() });
      inFlight.delete(cacheKey);
      return value;
    })
    .catch((error) => {
      inFlight.delete(cacheKey);
      throw error;
    });
  inFlight.set(cacheKey, load);
  return load;
}

export function invalidateCollectionCache(cacheName: string, userId: string): void {
  entries.delete(key(cacheName, userId));
}
