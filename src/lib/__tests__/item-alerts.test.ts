import { describe, it, expect } from 'vitest';
import { countItemAlerts } from '../item-alert-math';
import type { Item } from '../types';

const item = (over: Partial<Item>): Item => ({
  id: Math.random().toString(36).slice(2),
  title: 'Med',
  categoryId: 'c',
  categoryName: 'Tablet',
  productionPrice: 1,
  sellingPrice: 2,
  stock: 10,
  ...over,
});

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('countItemAlerts', () => {
  it('counts near-expiry in-stock items only', () => {
    const { expiring } = countItemAlerts(
      [
        item({ expiryDate: daysFromNow(30) }),            // in window, in stock
        item({ expiryDate: daysFromNow(30), stock: 0 }),  // in window, no stock
        item({ expiryDate: daysFromNow(400) }),           // far expiry
        item({}),                                          // no expiry
      ],
      90
    );
    expect(expiring).toBe(1);
  });

  it('counts low-stock salable items only', () => {
    const { lowStock } = countItemAlerts(
      [
        item({ stock: 0 }),
        item({ stock: 0.5 }),
        item({ stock: 0, isSalable: false }), // asset, excluded
        item({ stock: 5 }),
      ],
      90
    );
    expect(lowStock).toBe(2);
  });
});
