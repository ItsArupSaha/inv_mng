'use client';

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Item } from '@/lib/types';

interface ReturnItemsListProps {
  form: UseFormReturn<any>;
  fields: any[];
  items: Item[];
  watchItems: any[];
  remove: (index: number) => void;
  append: (val: any) => void;
}

export function ReturnItemsList({
  form,
  fields,
  items,
  watchItems,
  remove,
  append,
}: ReturnItemsListProps) {
  return (
    <>
      <FormLabel>Returned Items</FormLabel>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-end p-3 border rounded-md relative bg-muted/10">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name={`items.${index}.itemId`}
              render={({ field: selectField }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-xs">Item</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const item = items.find((i) => i.id === value);
                      selectField.onChange(value);
                      form.setValue(`items.${index}.price`, item?.sellingPrice || 0);
                    }}
                    defaultValue={selectField.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          disabled={watchItems.some(
                            (i, itemIndex) => i.itemId === item.id && itemIndex !== index
                          )}
                        >
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`items.${index}.quantity`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel className="text-xs">Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="1" {...inputField} />
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
            className="text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => remove(index)}
            disabled={fields.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ itemId: '', quantity: 1, price: 0 })}
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
      </Button>
    </>
  );
}
