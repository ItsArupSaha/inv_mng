import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addSale, getCustomers } from '@/lib/actions';
import type { Customer, Item, PackageTemplate } from '@/lib/types';
import { saleFormSchema, type SaleFormValues } from '@/components/packages/schema';

interface UsePackageSaleProps {
  packageTemplate: PackageTemplate;
  items: Item[];
  userId: string;
  onSaleComplete: () => void;
}

export function usePackageSale({ packageTemplate, items, userId, onSaleComplete }: UsePackageSaleProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const { authUser } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [completedSale, setCompletedSale] = React.useState<any | null>(null);

  // Load customers when dialog opens
  React.useEffect(() => {
    if (isOpen && customers.length === 0) {
      getCustomers(userId).then(setCustomers).catch(console.error);
    }
  }, [isOpen, userId, customers.length]);

  // Map package items to actual items to get prices
  const prefilledItems = React.useMemo(() => {
    return packageTemplate.items.map(pkgItem => {
      const fullItem = items.find(i => i.id === pkgItem.itemId);
      return {
        itemId: pkgItem.itemId,
        quantity: pkgItem.quantity,
        price: fullItem?.sellingPrice || 0,
        title: fullItem?.title || 'Unknown Item',
        stock: fullItem?.stock || 0
      };
    });
  }, [packageTemplate.items, items]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: '',
      date: new Date(),
      items: prefilledItems.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
      discountType: 'none',
      discountValue: 0,
      paymentMethod: 'Cash',
      amountPaid: 0,
      splitPaymentMethod: 'Cash',
      creditApplied: 0,
    },
  });

  // Re-synchronize defaultValues on template change or open
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        customerId: '',
        date: new Date(),
        items: prefilledItems.map(item => ({ itemId: item.itemId, quantity: item.quantity })),
        discountType: 'none',
        discountValue: 0,
        paymentMethod: 'Cash',
        amountPaid: 0,
        splitPaymentMethod: 'Cash',
        creditApplied: 0,
      });
    }
  }, [isOpen, prefilledItems, form]);

  const watchItems = form.watch('items');
  const watchDiscountType = form.watch('discountType');
  const watchDiscountValue = form.watch('discountValue');
  const watchPaymentMethod = form.watch('paymentMethod');
  const watchCustomerId = form.watch('customerId');

  const selectedCustomer = React.useMemo(() => customers.find(c => c.id === watchCustomerId), [customers, watchCustomerId]);
  const customerCredit = React.useMemo(() => (selectedCustomer && selectedCustomer.dueBalance < 0) ? Math.abs(selectedCustomer.dueBalance) : 0, [selectedCustomer]);

  // Dynamically calculate subtotal based on form state
  let subtotal = 0;
  let hasOutOfStock = false;
  const currentItemsDetails = watchItems.map(formItem => {
      const fullItem = items.find(i => i.id === formItem.itemId);
      const price = fullItem?.sellingPrice || 0;
      const stock = fullItem?.stock || 0;
      subtotal += price * formItem.quantity;
      if (stock < formItem.quantity) hasOutOfStock = true;
      return { ...formItem, price, stock, title: fullItem?.title || 'Unknown Item' };
  });

  let discountAmount = 0;
  if (watchDiscountType === 'percentage') {
    discountAmount = subtotal * (watchDiscountValue / 100);
  } else if (watchDiscountType === 'amount') {
    discountAmount = watchDiscountValue;
  }
  discountAmount = Math.min(subtotal, discountAmount);

  const total = subtotal - discountAmount;
  const creditToApply = Math.min(total, customerCredit);
  const totalAfterCredit = total - creditToApply;

  React.useEffect(() => {
    form.setValue('creditApplied', creditToApply);
    if (totalAfterCredit <= 0 && watchPaymentMethod !== 'Paid by Credit') {
      form.setValue('paymentMethod', 'Paid by Credit');
    } else if (totalAfterCredit > 0 && form.getValues('paymentMethod') === 'Paid by Credit') {
      form.setValue('paymentMethod', 'Cash');
    }
  }, [totalAfterCredit, creditToApply, form, watchPaymentMethod]);

  const onSubmit = (data: SaleFormValues) => {
    // Check stock before submitting
    if (hasOutOfStock) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `Not enough stock for one or more items.`,
      });
      return;
    }

    startTransition(async () => {
      const saleData = {
        ...data,
        date: data.date.toISOString(),
        items: currentItemsDetails.map(i => ({ itemId: i.itemId, quantity: i.quantity, price: i.price }))
      };
      
      const result = await addSale(userId, saleData);

      if (result.success && result.sale) {
        toast({ title: 'Package Sold!', description: 'The sale was successfully recorded.' });
        setCompletedSale(result.sale);
        onSaleComplete();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to record sale.' });
      }
    });
  };

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      setCompletedSale(null);
      form.reset();
    }
    setIsOpen(newOpen);
  };

  return {
    isOpen,
    setIsOpen,
    customers,
    authUser,
    isPending,
    completedSale,
    setCompletedSale,
    form,
    watchItems,
    watchDiscountType,
    watchDiscountValue,
    watchPaymentMethod,
    watchCustomerId,
    selectedCustomer,
    customerCredit,
    subtotal,
    hasOutOfStock,
    currentItemsDetails,
    discountAmount,
    total,
    creditToApply,
    totalAfterCredit,
    onSubmit,
    handleDialogClose
  };
}
