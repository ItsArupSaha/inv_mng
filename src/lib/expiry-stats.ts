import type { Item } from './types';

/**
 * Expiry tiers for the alert dashboard. Bands are mutually exclusive so the
 * summary cards never double-count one item.
 */
export type ExpiryTier = 'expired' | 'within30d' | 'within60d' | 'within90d';

export interface ExpiryTierSummary {
  count: number;
  value: number; // stock × cost: money paid for stock sitting in this band
}

function bandEnd(now: Date, days: number): number {
  const end = new Date(now);
  end.setDate(now.getDate() + days);
  return end.getTime();
}

/**
 * Money paid for an item's current stock — the amount at risk if the stock
 * expires unsold.
 */
export function itemStockValue(item: Item): number {
  return (Number(item.stock) || 0) * (Number(item.productionPrice) || 0);
}

export function summarizeExpiryTiers(items: Item[], now = new Date()): Record<ExpiryTier, ExpiryTierSummary> {
  const t30 = bandEnd(now, 30);
  const t60 = bandEnd(now, 60);
  const t90 = bandEnd(now, 90);

  const summary: Record<ExpiryTier, ExpiryTierSummary> = {
    expired: { count: 0, value: 0 },
    within30d: { count: 0, value: 0 },
    within60d: { count: 0, value: 0 },
    within90d: { count: 0, value: 0 },
  };

  for (const item of items) {
    if (!item.expiryDate) continue;
    const stock = Number(item.stock) || 0;
    if (stock <= 0) continue; // nothing on the shelf, nothing at risk

    const exp = new Date(item.expiryDate).getTime();
    const value = stock * (Number(item.productionPrice) || 0);

    let tier: ExpiryTier | null = null;
    if (exp <= now.getTime()) tier = 'expired';
    else if (exp <= t30) tier = 'within30d';
    else if (exp <= t60) tier = 'within60d';
    else if (exp <= t90) tier = 'within90d';

    if (tier) {
      summary[tier].count += 1;
      summary[tier].value += value;
    }
  }

  return summary;
}

export const EXPIRY_FILTER_LABELS: Record<string, string> = {
  expired: 'Expired',
  expiringSoon: 'Expiring within 30 days',
  expiring30d: 'Expiring within 30 days',
  expiring60d: 'Expiring within 60 days',
  expiring90d: 'Expiring within 90 days',
  all: 'All expiry dates',
};

export function expiryFilterLabel(statusFilter: string): string {
  return EXPIRY_FILTER_LABELS[statusFilter] || 'Expiry Report';
}
