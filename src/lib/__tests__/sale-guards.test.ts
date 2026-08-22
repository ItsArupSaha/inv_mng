import { describe, expect, it } from 'vitest';
import {
  validateSaleItems,
  validateDiscount,
  validateAmountPaid,
  validateCreditApplied,
} from '../sale-guards';

describe('validateSaleItems', () => {
  it('accepts real ids with whole positive quantities', () => {
    expect(validateSaleItems([{ itemId: 'a', quantity: 1 }, { itemId: 'b', quantity: 10 }])).toBeNull();
  });

  it('rejects missing item, zero, fractional, and negative quantities', () => {
    expect(validateSaleItems([{ itemId: '', quantity: 1 }])).toContain('medicine selected');
    expect(validateSaleItems([{ itemId: 'a', quantity: 0 }])).toContain('at least 1');
    expect(validateSaleItems([{ itemId: 'a', quantity: 1.5 }])).toContain('whole number');
    expect(validateSaleItems([{ itemId: 'a', quantity: -2 }])).toContain('at least 1');
  });
});

describe('validateDiscount', () => {
  it('accepts bounded discounts and rejects out-of-range ones', () => {
    expect(validateDiscount({ type: 'none' }, 100)).toBeNull();
    expect(validateDiscount({ type: 'percentage', value: 10 }, 100)).toBeNull();
    expect(validateDiscount({ type: 'percentage', value: 101 }, 100)).toContain('0 and 100');
    expect(validateDiscount({ type: 'amount', value: 100 }, 100)).toBeNull();
    expect(validateDiscount({ type: 'amount', value: 101 }, 100)).toContain('exceed');
    expect(validateDiscount({ type: 'amount', value: -1 }, 100)).toContain('negative');
  });
});

describe('validateAmountPaid', () => {
  it('allows up to the total, rejects beyond', () => {
    expect(validateAmountPaid(undefined, 500)).toBeNull();
    expect(validateAmountPaid(500, 500)).toBeNull();
    expect(validateAmountPaid(500.01, 500)).toContain('exceed');
    expect(validateAmountPaid(-1, 500)).toContain('negative');
  });
});

describe('validateCreditApplied', () => {
  it('allows credit only up to the customer advance', () => {
    expect(validateCreditApplied(0, 200)).toBeNull();
    expect(validateCreditApplied(50, -50)).toBeNull();   // exactly the advance
    expect(validateCreditApplied(60, -50)).toContain('exceeds');
    expect(validateCreditApplied(10, 100)).toContain('exceeds'); // owes money → no advance
    expect(validateCreditApplied(-5, -50)).toContain('negative');
  });
});
