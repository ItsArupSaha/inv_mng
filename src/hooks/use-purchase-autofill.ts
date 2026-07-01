'use client';

import * as React from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { getItems } from '@/lib/actions';
import type { Category } from '@/lib/types';

interface UsePurchaseAutofillProps {
  form: UseFormReturn<any>;
  isOpen: boolean;
  userId: string;
  categories: Category[];
  storeType: string;
}

export function usePurchaseAutofill({
  form,
  isOpen,
  userId,
  categories,
  storeType,
}: UsePurchaseAutofillProps) {
  const [existingItems, setExistingItems] = React.useState<any[]>([]);

  // Fetch existing items list on open
  React.useEffect(() => {
    if (isOpen && userId) {
      getItems(userId).then(setExistingItems).catch(console.error);
    }
  }, [isOpen, userId]);

  const supplierName = useWatch({
    control: form.control,
    name: 'supplier',
  }) || '';

  const lastResolvedCompanyRef = React.useRef<string>('');

  // Watch supplierName and auto-fill corresponding company shelf location
  React.useEffect(() => {
    if (supplierName && existingItems.length > 0) {
      const typed = supplierName.trim().toLowerCase();
      if (typed.length >= 2) {
        const matchingItem = existingItems.find((item) => {
          if (!item.company || !item.location) return false;
          const comp = item.company.trim().toLowerCase();
          return comp.startsWith(typed) || typed.startsWith(comp) || (typed.length >= 4 && comp.includes(typed));
        });

        if (matchingItem && matchingItem.location) {
          const matchedCompany = matchingItem.company.trim();
          if (lastResolvedCompanyRef.current.toLowerCase() !== matchedCompany.toLowerCase()) {
            form.setValue('location', matchingItem.location, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
            lastResolvedCompanyRef.current = matchedCompany;
          }
        }
      }
    } else if (!supplierName) {
      lastResolvedCompanyRef.current = '';
    }
  }, [supplierName, existingItems, form]);

  // Ensure default category is assigned to the first row once categories are loaded asynchronously
  React.useEffect(() => {
    if (isOpen && categories.length > 0) {
      const items = form.getValues('items');
      if (items && items.length === 1 && !items[0].categoryId) {
        const defaultCategory = categories.find((c) => {
          const name = c.name.toLowerCase();
          if (storeType === 'pharmacy') return name.includes('medicine');
          if (storeType === 'bookstore') return name.includes('book');
          return false;
        });
        if (defaultCategory) {
          form.setValue('items.0.categoryId', defaultCategory.id);
          form.setValue('items.0.categoryName', defaultCategory.name);
        }
      }
    }
  }, [isOpen, categories, storeType, form]);

  return {
    existingItems,
  };
}
