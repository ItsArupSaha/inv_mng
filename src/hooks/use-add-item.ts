'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addItem, updateItem } from '@/lib/actions';
import type { Category, Item } from '@/lib/types';
import { itemSchema, type ItemFormValues } from '@/components/items/schema';

interface UseAddItemProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Item | null;
  categories: Category[];
  onSuccess: () => void;
}

export function useAddItem({
  userId,
  isOpen,
  onOpenChange,
  editingItem,
  categories,
  onSuccess,
}: UseAddItemProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const dynamicSchema = React.useMemo(() => {
    return itemSchema.refine(data => {
      const cat = categories.find(c => c.id === data.categoryId);
      const isAssetOrSurgical = cat && (
        cat.name.toLowerCase() === 'assets' ||
        cat.name.toLowerCase() === 'surgicals'
      );
      if (isAssetOrSurgical) {
        return true;
      }
      return data.sellingPrice >= data.productionPrice;
    }, {
      message: "Selling price cannot be less than production price.",
      path: ["sellingPrice"],
    });
  }, [categories]);

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      medicineGroup: '',
      company: '',
      expiryDate: '',
      location: '',
      productionPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  const categoryId = itemForm.watch('categoryId');
  const selectedCategory = React.useMemo(() => {
    return categories.find(cat => cat.id === categoryId);
  }, [categories, categoryId]);

  const isAssetOrSurgical = React.useMemo(() => {
    if (!selectedCategory) return false;
    const name = selectedCategory.name.toLowerCase();
    return name === 'assets' || name === 'surgicals';
  }, [selectedCategory]);

  React.useEffect(() => {
    if (isAssetOrSurgical) {
      itemForm.setValue('sellingPrice', 0, { shouldValidate: true });
    }
  }, [isAssetOrSurgical, itemForm]);

  // Reset form when dialog opens or editing item changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        itemForm.reset({
          title: editingItem.title,
          categoryId: editingItem.categoryId,
          medicineGroup: editingItem.medicineGroup || '',
          company: editingItem.company || '',
          expiryDate: editingItem.expiryDate || '',
          location: editingItem.location || '',
          productionPrice: editingItem.productionPrice,
          sellingPrice: editingItem.sellingPrice,
          stock: editingItem.stock,
        });
      } else {
        itemForm.reset({
          title: '',
          categoryId: '',
          medicineGroup: '',
          company: '',
          expiryDate: '',
          location: '',
          productionPrice: 0,
          sellingPrice: 0,
          stock: 0,
        });
      }
    }
  }, [isOpen, editingItem, itemForm]);

  const onSubmit = (data: ItemFormValues) => {
    const selectedCategory = categories.find(cat => cat.id === data.categoryId);
    startTransition(async () => {
      try {
        const itemData: Omit<Item, 'id'> = {
          title: data.title,
          categoryId: data.categoryId,
          categoryName: selectedCategory?.name || '',
          medicineGroup: data.medicineGroup || undefined,
          company: data.company || undefined,
          expiryDate: data.expiryDate || undefined,
          location: data.location || undefined,
          productionPrice: data.productionPrice,
          sellingPrice: data.sellingPrice,
          stock: data.stock,
        };

        if (editingItem) {
          await updateItem(userId, editingItem.id, itemData);
          toast({ title: "Item Updated", description: "The item details have been saved." });
        } else {
          await addItem(userId, itemData);
          toast({ title: "Item Added", description: "The new item is now in your inventory." });
        }
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save the item." });
      }
    });
  };

  return {
    itemForm,
    isPending,
    onSubmit,
    nameLabel: 'Medicine / Item Name',
    isAssetOrSurgical,
  };
}
