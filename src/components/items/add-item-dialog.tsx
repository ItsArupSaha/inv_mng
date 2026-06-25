'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { addItem, updateItem } from '@/lib/actions';
import type { Category, Item } from '@/lib/types';

const itemSchema = z.object({
  title: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  author: z.string().optional(),
  medicineGroup: z.string().optional(),
  company: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
  productionPrice: z.coerce.number().min(0, 'Production price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
}).refine(data => data.sellingPrice >= data.productionPrice, {
  message: "Selling price cannot be less than production price.",
  path: ["sellingPrice"],
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface AddItemDialogProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Item | null;
  categories: Category[];
  onSuccess: () => void;
  onAddCategoryClick: () => void;
}

export function AddItemDialog({
  userId,
  isOpen,
  onOpenChange,
  editingItem,
  categories,
  onSuccess,
  onAddCategoryClick,
}: AddItemDialogProps) {
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

  const selectedCategory = categories.find(cat => cat.id === itemForm.watch('categoryId'));

  const onSubmit = (data: ItemFormValues) => {
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
  const showAuthorDirectly = storeType === 'bookstore';
  const showPharmaDirectly = storeType === 'pharmacy';
  const showLocationDirectly = storeType === 'pharmacy' || storeType === 'bookstore';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Update the details of this item.' : 'Enter the details for the new item.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...itemForm}>
          <form onSubmit={itemForm.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
              <div className="space-y-4 py-4 px-4">
                <FormField
                  control={itemForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{nameLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <FormField
                    control={itemForm.control}
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
                    control={itemForm.control}
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
                      control={itemForm.control}
                      name="medicineGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Generic Name (Group)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Paracetamol, Omeprazole" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
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
                      control={itemForm.control}
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
                    control={itemForm.control}
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
                          control={itemForm.control}
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
                          control={itemForm.control}
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
                          control={itemForm.control}
                          name="medicineGroup"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specification Group / Generic Group</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Electronic, Organic, Tablets" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={itemForm.control}
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
                          control={itemForm.control}
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="productionPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prod. Cost (৳)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={itemForm.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price (৳)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="10.99" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={itemForm.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t px-4 pb-4">
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
