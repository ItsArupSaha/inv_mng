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
// Bumped on invalidation so a load that started before the mutation cannot
// write its (now stale) result back into the cache after it resolves.
const epochs = new Map<string, number>();

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

  const epoch = epochs.get(cacheKey) ?? 0;
  const load = fetcher()
    .then((value) => {
      inFlight.delete(cacheKey);
      if ((epochs.get(cacheKey) ?? 0) === epoch) {
        entries.set(cacheKey, { value, fetchedAt: Date.now() });
      }
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
  const cacheKey = key(cacheName, userId);
  entries.delete(cacheKey);
  inFlight.delete(cacheKey);
  epochs.set(cacheKey, (epochs.get(cacheKey) ?? 0) + 1);
}

/**
 * Clears every cache whose name starts with `prefix` for the user — for
 * families like `transactions:Receivable` / `transactions:Payable` or
 * per-timezone/per-date dashboard keys that can't be enumerated at the call
 * site.
 */
export function invalidateCollectionCacheFamily(prefix: string, userId: string): void {
  const stale: string[] = [];
  for (const cacheKey of entries.keys()) {
    if (cacheKey.startsWith(`${prefix}:`) && cacheKey.endsWith(`:${userId}`)) stale.push(cacheKey);
  }
  for (const flightKey of inFlight.keys()) {
    if (flightKey.startsWith(`${prefix}:`) && flightKey.endsWith(`:${userId}`)) stale.push(flightKey);
  }
  for (const cacheKey of stale) {
    entries.delete(cacheKey);
    inFlight.delete(cacheKey);
    epochs.set(cacheKey, (epochs.get(cacheKey) ?? 0) + 1);
  }
}

// Financial aggregates (dashboard stats, Business Overview, transaction
// listings) all derive from the ledger collections, so any ledger write must
// evict the whole family. Mutations call this single helper instead of
// tracking each key individually.
export function invalidateLedgerCaches(userId: string): void {
  invalidateCollectionCacheFamily('dashboard-stats', userId);
  invalidateCollectionCacheFamily('account-overview', userId);
  invalidateCollectionCacheFamily('transactions', userId);
}
