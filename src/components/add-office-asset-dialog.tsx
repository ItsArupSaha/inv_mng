'use client';

import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useAddOfficeAsset } from '@/hooks/use-add-office-asset';
import { OfficeAssetFormFields } from './office-assets/office-asset-form-fields';

interface AddOfficeAssetDialogProps {
  userId: string;
  onAssetAdded: () => void;
  children: React.ReactNode;
}

export function AddOfficeAssetDialog({
  userId,
  onAssetAdded,
  children,
}: AddOfficeAssetDialogProps) {
  const { isOpen, setIsOpen, isPending, form, onSubmit } = useAddOfficeAsset({
    userId,
    onAssetAdded,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Office Asset</DialogTitle>
          <DialogDescription>
            Record a non-inventory purchase for business use, like furniture or equipment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
              <OfficeAssetFormFields form={form} />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Asset Purchase
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
