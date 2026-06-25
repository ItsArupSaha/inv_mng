'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addOfficeAsset } from '@/lib/actions';
import { assetSchema, type AssetFormValues } from '@/components/office-assets/schema';

interface UseAddOfficeAssetProps {
  userId: string;
  onAssetAdded: () => void;
}

export function useAddOfficeAsset({
  userId,
  onAssetAdded,
}: UseAddOfficeAssetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      itemName: '',
      quantity: 1,
      cost: 0,
      date: new Date(),
      paymentMethod: 'Cash',
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    startTransition(async () => {
      try {
        const result = await addOfficeAsset(userId, data);
        if (result.success) {
          toast({
            title: 'Office Asset Added',
            description: `Successfully recorded the purchase of ${data.itemName}.`,
          });
          onAssetAdded();
          setIsOpen(false);
          form.reset();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'error' in result ? result.error : 'Failed to add office asset.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to record office asset.',
        });
      }
    });
  };

  return {
    isOpen,
    setIsOpen,
    isPending,
    form,
    onSubmit,
  };
}
