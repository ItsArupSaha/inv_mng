import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { invalidateCollectionCache } from './collection-cache';

// The items catalog cache is guarded by a version counter stored on the user
// document. Any mutation that changes items bumps the counter in Firestore,
// so every server instance — not just the one that handled the mutation —
// refetches on its next read instead of serving stale stock. Reads pay one
// extra document read; mutations pay one extra write.

export async function readCatalogVersion(userId: string): Promise<number> {
  if (!db) return 0;
  const snapshot = await getDoc(doc(db, 'users', userId));
  return Number(snapshot.data()?.catalogVersion) || 0;
}

/**
 * Evicts the local catalog cache and bumps the shared version counter.
 * Call after any transaction that creates, updates, or deletes item docs.
 */
export async function invalidateItemsCatalog(userId: string): Promise<void> {
  invalidateCollectionCache('items', userId);
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', userId), { catalogVersion: increment(1) });
  } catch (error) {
    // The local cache is already evicted, so this instance stays correct;
    // other instances fall back to the TTL window.
    console.error('Failed to bump catalog version:', error);
  }
}
