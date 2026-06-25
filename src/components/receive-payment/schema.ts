import * as z from 'zod';

export const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  paymentMethod: z.enum(['Cash', 'Bank'], {
    required_error: 'You need to select a payment method.',
  }),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
