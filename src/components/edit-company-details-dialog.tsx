'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
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
import { Separator } from './ui/separator';
import type { AuthUser } from '@/lib/types';
import { useEditCompanyDetails } from '@/hooks/use-edit-company-details';
import { CompanyBaseFields } from './edit-company-details/company-base-fields';
import { CompanyCapitalAdjustment } from './edit-company-details/company-capital-adjustment';

interface EditCompanyDetailsDialogProps {
  user: AuthUser;
  children: React.ReactNode;
}

export function EditCompanyDetailsDialog({ user, children }: EditCompanyDetailsDialogProps) {
  const {
    isOpen,
    setIsOpen,
    isSubmitting,
    balances,
    isLoadingCapital,
    form,
    onSubmit,
  } = useEditCompanyDetails({ user });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Store Details</DialogTitle>
          <DialogDescription>
            Update the information for your store. This will be reflected in reports and memos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 py-1">
              <CompanyBaseFields form={form} />
              <Separator />
              <CompanyCapitalAdjustment
                form={form}
                isLoadingCapital={isLoadingCapital}
                balances={balances}
              />
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="submit" disabled={isSubmitting || isLoadingCapital}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
