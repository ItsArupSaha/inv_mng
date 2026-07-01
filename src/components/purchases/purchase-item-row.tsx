'use client';

import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { Category } from '@/lib/types';

interface PurchaseItemRowProps {
  index: number;
  categories: Category[];
  existingItems?: any[];
  onAddCategoryClick: () => void;
  onRemove: () => void;
  disabledRemove: boolean;
}

export function PurchaseItemRow({
  index,
  categories,
  existingItems,
  onAddCategoryClick,
  onRemove,
  disabledRemove,
}: PurchaseItemRowProps) {
  const { authUser } = useAuth();
  const storeType = authUser?.storeType || 'general';

  const { control, watch, setValue } = useFormContext();
  const watchCategoryId = watch(`items.${index}.categoryId`);
  const selectedCategory = categories.find(c => c.id === watchCategoryId);
  const isMedicine = selectedCategory?.name?.toLowerCase().includes('medicine');
  
  const categoryName = (selectedCategory?.name || '').toLowerCase();
  const isAssetOrSurgical = categoryName === 'assets' || categoryName === 'surgicals';

  React.useEffect(() => {
    if (isAssetOrSurgical) {
      setValue(`items.${index}.sellingPrice`, 0);
    }
  }, [isAssetOrSurgical, index, setValue]);

  const itemName = useWatch({
    control,
    name: `items.${index}.itemName`
  }) || '';

  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const suggestions = React.useMemo(() => {
    if (!itemName || !existingItems) return [];
    const query = itemName.trim().toLowerCase();
    if (!query) return [];
    return existingItems.filter(item => 
      item.title && item.title.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [itemName, existingItems]);

  // Auto-fill fields if matching existing medicine is entered
  React.useEffect(() => {
    if (itemName && existingItems && existingItems.length > 0) {
      const trimmedName = itemName.trim().toLowerCase();
      const matchingItem = existingItems.find(
        item => item.title && item.title.trim().toLowerCase() === trimmedName
      );

      if (matchingItem) {
        const currentCategoryId = watch(`items.${index}.categoryId`);
        const currentMedicineGroup = watch(`items.${index}.medicineGroup`);
        const currentSellingPrice = watch(`items.${index}.sellingPrice`);
        const currentCost = watch(`items.${index}.cost`);
        const currentAuthor = watch(`items.${index}.author`);
        const currentExpiry = watch(`items.${index}.expiryDate`);
        const currentLocation = watch(`items.${index}.location`);

        // Set values if currently blank or default/0
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
          setValue(`items.${index}.cost`, matchingItem.productionPrice || matchingItem.sellingPrice);
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
    <div className="flex gap-2 items-start p-3 border rounded-md relative">
      <div className="flex-1 grid grid-cols-1 gap-3 md:grid-cols-6">
        <FormField
          control={control}
          name={`items.${index}.itemName`}
          render={({ field }) => (
            <FormItem className={isMedicine ? "md:col-span-3" : "md:col-span-2"}>
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
                            setValue(`items.${index}.cost`, item.productionPrice || item.sellingPrice);
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
                            {item.company} {item.expiryDate ? ` | Exp: ${item.expiryDate}` : ''} | Stock: {item.stock}
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
        <div className={cn("flex items-end gap-2", isMedicine ? "md:col-span-3" : "")}>
          <FormField
            control={control}
            name={`items.${index}.categoryId`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-xs">Category</FormLabel>
                <Select onValueChange={(value) => {
                  const category = categories.find(c => c.id === value);
                  field.onChange(value);
                  setValue(`items.${index}.categoryName`, category?.name || '');
                }} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" variant="outline" size="icon" onClick={onAddCategoryClick}><Plus className="h-4 w-4" /></Button>
        </div>
        {selectedCategory?.name === 'Book' && (
          <FormField
            control={control}
            name={`items.${index}.author`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="text-xs">Author</FormLabel>
                <FormControl><Input placeholder="e.g., Matt Haig" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {isMedicine && (
          <>
            <FormField
              control={control}
              name={`items.${index}.medicineGroup`}
              render={({ field }) => (
                <FormItem className={storeType === 'pharmacy' ? "md:col-span-3" : "md:col-span-2"}>
                  <FormLabel className="text-xs">Group (Generic)</FormLabel>
                  <FormControl><Input placeholder="e.g., Paracetamol" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`items.${index}.expiryDate`}
              render={({ field }) => (
                <FormItem className={storeType === 'pharmacy' ? "md:col-span-3" : "md:col-span-2"}>
                  <FormLabel className="text-xs">Expiry Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {storeType !== 'pharmacy' && (
              <FormField
                control={control}
                name={`items.${index}.location`}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs">Shelf / Row</FormLabel>
                    <FormControl><Input placeholder="e.g., Row A3" {...field} autoComplete="off" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem className={isMedicine ? "md:col-span-2" : ""}>
              <FormLabel className="text-xs">Qty</FormLabel>
              <FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.cost`}
          render={({ field }) => (
            <FormItem className={cn(storeType === 'pharmacy' ? "md:col-span-2" : isMedicine ? "md:col-span-3" : "", (selectedCategory?.name !== 'Book' && !isMedicine) ? 'md:col-start-4' : '')}>
              <FormLabel className="text-xs">Unit Cost</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.sellingPrice`}
          render={({ field }) => (
            <FormItem className={storeType === 'pharmacy' ? "md:col-span-2" : isMedicine ? "md:col-span-3" : ""}>
              <FormLabel className="text-xs">Selling Price</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" disabled={isAssetOrSurgical} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:bg-destructive/10 mt-6"
        onClick={onRemove}
        disabled={disabledRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
