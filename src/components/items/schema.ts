import * as z from 'zod';

export const itemSchema = z.object({
  title: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  author: z.string().optional(),
  medicineGroup: z.string().optional(),
  company: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
  productionPrice: z.coerce.number().min(0, 'Production price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
}).refine(data => data.sellingPrice >= data.productionPrice, {
  message: "Selling price cannot be less than production price.",
  path: ["sellingPrice"],
});

export type ItemFormValues = z.infer<typeof itemSchema>;
