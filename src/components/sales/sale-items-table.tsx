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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const target = e.target as HTMLElement;
    const rowStr = target.getAttribute('data-row');
    const colStr = target.getAttribute('data-col');
    if (rowStr === null || colStr === null) return;

    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);

    let nextRow = row;
    let nextCol = col;

    if (e.key === 'ArrowUp') {
      if (col === 1 || col === 2) return; // Allow numeric increment/decrement
      e.preventDefault();
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      if (col === 1 || col === 2) return; // Allow numeric increment/decrement
      e.preventDefault();
      nextRow = Math.min(fields.length - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextCol = Math.max(0, col - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextCol = Math.min(2, col + 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (row === fields.length - 1 && col === 2) {
        appendRow();
        setTimeout(() => {
          const newInput = target.closest('table')?.querySelector(
            `[data-row="${row + 1}"][data-col="0"]`
          ) as HTMLElement;
          if (newInput) {
            newInput.focus();
            if (newInput instanceof HTMLInputElement) newInput.select();
          }
        }, 50);
        return;
      } else if (col === 2) {
        nextRow = row + 1;
        nextCol = 0;
      } else {
        nextCol = col + 1;
      }
    } else {
      return; // Do nothing
    }

    const nextInput = target.closest('table')?.querySelector(
      `[data-row="${nextRow}"][data-col="${nextCol}"]`
    ) as HTMLElement;

    if (nextInput) {
      nextInput.focus();
      if (nextInput instanceof HTMLInputElement) {
        nextInput.select();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-300 dark:border-slate-700 rounded-none overflow-x-auto bg-card shadow-sm">
        <table 
          onKeyDown={handleKeyDown}
          className="w-full min-w-full text-xs text-left border-collapse border border-slate-300 dark:border-slate-700"
        >
          <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 select-none">
            <tr>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-8 text-center bg-slate-100/80 dark:bg-slate-900/80">#</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 min-w-[220px]">Medicine / Item</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-44">Company & Shelf</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-20 text-center">In Stock</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-20 text-center">Quantity</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-24 text-right">Price (৳)</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-28 text-right">Total (৳)</th>
              <th className="border border-slate-300 dark:border-slate-700 p-2 w-12 text-center bg-slate-100/80 dark:bg-slate-900/80">Action</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const watchItemId = watchItems[index]?.itemId;
              const selectedItem = items.find(i => i.id === watchItemId);
              const qty = Number(watchItems[index]?.quantity) || 0;
              const price = Number(watchItems[index]?.price) || 0;
              const rowTotal = qty * price;

              return (
                <tr key={field.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                  {/* Row Number */}
                  <td className="border border-slate-200 dark:border-slate-800 p-2 text-center text-slate-500 font-bold bg-slate-50 dark:bg-slate-900/40 select-none">
                    {index + 1}
                  </td>
                  
                  {/* Medicine Selector Cell */}
                  <td className="border border-slate-200 dark:border-slate-800 p-0 bg-transparent">
                    <FormField
                      control={control}
                      name={`items.${index}.itemId`}
                      render={({ field: selectField }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <SearchableItemSelect
                              items={items}
                              value={selectField.value || ''}
                              className="w-full h-9 rounded-none border-0 shadow-none bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/20 focus:bg-background focus:ring-0 focus-visible:ring-0 px-3 py-1 font-medium"
                              data-row={index}
                              data-col={0}
                              onChange={(value) => {
                                if (value === selectField.value) return;
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

                  {/* Reference Info (Company & Shelf) */}
                  <td className="border border-slate-200 dark:border-slate-800 p-2 bg-slate-50/30 dark:bg-slate-900/5 select-none truncate max-w-[176px]">
                    {selectedItem ? (
                      <div className="flex flex-col text-[10px] leading-tight">
                        <span className="font-semibold text-foreground truncate max-w-[160px]" title={selectedItem.company || '—'}>
                          {selectedItem.company || '—'}
                        </span>
                        <span className="text-muted-foreground truncate max-w-[160px]" title={selectedItem.location ? `Shelf: ${selectedItem.location}` : 'No Shelf'}>
                          {selectedItem.location ? `Shelf: ${selectedItem.location}` : 'No Shelf'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* In Stock Count */}
                  <td className="border border-slate-200 dark:border-slate-800 p-2 text-center font-semibold font-mono bg-slate-50/30 dark:bg-slate-900/5 text-slate-500 select-none">
                    {selectedItem ? selectedItem.stock : '—'}
                  </td>

                  {/* Quantity input */}
                  <td className="border border-slate-200 dark:border-slate-800 p-0">
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
                              className="w-full h-9 rounded-none border-0 shadow-none bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/20 focus:bg-background focus:ring-0 focus-visible:ring-0 text-center font-mono py-1"
                              data-row={index}
                              data-col={1}
                              {...qtyField}
                              disabled={!watchItemId}
                              onChange={(e) => qtyField.onChange(Number(e.target.value) || '')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>

                  {/* Price input */}
                  <td className="border border-slate-200 dark:border-slate-800 p-0">
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
                              className="w-full h-9 rounded-none border-0 shadow-none bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-900/20 focus:bg-background focus:ring-0 focus-visible:ring-0 text-right font-mono pr-3 py-1"
                              data-row={index}
                              data-col={2}
                              {...priceField}
                              disabled={!watchItemId}
                              onChange={(e) => priceField.onChange(Number(e.target.value) || '')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>

                  {/* Total Formula Cell */}
                  <td className="border border-slate-200 dark:border-slate-800 p-2 text-right font-bold font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/10 text-slate-700 dark:text-slate-300 select-none">
                    ৳{rowTotal.toFixed(2)}
                  </td>

                  {/* Delete Button Cell */}
                  <td className="border border-slate-200 dark:border-slate-800 p-0 text-center bg-slate-50/40 dark:bg-slate-900/5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-full text-destructive hover:bg-destructive/10 rounded-none border-0 transition-colors"
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
