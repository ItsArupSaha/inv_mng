import { describe, expect, it } from 'vitest';
import { applySalesMasterPatch, removeSaleMaster, upsertSaleMaster } from '../sales-master-patch';
import type { Sale } from '../types';

function makeSale(id: string, date: string, overrides: Partial<Sale> = {}): Sale {
  return {
    id,
    saleId: `SALE-${id}`,
    date,
    customerId: 'c1',
    items: [],
    subtotal: 100,
    total: 100,
    paymentMethod: 'Cash',
    ...overrides,
  } as Sale;
}

const LIST = [
  makeSale('a', '2026-08-20T10:00:00.000Z'),
  makeSale('b', '2026-08-19T10:00:00.000Z'),
  makeSale('c', '2026-08-18T10:00:00.000Z'),
];

describe('upsertSaleMaster', () => {
  it('inserts a newer sale at the front keeping date-desc order', () => {
    const next = upsertSaleMaster(LIST, makeSale('new', '2026-08-21T09:00:00.000Z'));
    expect(next.map((s) => s.id)).toEqual(['new', 'a', 'b', 'c']);
  });

  it('inserts an older sale at the correct position', () => {
    const next = upsertSaleMaster(LIST, makeSale('old', '2026-08-17T09:00:00.000Z'));
    expect(next.map((s) => s.id)).toEqual(['a', 'b', 'c', 'old']);
  });

  it('replaces an existing sale by id without duplicating', () => {
    const edited = makeSale('b', '2026-08-19T10:00:00.000Z', { total: 999 });
    const next = upsertSaleMaster(LIST, edited);
    expect(next.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    expect(next.find((s) => s.id === 'b')?.total).toBe(999);
  });

  it('is idempotent — applying the same patch twice changes nothing', () => {
    const once = upsertSaleMaster(LIST, makeSale('new', '2026-08-21T09:00:00.000Z'));
    const twice = upsertSaleMaster(once, makeSale('new', '2026-08-21T09:00:00.000Z'));
    expect(twice).toEqual(once);
  });
});

describe('removeSaleMaster', () => {
  it('removes by id and leaves the list unchanged when absent', () => {
    expect(removeSaleMaster(LIST, 'b').map((s) => s.id)).toEqual(['a', 'c']);
    expect(removeSaleMaster(LIST, 'missing')).toEqual(LIST);
  });
});

describe('applySalesMasterPatch', () => {
  it('dispatches upsert and remove patches', () => {
    expect(applySalesMasterPatch(LIST, { kind: 'remove', saleId: 'a' }).map((s) => s.id)).toEqual(['b', 'c']);
    expect(
      applySalesMasterPatch(LIST, { kind: 'upsert', sale: makeSale('new', '2026-08-21T09:00:00.000Z') })[0].id
    ).toBe('new');
  });
});
