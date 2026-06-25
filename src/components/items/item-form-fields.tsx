import * as React from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
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

interface ItemFormFieldsProps {
  form: any;
  storeType: string;
  categories: Category[];
  onAddCategoryClick: () => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
}

export function ItemFormFields({
  form,
  storeType,
  categories,
  onAddCategoryClick,
  showAdvanced,
  setShowAdvanced,
}: ItemFormFieldsProps) {
  const showAuthorDirectly = storeType === 'bookstore';
  const showPharmaDirectly = storeType === 'pharmacy';
  const showLocationDirectly = storeType === 'pharmacy' || storeType === 'bookstore';

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

      {/* Show Bookstore fields directly */}
      {showAuthorDirectly && (
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input placeholder="Author name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Show Pharma fields directly */}
      {showPharmaDirectly && (
        <>
          <FormField
            control={form.control}
            name="medicineGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group (Generic)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Paracetamol, Omeprazole" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pharmaceutical Company / Manufacturer</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Square, Beximco" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      {/* Show Storage Location directly */}
      {showLocationDirectly && (
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{storeType === 'pharmacy' ? 'Shelf / Row Location' : 'Shelf Location'}</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Shelf A-3, Drawer 2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Collapsible details for General Shop */}
      {storeType === 'general' && (
        <div className="space-y-4 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className="text-xs font-semibold">
              {showAdvanced ? 'Hide Additional Details' : 'Show Additional Details (Brand, Expiry, Location)'}
            </span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 border p-4 rounded-lg bg-muted/20 animate-in fade-in-50 duration-200">
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand / Author</FormLabel>
                    <FormControl>
                      <Input placeholder="Brand name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer / Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Manufacturer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="medicineGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specification Group / Group (Generic)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electronic, Organic, Tablets" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date (If applicable)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Shelf B, Row 4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
