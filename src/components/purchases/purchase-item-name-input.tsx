'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface PurchaseItemNameInputProps {
  index: number;
  existingItems?: any[];
  isMedicine: boolean;
}

export function PurchaseItemNameInput({
  index,
  existingItems,
  isMedicine,
}: PurchaseItemNameInputProps) {
  const { control, watch, setValue } = useFormContext();
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const itemName = useWatch({
    control,
    name: `items.${index}.itemName`,
  }) || '';

  const suggestions = React.useMemo(() => {
    if (!itemName || !existingItems) return [];
    const query = itemName.trim().toLowerCase();
    if (!query) return [];
    return existingItems
      .filter((item) => item.title && item.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [itemName, existingItems]);

  // Auto-fill fields if matching existing medicine is entered
  React.useEffect(() => {
    if (itemName && existingItems && existingItems.length > 0) {
      const trimmedName = itemName.trim().toLowerCase();
      const matchingItem = existingItems.find(
        (item) => item.title && item.title.trim().toLowerCase() === trimmedName
      );

      if (matchingItem) {
        const currentCategoryId = watch(`items.${index}.categoryId`);
        const currentMedicineGroup = watch(`items.${index}.medicineGroup`);
        const currentSellingPrice = watch(`items.${index}.sellingPrice`);
        const currentCost = watch(`items.${index}.cost`);
        const currentAuthor = watch(`items.${index}.author`);
        const currentExpiry = watch(`items.${index}.expiryDate`);
        const currentLocation = watch(`items.${index}.location`);

        if (!currentCategoryId) {
          setValue(`items.${index}.categoryId`, matchingItem.categoryId);
          setValue(`items.${index}.categoryName`, matchingItem.categoryName);
        }
        if (!currentMedicineGroup && matchingItem.medicineGroup) {
          setValue(`items.${index}.medicineGroup`, matchingItem.medicineGroup);
        }
        if (!currentSellingPrice || Number(currentSellingPrice) === 0) {
          setValue(`items.${index}.sellingPrice`, matchingItem.sellingPrice);
        }
        if (!currentCost || Number(currentCost) === 0) {
          setValue(
            `items.${index}.cost`,
            matchingItem.productionPrice || matchingItem.sellingPrice
          );
        }
        if (!currentAuthor && matchingItem.author) {
          setValue(`items.${index}.author`, matchingItem.author);
        }
        if (!currentExpiry && matchingItem.expiryDate) {
          setValue(`items.${index}.expiryDate`, matchingItem.expiryDate);
        }
        if (!currentLocation && matchingItem.location) {
          setValue(`items.${index}.location`, matchingItem.location);
        }
      }
    }
  }, [itemName, existingItems, index, setValue, watch]);

  return (
    <FormField
      control={control}
      name={`items.${index}.itemName`}
      render={({ field }) => (
        <FormItem className={isMedicine ? 'md:col-span-3' : 'md:col-span-2'}>
          <FormLabel className="text-xs">Item Name</FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                placeholder="e.g., Napa 500mg"
                {...field}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setShowSuggestions(false)}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground border rounded-md shadow-lg p-1">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted"
                      onMouseDown={() => {
                        setValue(`items.${index}.itemName`, item.title);
                        setValue(`items.${index}.categoryId`, item.categoryId);
                        setValue(`items.${index}.categoryName`, item.categoryName);
                        if (item.medicineGroup) {
                          setValue(`items.${index}.medicineGroup`, item.medicineGroup);
                        }
                        setValue(`items.${index}.sellingPrice`, item.sellingPrice);
                        setValue(
                          `items.${index}.cost`,
                          item.productionPrice || item.sellingPrice
                        );
                        if (item.author) {
                          setValue(`items.${index}.author`, item.author);
                        }
                        if (item.expiryDate) {
                          setValue(`items.${index}.expiryDate`, item.expiryDate);
                        }
                        if (item.location) {
                          setValue(`items.${index}.location`, item.location);
                        }
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="font-semibold text-foreground text-left">{item.title}</div>
                      <div className="text-[10px] text-muted-foreground text-left">
                        {item.company} {item.expiryDate ? ` | Exp: ${item.expiryDate}` : ''} |
                        Stock: {item.stock}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
