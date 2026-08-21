'use server';

import { collection, getDocs, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { cachedCollection } from './collection-cache';
import { readLedgerVersion } from './data-version';

// Small ledger subcollections (transactions, capital, transfers, donations)
// that the Business Overview and payable reports read in full. Each is cached
// under the `ledger-master` family and guarded by the ledger version, so the
// many per-date views share one fetch per data change instead of one per view.

type RawLedgerDoc = Record<string, unknown> & { id: string };

async function fetchRawLedgerDocs(userId: string, name: string): Promise<RawLedgerDoc[]> {
  if (!db || !userId) return [];
  const version = await readLedgerVersion(userId);
  return cachedCollection(`ledger-master:${name}`, userId, async () => {
    const snapshot = await getDocs(collection(db!, 'users', userId, name));
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as RawLedgerDoc);
  }, { version });
}

/** Every transaction doc (Receivables, Payables, payment traces), raw shape. */
export async function getRawTransactions(userId: string): Promise<RawLedgerDoc[]> {
  return fetchRawLedgerDocs(userId, 'transactions');
}

export async function getRawCapital(userId: string): Promise<RawLedgerDoc[]> {
  return fetchRawLedgerDocs(userId, 'capital');
}

export async function getRawTransfers(userId: string): Promise<RawLedgerDoc[]> {
  return fetchRawLedgerDocs(userId, 'transfers');
}

export async function getRawDonations(userId: string): Promise<RawLedgerDoc[]> {
  return fetchRawLedgerDocs(userId, 'donations');
}
