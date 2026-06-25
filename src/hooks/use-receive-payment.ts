'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addPayment, getCustomersWithDueBalance } from '@/lib/actions';
import type { CustomerWithDue } from '@/lib/types';
import { paymentSchema, type PaymentFormValues } from '@/components/receive-payment/schema';

interface UseReceivePaymentProps {
  customerId?: string;
  userId: string;
  onPaymentReceived: () => void;
}

export function useReceivePayment({
  customerId,
  userId,
  onPaymentReceived,
}: UseReceivePaymentProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [customersWithDue, setCustomersWithDue] = React.useState<CustomerWithDue[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    async function loadCustomersWithDue() {
      if (isOpen && !customerId && userId) {
        setIsLoadingCustomers(true);
        try {
          const dueCustomers = await getCustomersWithDueBalance(userId);
          setCustomersWithDue(dueCustomers);
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load customers with due balance.' });
        } finally {
          setIsLoadingCustomers(false);
        }
      }
    }
    
    loadCustomersWithDue();
  }, [isOpen, customerId, userId, toast]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: customerId || '',
      amount: 0,
      paymentMethod: 'Cash',
    },
  });

  React.useEffect(() => {
    form.reset({
      customerId: customerId || '',
      amount: 0,
      paymentMethod: 'Cash',
    });
  }, [customerId, form, isOpen]);

  const onSubmit = (data: PaymentFormValues) => {
    startTransition(async () => {
      try {
        await addPayment(userId, data);
        toast({
          title: 'Payment Received',
          description: 'The customer payment has been successfully recorded.',
        });
        onPaymentReceived();
        setIsOpen(false);
        form.reset();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to record payment.',
        });
      }
    });
  };

  return {
    isOpen,
    setIsOpen,
    isPending,
    customersWithDue,
    isLoadingCustomers,
    form,
    onSubmit,
  };
}
