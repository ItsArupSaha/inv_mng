import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/lib/types';
import { PharmacyFormFields } from './pharmacy-form-fields';

interface ItemFormFieldsProps {
  form: any;
  categories: Category[];
  onAddCategoryClick: () => void;
}

export function ItemFormFields({
  form,
  categories,
  onAddCategoryClick,
}: ItemFormFieldsProps) {
  return (
    <>
      <div className="flex gap-2">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="mt-8 shrink-0"
          onClick={onAddCategoryClick}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <PharmacyFormFields form={form} />

      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Shelf / Row Location</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Shelf A-3, Drawer 2" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
