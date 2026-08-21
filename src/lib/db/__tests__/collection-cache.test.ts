import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  cachedCollection as cachedCollectionType,
  invalidateCollectionCache as invalidateCollectionCacheType,
  invalidateCollectionCacheFamily as invalidateCollectionCacheFamilyType,
  invalidateLedgerCaches as invalidateLedgerCachesType,
} from '../collection-cache';

// The cache is a module-level singleton; each test gets a fresh instance so
// entries from one test can never satisfy reads in another.
async function freshCache() {
  vi.resetModules();
  const module = await import('../collection-cache');
  return {
    cachedCollection: module.cachedCollection as typeof cachedCollectionType,
    invalidateCollectionCache: module.invalidateCollectionCache as typeof invalidateCollectionCacheType,
    invalidateCollectionCacheFamily: module.invalidateCollectionCacheFamily as typeof invalidateCollectionCacheFamilyType,
    invalidateLedgerCaches: module.invalidateLedgerCaches as typeof invalidateLedgerCachesType,
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

  it('invalidateLedgerCaches evicts dashboard, overview and transaction families', async () => {
    const cache = await freshCache();
    await cache.cachedCollection('dashboard-stats:360', 'u1', async () => 'd');
    await cache.cachedCollection('account-overview:all-time', 'u1', async () => 'o');
    await cache.cachedCollection('transactions:Payable', 'u1', async () => 't');
    await cache.cachedCollection('items', 'u1', async () => 'i');

    cache.invalidateLedgerCaches('u1');

    expect(await cache.cachedCollection('dashboard-stats:360', 'u1', async () => 'd2')).toBe('d2');
    expect(await cache.cachedCollection('account-overview:all-time', 'u1', async () => 'o2')).toBe('o2');
    expect(await cache.cachedCollection('transactions:Payable', 'u1', async () => 't2')).toBe('t2');
    // Non-ledger caches survive
    expect(await cache.cachedCollection('items', 'u1', async () => 'changed')).toBe('i');
  });
});
