'use client';

import * as React from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { addPurchase, updatePurchase, getItems } from '@/lib/actions';
import type { Category, Purchase } from '@/lib/types';
import { purchaseFormSchema, type PurchaseFormValues } from '@/components/purchases/schema';

interface UseRecordPurchaseProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editingPurchase?: Purchase | null;
  onSuccess: () => void;
}

export function useRecordPurchase({
  userId,
  isOpen,
  onOpenChange,
  categories,
  editingPurchase,
  onSuccess,
}: UseRecordPurchaseProps) {
  const { toast } = useToast();
  const { authUser } = useAuth();
  const [isPending, startTransition] = React.useTransition();

  const storeType = authUser?.storeType || 'general';

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: '',
      location: '',
      items: [{ itemName: '', categoryId: '', categoryName: '', author: '', medicineGroup: '', company: '', expiryDate: '', location: '', quantity: 1, cost: 0, sellingPrice: 0 }],
      discountType: 'amount',
      discountValue: 0,
      vatType: 'amount',
      vatValue: 0,
      paymentMethod: 'Due',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      dueDate: new Date(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const [existingItems, setExistingItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen && userId) {
      getItems(userId).then(setExistingItems).catch(console.error);
    }
  }, [isOpen, userId]);

  const supplierName = useWatch({
    control: form.control,
    name: 'supplier'
  }) || '';

  const lastResolvedCompanyRef = React.useRef<string>('');

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
              shouldValidate: true 
            });
            lastResolvedCompanyRef.current = matchedCompany;
          }
        }
      }
    } else if (!supplierName) {
      lastResolvedCompanyRef.current = '';
    }
  }, [supplierName, existingItems, form]);

  const wasOpenRef = React.useRef(false);
  const prevPurchaseIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const purchaseId = editingPurchase?.id || null;
      const isNewSession = !wasOpenRef.current || (purchaseId !== prevPurchaseIdRef.current);

      if (isNewSession) {
        if (editingPurchase) {
          const mappedItems = editingPurchase.items.map(item => ({
            itemName: item.itemName,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            author: item.author || '',
            medicineGroup: item.medicineGroup || '',
            company: item.company || '',
            expiryDate: item.expiryDate || '',
            location: item.location || '',
            quantity: item.quantity,
            cost: item.cost,
            sellingPrice: item.sellingPrice || 0
          }));

          form.reset({
            supplier: editingPurchase.supplier || '',
            location: editingPurchase.items[0]?.location || '',
            items: mappedItems,
            discountType: 'amount',
            discountValue: editingPurchase.discountAmount || 0,
            vatType: editingPurchase.vatType || 'amount',
            vatValue: editingPurchase.vatValue || 0,
            paymentMethod: editingPurchase.paymentMethod === 'N/A' ? 'Due' : editingPurchase.paymentMethod,
            amountPaid: editingPurchase.amountPaid || 0,
            splitPaymentMethod: editingPurchase.splitPaymentMethod || 'Cash',
            dueDate: editingPurchase.dueDate ? new Date(editingPurchase.dueDate) : new Date(),
          });
        } else {
          const defaultCategory = categories.find(c => {
            const name = c.name.toLowerCase();
            if (storeType === 'pharmacy') return name.includes('medicine');
            if (storeType === 'bookstore') return name.includes('book');
            return false;
          });
          const initialCategoryId = defaultCategory?.id || '';
          const initialCategoryName = defaultCategory?.name || '';

          form.reset({
            supplier: '',
            location: '',
            items: [{ 
              itemName: '', 
              categoryId: initialCategoryId, 
              categoryName: initialCategoryName, 
              author: '', 
              medicineGroup: '', 
              company: '', 
              expiryDate: '', 
              location: '', 
              quantity: 1, 
              cost: 0, 
              sellingPrice: 0 
            }],
            discountType: 'amount',
            discountValue: 0,
            vatType: 'amount',
            vatValue: 0,
            paymentMethod: 'Due',
            amountPaid: 0,
            splitPaymentMethod: 'Cash',
            dueDate: new Date(),
          });
        }
        prevPurchaseIdRef.current = purchaseId;
      }
    } else {
      prevPurchaseIdRef.current = null;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, form, categories, storeType, editingPurchase]);

  // Ensure default category is assigned to the first row once categories are loaded asynchronously
  React.useEffect(() => {
    if (isOpen && categories.length > 0) {
      const items = form.getValues('items');
      if (items && items.length === 1 && !items[0].categoryId) {
        const defaultCategory = categories.find(c => {
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

  const onSubmit = (data: PurchaseFormValues) => {
    startTransition(async () => {
      try {
        const calculatedTotal = data.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
        const calculatedDiscount = data.discountType === 'percentage' 
            ? (calculatedTotal * (data.discountValue || 0)) / 100 
            : (data.discountValue || 0);

        const mappedItems = data.items.map(item => ({
          ...item,
          company: storeType === 'pharmacy' ? data.supplier : item.company,
          location: storeType === 'pharmacy' ? data.location : item.location
        }));

        const purchaseData = {
          ...data,
          items: mappedItems,
          discountAmount: calculatedDiscount,
          dueDate: data.dueDate.toISOString()
        };
        
        // @ts-ignore
        delete purchaseData.discountType;
        // @ts-ignore
        delete purchaseData.discountValue;
        // @ts-ignore
        delete purchaseData.location;

        const result = editingPurchase 
          ? await updatePurchase(userId, editingPurchase.id, purchaseData)
          : await addPurchase(userId, purchaseData);

        if (result?.success) {
          toast({ 
            title: editingPurchase ? 'Purchase Updated' : 'Purchase Recorded', 
            description: editingPurchase ? 'The purchase details and inventory have been updated.' : 'The new purchase has been added and stock updated.' 
          });
          onSuccess();
          onOpenChange(false);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: (result as any)?.error || 'Failed to save purchase.' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save the purchase.' });
      }
    });
  };

  const handleAddItem = () => {
    const defaultCategory = categories.find(c => {
      const name = c.name.toLowerCase();
      if (storeType === 'pharmacy') return name.includes('medicine');
      if (storeType === 'bookstore') return name.includes('book');
      return false;
    });
    const initialCategoryId = defaultCategory?.id || '';
    const initialCategoryName = defaultCategory?.name || '';
    append({ 
      itemName: '', 
      categoryId: initialCategoryId, 
      categoryName: initialCategoryName, 
      author: '', 
      medicineGroup: '', 
      company: '', 
      expiryDate: '', 
      location: '', 
      quantity: 1, 
      cost: 0, 
      sellingPrice: 0 
    });
  };

  return {
    form,
    fields,
    append,
    remove,
    isPending,
    storeType,
    onSubmit,
    handleAddItem,
    existingItems,
  };
}
