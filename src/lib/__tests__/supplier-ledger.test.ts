import { describe, expect, it } from 'vitest';
import { ledgerDocMatchesPurchase } from '../supplier-ledger';

describe('ledgerDocMatchesPurchase', () => {
  it('matches docs carrying the purchaseId field', () => {
    expect(ledgerDocMatchesPurchase({ purchaseId: 'PUR-0007' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ purchaseId: 'PUR-0008' }, 'PUR-0007')).toBe(false);
  });

  it('matches the legacy expense descriptions', () => {
    expect(ledgerDocMatchesPurchase({ description: 'Payment for Purchase PUR-0007' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Partial payment for Purchase PUR-0007' }, 'PUR-0007')).toBe(true);
  });

  it('matches payable and paid-payable descriptions with any supplier suffix', () => {
    expect(ledgerDocMatchesPurchase({ description: 'Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Balance for Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Paid Payable: Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
    expect(ledgerDocMatchesPurchase({ description: 'Paid Payable: Balance for Purchase PUR-0007 from Acme Ltd' }, 'PUR-0007')).toBe(true);
  });

  it('does not collide across similarly numbered purchases', () => {
    expect(ledgerDocMatchesPurchase({ description: 'Payment for Purchase PUR-00010' }, 'PUR-0001')).toBe(false);
    expect(ledgerDocMatchesPurchase({ description: 'Purchase PUR-00010 from Acme Ltd' }, 'PUR-0001')).toBe(false);
  });
});
