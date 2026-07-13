'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { PurchaseTaxFields } from './purchase-tax-fields';
import { PurchaseMethodFields } from './purchase-method-fields';

export function PurchasePaymentSection() {
  const form = useFormContext();

  return (
    <div className="space-y-4">
      <PurchaseTaxFields form={form} />
      <PurchaseMethodFields form={form} />
    </div>
  );
}
