import * as z from 'zod';

export const assetSchema = z.object({
  itemName: z.string().min(2, { message: 'Asset name must be at least 2 characters.' }),
  quantity: z.coerce.number().int().min(1, { message: 'Quantity must be at least 1.' }),
  cost: z.coerce.number().min(0.01, { message: 'Cost must be a positive number.' }),
  date: z.date({ required_error: 'A purchase date is required.' }),
  paymentMethod: z.enum(['Cash', 'Bank'], { required_error: 'A payment method is required.' }),
});

export type AssetFormValues = z.infer<typeof assetSchema>;
