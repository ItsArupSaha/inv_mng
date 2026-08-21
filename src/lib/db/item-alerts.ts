'use server';

import { getItems } from './items';
import { countItemAlerts } from '../item-alert-math';

// Alert counts derive from the version-guarded catalog cache (see
// collection-cache.ts / data-version.ts): one cheap version read when the
// cache is current, a fresh catalog fetch only after real stock mutations.
// Querying Firestore directly with `where('expiryDate', '<=', cutoff)` or
// `where('stock', '<', 1)` instead returns every expired / out-of-stock
// document — in a long-lived pharmacy catalog that is easily a thousand-plus
// reads per check, and the sidebar re-checks on every tab focus.

/** Both badge counts in one catalog pass — used by the sidebar. */
export async function getAlertCounts(userId: string, withinDays: number) {
  if (!userId) return { expiring: 0, lowStock: 0 };
  return countItemAlerts(await getItems(userId), withinDays);
}

export async function countExpiringItems(userId: string, withinDays: number): Promise<number> {
  if (!userId) return 0;
  return countItemAlerts(await getItems(userId), withinDays).expiring;
}

export async function countLowStockSalableItems(userId: string): Promise<number> {
  if (!userId) return 0;
  return countItemAlerts(await getItems(userId), 90).lowStock;
}
