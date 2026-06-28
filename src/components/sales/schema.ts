import * as z from 'zod';

export const saleItemSchema = z.object({
  itemId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').optional(),
  price: z.coerce.number().min(0, 'Price must be non-negative').optional(),
});

export const saleFormSchema = z.object({
  customerId: z.string().optional(),
  date: z.date({ required_error: "A sale date is required." }),
  items: z.array(saleItemSchema),
  discountType: z.enum(['none', 'percentage', 'amount']).optional().default('none'),
  discountValue: z.coerce.number().min(0, 'Discount must be non-negative').default(0).optional(),
  paymentMethod: z.enum(['Cash', 'Bank', 'Due', 'Split', 'Paid by Credit'], { required_error: 'Payment method is required.' }),
  amountPaid: z.coerce.number().optional(),
  splitPaymentMethod: z.enum(['Cash', 'Bank']).optional(),
  creditApplied: z.coerce.number().optional(),
  total: z.coerce.number().min(0, 'Total must be non-negative').optional(),
}).refine(data => {
  if (data.discountType === 'percentage' && data.discountValue !== undefined) {
    return data.discountValue >= 0 && data.discountValue <= 100;
  }
  return true;
}, {
  message: "Percentage discount must be between 0 and 100.",
  path: ['discountValue'],
}).refine(data => {
  if (data.paymentMethod === 'Split') {
    return data.amountPaid !== undefined && data.amountPaid > 0 && !!data.splitPaymentMethod;
  }
  return true;
}, {
  message: "Amount paid and its method are required for split payments.",
  path: ['amountPaid'],
});

export type SaleFormValues = z.infer<typeof saleFormSchema>;
