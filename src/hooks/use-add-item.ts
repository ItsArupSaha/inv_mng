'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
  const { authUser } = useAuth();
  const [isPending, startTransition] = React.useTransition();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const storeType = authUser?.storeType || 'general';

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      author: '',
      medicineGroup: '',
      company: '',
      expiryDate: '',
      location: '',
      productionPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  // Reset form when dialog opens or editing item changes
  React.useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        itemForm.reset({
          title: editingItem.title,
          categoryId: editingItem.categoryId,
          author: editingItem.author || '',
          medicineGroup: editingItem.medicineGroup || '',
          company: editingItem.company || '',
          expiryDate: editingItem.expiryDate || '',
          location: editingItem.location || '',
          productionPrice: editingItem.productionPrice,
          sellingPrice: editingItem.sellingPrice,
          stock: editingItem.stock,
        });
        // Auto-show advanced fields if any are pre-filled on edit
        if (editingItem.author || editingItem.medicineGroup || editingItem.company || editingItem.expiryDate || editingItem.location) {
          setShowAdvanced(true);
        }
      } else {
        itemForm.reset({
          title: '',
          categoryId: '',
          author: '',
          medicineGroup: '',
          company: '',
          expiryDate: '',
          location: '',
          productionPrice: 0,
          sellingPrice: 0,
          stock: 0,
        });
        setShowAdvanced(false);
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
          author: data.author || undefined,
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

  // Label configuration based on store type
  const nameLabel = storeType === 'pharmacy' ? 'Medicine Name' : storeType === 'bookstore' ? 'Book Title' : 'Item Name';

  return {
    itemForm,
    isPending,
    showAdvanced,
    setShowAdvanced,
    storeType,
    onSubmit,
    nameLabel,
  };
}
