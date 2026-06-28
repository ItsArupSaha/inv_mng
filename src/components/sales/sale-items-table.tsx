'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { Trash2, PlusCircle } from 'lucide-react';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { SearchableItemSelect } from './searchable-item-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Item } from '@/lib/types';

interface SaleItemsTableProps {
  items: Item[];
  fields: any[];
  remove: (index: number) => void;
  appendRow: () => void;
}

export function SaleItemsTable({
  items,
  fields,
  remove,
  appendRow,
}: SaleItemsTableProps) {
  const { control, watch, setValue } = useFormContext();
  const watchItems = watch('items') || [];

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full min-w-full text-sm text-left border-collapse">
          <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="p-3 w-8 text-center">#</th>
              <th className="p-3">Medicine / Item</th>
              <th className="p-3 w-36">Company & Shelf</th>
              <th className="p-3 w-16 text-center">In Stock</th>
              <th className="p-3 w-16 text-center">Quantity</th>
              <th className="p-3 w-20 text-right">Price (৳)</th>
              <th className="p-3 w-24 text-right">Total (৳)</th>
              <th className="p-3 w-10 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fields.map((field, index) => {
              const watchItemId = watchItems[index]?.itemId;
              const selectedItem = items.find(i => i.id === watchItemId);
              const qty = Number(watchItems[index]?.quantity) || 0;
              const price = Number(watchItems[index]?.price) || 0;
              const rowTotal = qty * price;

              return (
                <tr key={field.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-center text-muted-foreground font-medium">{index + 1}</td>
                  <td className="p-3">
                    <FormField
                      control={control}
                      name={`items.${index}.itemId`}
                      render={({ field: selectField }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <SearchableItemSelect
                              items={items}
                              value={selectField.value || ''}
                              onChange={(value) => {
                                const item = items.find(i => i.id === value);
                                selectField.onChange(value);
                                setValue(`items.${index}.price`, item?.sellingPrice || 0, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                                setValue(`items.${index}.quantity`, 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                                
                                // Auto-append another row if we selected an item in the last row
                                if (index === fields.length - 1) {
                                  appendRow();
                                }
                              }}
                              disabledItemIds={watchItems
                                .map((i: any) => i.itemId)
                                .filter((id: string) => id && id !== selectField.value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="p-3">
                    {selectedItem ? (
                      <div className="flex flex-col text-xs leading-normal">
                        <span className="font-semibold text-foreground truncate max-w-[130px]" title={selectedItem.company || '—'}>
                          {selectedItem.company || '—'}
                        </span>
                        <span className="text-muted-foreground truncate max-w-[130px]" title={selectedItem.location ? `Shelf: ${selectedItem.location}` : 'No Shelf'}>
                          {selectedItem.location ? `Shelf: ${selectedItem.location}` : 'No Shelf'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-muted-foreground font-mono">
                    {selectedItem ? selectedItem.stock : '—'}
                  </td>
                  <td className="p-3">
                    <FormField
                      control={control}
                      name={`items.${index}.quantity`}
                      render={({ field: qtyField }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max={selectedItem?.stock}
                              placeholder="0"
                              className="w-full text-center h-8 bg-background border rounded-md"
                              {...qtyField}
                              disabled={!watchItemId}
                              onChange={(e) => qtyField.onChange(Number(e.target.value) || '')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="p-3">
                    <FormField
                      control={control}
                      name={`items.${index}.price`}
                      render={({ field: priceField }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="w-full text-right h-8 bg-background border rounded-md px-2"
                              {...priceField}
                              disabled={!watchItemId}
                              onChange={(e) => priceField.onChange(Number(e.target.value) || '')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>
                  <td className="p-3 text-right font-semibold font-mono tabular-nums">
                    ৳{rowTotal.toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={appendRow}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Blank Row
        </Button>
      </div>
    </div>
  );
}
