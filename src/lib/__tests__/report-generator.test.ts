import { describe, expect, it } from 'vitest';
import type { Expense, Item, Purchase, Sale, Transaction } from '../types';
import { calculateReportStats, generateDailyReport } from '../report-generator';
import { itemStockValue, summarizeExpiryTiers } from '../expiry-stats';

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: 'item-1',
    title: 'Napa',
    categoryId: 'c1',
    categoryName: 'Tab',
    productionPrice: 1,
    sellingPrice: 1.5,
    stock: 10,
    ...overrides,
  } as Item;
}

function makeSale(overrides: Partial<Sale>): Sale {
  return {
    id: 'sale-1',
    saleId: 'SALE-0001',
    date: '2026-08-01T00:00:00.000Z',
    customerId: 'walkin',
    items: [],
    subtotal: 0,
    discountType: 'none',
    discountValue: 0,
    total: 0,
    paymentMethod: 'Cash',
    ...overrides,
  } as Sale;
}

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'exp-1',
    expenseId: 'EXP-0001',
    date: '2026-08-01T00:00:00.000Z',
    name: '',
    description: 'Shop rent',
    amount: 100,
    paymentMethod: 'Cash',
    ...overrides,
  } as Expense;
}

function makePurchase(overrides: Partial<Purchase>): Purchase {
  return {
    id: 'pur-1',
    purchaseId: 'PUR-0001',
    date: '2026-08-01T00:00:00.000Z',
    supplier: 'Supplier A',
    items: [],
    totalAmount: 1000,
    paymentMethod: 'Cash',
    dueDate: '2026-08-15T00:00:00.000Z',
    ...overrides,
  } as Purchase;
}

describe('report profit with frozen batch costs', () => {
  it('uses the cost frozen at sale time, not the current item cost', () => {
    const item = makeItem({ id: 'item-1', productionPrice: 2 }); // cost rose after the sale
    const sale = makeSale({
      total: 15,
      items: [{
        itemId: 'item-1',
        quantity: 10,
        price: 1.5,
        batches: [{ batchId: 'b1', batchNo: 'AUTO-PUR-0001', quantity: 10, costAtSale: 1 }],
      }],
    });

    const stats = calculateReportStats({
      salesData: [sale],
      expensesData: [],
      itemsData: [item],
      purchasesData: [],
      transactionsData: [],
    });

    // 15 revenue − 10 frozen cost, not 15 − 20 current cost
    expect(stats.profitFromPaidSales).toBe(5);
    expect(stats.topSellers[0].profit).toBe(5);
  });

  it('falls back to current item cost for sales recorded before batch tracking', () => {
    const item = makeItem({ id: 'item-1', productionPrice: 1.25 });
    const sale = makeSale({
      total: 15,
      items: [{ itemId: 'item-1', quantity: 10, price: 1.5 }],
    });

    const stats = calculateReportStats({
      salesData: [sale],
      expensesData: [],
      itemsData: [item],
      purchasesData: [],
      transactionsData: [],
    });

    expect(stats.profitFromPaidSales).toBeCloseTo(2.5, 6);
  });

  it('aggregates top sellers by item with quantity, revenue, and profit', () => {
    const napa = makeItem({ id: 'item-1', title: 'Napa', productionPrice: 1 });
    const seclo = makeItem({ id: 'item-2', title: 'Seclo', productionPrice: 2 });
    const sales = [
      makeSale({
        id: 's1', total: 30,
        items: [
          { itemId: 'item-1', quantity: 10, price: 1.5 },
          { itemId: 'item-2', quantity: 5, price: 3 },
        ],
      }),
      makeSale({
        id: 's2', total: 15,
        items: [{ itemId: 'item-1', quantity: 10, price: 1.5 }],
      }),
    ];

    const stats = calculateReportStats({
      salesData: sales,
      expensesData: [],
      itemsData: [napa, seclo],
      purchasesData: [],
      transactionsData: [],
    });

    expect(stats.topSellers).toHaveLength(2);
    const napaRow = stats.topSellers.find(r => r.itemTitle === 'Napa');
    expect(napaRow?.quantity).toBe(20);
    expect(napaRow?.revenue).toBe(30);
    expect(napaRow?.profit).toBe(10);
  });
});

describe('report purchase summary', () => {
  it('separates bought, paid, and new due from supplier payments and refunds', () => {
    const purchases = [
      makePurchase({ id: 'p1', purchaseId: 'PUR-0001', totalAmount: 1000, paymentMethod: 'Cash' }),
      makePurchase({ id: 'p2', purchaseId: 'PUR-0002', totalAmount: 500, paymentMethod: 'Due' }),
      makePurchase({
        id: 'p3', purchaseId: 'PUR-0003', totalAmount: 800, paymentMethod: 'Split', amountPaid: 300,
      }),
    ];
    const expenses = [
      makeExpense({ description: 'Payment for Purchase PUR-0001', amount: 1000 }),
      makeExpense({ description: 'Partial payment for Purchase PUR-0003', amount: 300 }),
      makeExpense({ description: 'Supplier Refund: PRT-0001 from Supplier A', amount: -50 }),
      makeExpense({ description: 'Shop rent', amount: 200 }), // operating, not supplier
    ];

    const stats = calculateReportStats({
      salesData: [],
      expensesData: expenses,
      itemsData: [],
      purchasesData: purchases,
      transactionsData: [],
    });

    expect(stats.purchases.totalPurchased).toBe(2300);
    expect(stats.purchases.paidToSuppliers).toBe(1250); // 1000 + 300 − 50 refund
    expect(stats.purchases.newSupplierDue).toBe(1000); // 500 due + 500 split remainder
    // Operating expense stays out of supplier payments but in total expenses.
    expect(stats.totalExpenses).toBe(200);
  });
});

describe('daily report shape', () => {
  it('exposes purchases and top sellers and drops the donations slot', () => {
    const report = generateDailyReport({
      salesData: [],
      expensesData: [],
      itemsData: [],
      purchasesData: [],
      date: '2026-08-19',
      transactionsData: [],
    });

    expect(report.purchases).toEqual({ totalPurchased: 0, paidToSuppliers: 0, newSupplierDue: 0 });
    expect(report.topSellers).toEqual([]);
    expect(report).not.toHaveProperty('dailyActivity.totalDonations');
    expect(report.cashFlow).not.toHaveProperty('donations');
  });
});

describe('expiry tiers', () => {
  const now = new Date('2026-08-19T00:00:00.000Z');

  function daysFromNow(days: number): string {
    const d = new Date(now);
    d.setDate(now.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  it('bands items into exclusive tiers by money at risk and skips zero stock', () => {
    const items = [
      makeItem({ id: 'a', expiryDate: daysFromNow(-5), stock: 10, productionPrice: 2 }),   // expired ৳20
      makeItem({ id: 'b', expiryDate: daysFromNow(10), stock: 100, productionPrice: 1 }), // 30d ৳100
      makeItem({ id: 'c', expiryDate: daysFromNow(45), stock: 50, productionPrice: 2 }),  // 60d ৳100
      makeItem({ id: 'd', expiryDate: daysFromNow(75), stock: 20, productionPrice: 5 }),  // 90d ৳100
      makeItem({ id: 'e', expiryDate: daysFromNow(2), stock: 0, productionPrice: 9 }),    // zero stock, ignored
      makeItem({ id: 'f', expiryDate: daysFromNow(200), stock: 5, productionPrice: 9 }),  // beyond 90d, ignored
    ];

    const summary = summarizeExpiryTiers(items, now);
    expect(summary.expired).toEqual({ count: 1, value: 20 });
    expect(summary.within30d).toEqual({ count: 1, value: 100 });
    expect(summary.within60d).toEqual({ count: 1, value: 100 });
    expect(summary.within90d).toEqual({ count: 1, value: 100 });
    expect(itemStockValue(items[0])).toBe(20);
  });
});
