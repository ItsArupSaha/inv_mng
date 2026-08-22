import type { Item } from './types';

// Pure badge-count math, kept separate from the data modules (db
// files may only export async functions) so it stays unit-testable.

function isoDateFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function countItemAlerts(items: Item[], withinDays: number) {
  const cutoff = isoDateFromToday(withinDays);
  const expiring = items.filter(
    (item) => item.expiryDate && item.expiryDate <= cutoff && item.stock > 0
  ).length;
  const lowStock = items.filter(
    (item) => item.isSalable !== false && item.stock < 1
  ).length;
  return { expiring, lowStock };
}
