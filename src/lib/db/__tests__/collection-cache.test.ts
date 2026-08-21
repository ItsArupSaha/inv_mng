import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  cachedCollection as cachedCollectionType,
  invalidateCollectionCache as invalidateCollectionCacheType,
  invalidateCollectionCacheFamily as invalidateCollectionCacheFamilyType,
} from '../collection-cache';
import type { invalidateAppData as invalidateAppDataType } from '../data-version';

// The cache is a process-wide singleton (state lives on globalThis so every
// module instance shares it); each test clears that shared store so entries
// from one test can never satisfy reads in another.
async function freshCache() {
  const globalStore = globalThis as typeof globalThis & {
    __pharmoraCollectionCache?: {
      entries: Map<string, unknown>;
      inFlight: Map<string, unknown>;
      epochs: Map<string, number>;
    };
  };
  const store = (globalStore.__pharmoraCollectionCache ??= {
    entries: new Map(),
    inFlight: new Map(),
    epochs: new Map(),
  });
  store.entries.clear();
  store.inFlight.clear();
  store.epochs.clear();
  const module = await import('../collection-cache');
  return {
    cachedCollection: module.cachedCollection as typeof cachedCollectionType,
    invalidateCollectionCache: module.invalidateCollectionCache as typeof invalidateCollectionCacheType,
    invalidateCollectionCacheFamily: module.invalidateCollectionCacheFamily as typeof invalidateCollectionCacheFamilyType,
    patchCachedCollection: module.patchCachedCollection.bind(null) as typeof module.patchCachedCollection,
    invalidateAppData: (await import('../data-version')).invalidateAppData as typeof invalidateAppDataType,
  };
}

describe('collection-cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves subsequent reads from cache within the TTL', async () => {
    const cache = await freshCache();
    const fetcher = vi.fn().mockResolvedValue(['a']);
    await cache.cachedCollection('items', 'u1', fetcher);
    await cache.cachedCollection('items', 'u1', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await cache.cachedCollection('items', 'u1', fetcher)).toEqual(['a']);
  });

  it('refetches after the TTL lapses', async () => {
    const cache = await freshCache();
    const fetcher = vi.fn().mockResolvedValue(1);
    await cache.cachedCollection('items', 'u1', fetcher);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await cache.cachedCollection('items', 'u1', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight promise between concurrent callers', async () => {
    const cache = await freshCache();
    let resolve: (v: number) => void = () => {};
    const fetcher = vi.fn().mockImplementation(() => new Promise<number>((r) => { resolve = r; }));
    const first = cache.cachedCollection('items', 'u1', fetcher);
    const second = cache.cachedCollection('items', 'u1', fetcher);
    resolve(42);
    expect(await first).toBe(42);
    expect(await second).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('isolates cache entries per user', async () => {
    const cache = await freshCache();
    const fetcher = vi.fn().mockImplementation(async (uid: string) => uid);
    await cache.cachedCollection('items', 'u1', () => fetcher('u1'));
    await cache.cachedCollection('items', 'u2', () => fetcher('u2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidation forces a refetch and drops a pending stale write', async () => {
    const cache = await freshCache();
    let resolve: (v: string) => void = () => {};
    const fetcher = vi.fn().mockImplementation(() => new Promise<string>((r) => { resolve = r; }));
    const stale = cache.cachedCollection('items', 'u1', fetcher);
    cache.invalidateCollectionCache('items', 'u1');
    resolve('stale-value');
    await stale;

    const fresh = await cache.cachedCollection('items', 'u1', async () => 'fresh-value');
    expect(fresh).toBe('fresh-value');
  });

  it('family invalidation clears prefixed keys for the user only', async () => {
    const cache = await freshCache();
    await cache.cachedCollection('transactions:Receivable', 'u1', async () => 'r1');
    await cache.cachedCollection('transactions:Payable', 'u1', async () => 'p1');
    await cache.cachedCollection('transactions:Receivable', 'u2', async () => 'r2');

    cache.invalidateCollectionCacheFamily('transactions', 'u1');

    expect(await cache.cachedCollection('transactions:Receivable', 'u1', async () => 'r1-new')).toBe('r1-new');
    expect(await cache.cachedCollection('transactions:Payable', 'u1', async () => 'p1-new')).toBe('p1-new');
    expect(await cache.cachedCollection('transactions:Receivable', 'u2', async () => 'untouched')).toBe('r2');
  });

  it('invalidateAppData evicts ledger families and keeps catalog-only caches when scoped', async () => {
    const cache = await freshCache();
    await cache.cachedCollection('sales-master', 'u1', async () => 's');
    await cache.cachedCollection('transactions:Payable', 'u1', async () => 't');
    await cache.cachedCollection('dashboard-stats:360', 'u1', async () => 'd');
    await cache.cachedCollection('items', 'u1', async () => 'i');

    await cache.invalidateAppData('u1', { scope: 'ledger' });

    expect(await cache.cachedCollection('sales-master', 'u1', async () => 's2')).toBe('s2');
    expect(await cache.cachedCollection('transactions:Payable', 'u1', async () => 't2')).toBe('t2');
    expect(await cache.cachedCollection('dashboard-stats:360', 'u1', async () => 'd2')).toBe('d2');
    // Catalog caches survive a ledger-only invalidation
    expect(await cache.cachedCollection('items', 'u1', async () => 'changed')).toBe('i');
  });

  it('patchCachedCollection patches a fresh entry in place and no-ops otherwise', async () => {
    const cache = await freshCache();
    await cache.cachedCollection('sales-master', 'u1', async () => ['a', 'b'], { version: 5 });

    const patched = cache.patchCachedCollection<string[]>('sales-master', 'u1', 6, (v) => [...v, 'c']);
    expect(patched).toBe(true);
    // Same value served with no fetcher call, now stamped with the new version
    expect(await cache.cachedCollection('sales-master', 'u1', async () => ['x'], { version: 6 })).toEqual(['a', 'b', 'c']);

    // Missing entry → no-op, returns false
    expect(cache.patchCachedCollection<string[]>('sales-master', 'u2', 6, (v) => v)).toBe(false);

    // Stale entry (past TTL) → no-op
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(cache.patchCachedCollection<string[]>('sales-master', 'u1', 7, (v) => [...v, 'd'])).toBe(false);
  });

  it('refetches when the caller-supplied version changes, even inside the TTL', async () => {
    const cache = await freshCache();
    const fetcher = vi.fn().mockResolvedValue('v1-data');
    expect(await cache.cachedCollection('items', 'u1', fetcher, { version: 3 })).toBe('v1-data');
    // Same version → cache hit
    await cache.cachedCollection('items', 'u1', fetcher, { version: 3 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    // Different version (another server instance saw the bump) → refetch
    expect(await cache.cachedCollection('items', 'u1', async () => 'v2-data', { version: 4 })).toBe('v2-data');
  });
});
