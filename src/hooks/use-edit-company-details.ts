'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateCompanyDetails } from '@/lib/actions';
import type { AuthUser } from '@/lib/types';
import { useCapitalAdjustments } from './use-capital-adjustments';

export const companyDetailsSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters.'),
  subtitle: z.string().optional(),
  storeType: z.enum(['general', 'pharmacy', 'bookstore']),
  address: z.string().min(5, 'Please enter a valid address.'),
  phone: z.string().min(5, 'Please enter a valid phone number.'),
  bkashNumber: z.string().optional(),
  bankInfo: z.string().optional(),
  secretKey: z.string().optional(),
  cashAdjustment: z.coerce.number().optional(),
  bankAdjustment: z.coerce.number().optional(),
});

export type CompanyDetailsFormValues = z.infer<typeof companyDetailsSchema>;

interface UseEditCompanyDetailsProps {
  user: AuthUser;
}

export function useEditCompanyDetails({ user }: UseEditCompanyDetailsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Call the capital adjustments sub-hook
  const capital = useCapitalAdjustments({ userId: user.uid, isOpen });

  const form = useForm<CompanyDetailsFormValues>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      companyName: user.companyName || '',
      subtitle: user.subtitle || '',
      storeType: user.storeType || 'general',
      address: user.address || '',
      phone: user.phone || '',
      bkashNumber: user.bkashNumber || '',
      bankInfo: user.bankInfo || '',
      secretKey: '',
      cashAdjustment: 0,
      bankAdjustment: 0,
    },
  });

  // Re-synchronize values when user details change
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        companyName: user.companyName || '',
        subtitle: user.subtitle || '',
        storeType: user.storeType || 'general',
        address: user.address || '',
        phone: user.phone || '',
        bkashNumber: user.bkashNumber || '',
        bankInfo: user.bankInfo || '',
        secretKey: '',
        cashAdjustment: 0,
        bankAdjustment: 0,
      });
    }
  }, [isOpen, user, form]);

  const onSubmit = async (data: CompanyDetailsFormValues) => {
    setIsSubmitting(true);
    try {
      const { cashAdjustment, bankAdjustment, ...companyData } = data;
      const adjustments = {
        cash: cashAdjustment || 0,
        bank: bankAdjustment || 0,
      };

      // Run details update and capital adjustments in parallel
      await Promise.all([
        updateCompanyDetails(user.uid, companyData),
        capital.adjustCapital(adjustments),
      ]);

      toast({
        title: 'Details Updated!',
        description: 'Your store information has been successfully saved.',
      });
      setIsOpen(false);
      // Force a reload to reflect changes everywhere
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not save your store details. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    isSubmitting,
    balances: capital.balances,
    isLoadingCapital: capital.isLoadingCapital,
    form,
    onSubmit,
  };
}
