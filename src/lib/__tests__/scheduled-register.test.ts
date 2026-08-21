import { describe, it, expect } from 'vitest';
import { buildScheduledRegisterRows } from '../scheduled-register';
import type { Customer, Item, Sale } from '../types';

const item = (id: string, title: string, schedule?: Item['schedule']): Item => ({
  id,
  title,
  categoryId: 'c1',
  categoryName: 'Tablet',
  productionPrice: 5,
  sellingPrice: 10,
  stock: 100,
  schedule,
});

const customer = (id: string, name: string): Customer => ({
  id,
  name,
  phone: '01700000000',
  address: '',
  openingBalance: 0,
  dueBalance: 0,
});

const sale = (id: string, date: string, lines: Sale['items'], extra: Partial<Sale> = {}): Sale => ({
  id,
  saleId: id,
  date,
  customerId: 'cust-1',
  items: lines,
  subtotal: 100,
  discountType: 'none',
  discountValue: 0,
  total: 100,
  paymentMethod: 'Cash',
  ...extra,
});

describe('buildScheduledRegisterRows', () => {
  const items = new Map<string, Item>([
    ['n1', item('n1', 'Pethidine 50mg', 'narcotic')],
    ['c1', item('c1', 'Alprazolam 0.5mg', 'controlled')],
    ['o1', item('o1', 'Napa 500mg')],
  ]);
  const customers = new Map<string, Customer>([
    ['cust-1', customer('cust-1', 'Rahim')],
    ['cust-2', customer('cust-2', 'Karim')],
  ]);

  it('emits one row per scheduled line and skips ordinary medicines', () => {
    const sales = [
      sale('SALE-0001', '2026-08-01T10:00:00.000Z', [
        { itemId: 'n1', quantity: 2, price: 50 },
        { itemId: 'o1', quantity: 1, price: 10 },
      ], { prescriptionRef: 'Rx-11' }),
    ];
    const rows = buildScheduledRegisterRows(sales, items, customers);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      saleId: 'SALE-0001',
      medicine: 'Pethidine 50mg',
      schedule: 'narcotic',
      quantity: 2,
      customer: 'Rahim',
      prescriptionRef: 'Rx-11',
    });
  });

  it('sorts rows by sale date ascending', () => {
    const sales = [
      sale('SALE-0002', '2026-08-05T10:00:00.000Z', [{ itemId: 'c1', quantity: 1, price: 20 }]),
      sale('SALE-0001', '2026-08-01T10:00:00.000Z', [{ itemId: 'n1', quantity: 1, price: 50 }]),
    ];
    const rows = buildScheduledRegisterRows(sales, items, customers);
    expect(rows.map((r) => r.saleId)).toEqual(['SALE-0001', 'SALE-0002']);
  });

  it('uses the sale customer and falls back when unknown', () => {
    const sales = [
      sale('SALE-0003', '2026-08-02T10:00:00.000Z', [{ itemId: 'c1', quantity: 3, price: 20 }], { customerId: 'cust-2' }),
      sale('SALE-0004', '2026-08-03T10:00:00.000Z', [{ itemId: 'c1', quantity: 1, price: 20 }], { customerId: 'ghost' }),
    ];
    const rows = buildScheduledRegisterRows(sales, items, customers);
    expect(rows[0].customer).toBe('Karim');
    expect(rows[1].customer).toBe('Unknown Customer');
  });

  it('shows empty prescription ref for legacy sales recorded before the field existed', () => {
    const sales = [sale('SALE-0005', '2026-08-04T10:00:00.000Z', [{ itemId: 'n1', quantity: 1, price: 50 }])];
    const rows = buildScheduledRegisterRows(sales, items, customers);
    expect(rows[0].prescriptionRef).toBe('');
  });

  it('returns no rows when nothing scheduled was sold', () => {
    const sales = [sale('SALE-0006', '2026-08-06T10:00:00.000Z', [{ itemId: 'o1', quantity: 5, price: 10 }])];
    expect(buildScheduledRegisterRows(sales, items, customers)).toHaveLength(0);
  });
});
