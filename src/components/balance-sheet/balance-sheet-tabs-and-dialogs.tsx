'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteCapitalAdjustment, deleteSecurityDeposit } from '@/lib/actions';
import type { Capital, SecurityDeposit } from '@/lib/types';
import { AddCapitalDialog } from './add-capital-dialog';
import { AddSecurityDialog } from './add-security-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CapitalManagementTab } from './capital-management-tab';
import { SecurityDepositsTab } from './security-deposits-tab';

interface BalanceSheetTabsAndDialogsProps {
  userId: string;
  current: any;
  capitalHistory: Capital[];
  securityHistory: SecurityDeposit[];
  onSuccess: () => void;
  formatCurrency: (amount: number) => string;
}

export function BalanceSheetTabsAndDialogs({
  userId,
  current,
  capitalHistory,
  securityHistory,
  onSuccess,
  formatCurrency,
}: BalanceSheetTabsAndDialogsProps) {
  const { toast } = useToast();
  const [isAddCapitalOpen, setIsAddCapitalOpen] = React.useState(false);
  const [isAddSecurityOpen, setIsAddSecurityOpen] = React.useState(false);
  const [editingCapital, setEditingCapital] = React.useState<Capital | null>(null);
  const [editingSecurity, setEditingSecurity] = React.useState<SecurityDeposit | null>(null);

  const handleCloseAddCapital = (open: boolean) => {
    setIsAddCapitalOpen(open);
    if (!open) {
      setEditingCapital(null);
    }
  };

  const handleEditCapital = (cap: Capital) => {
    setEditingCapital(cap);
    setIsAddCapitalOpen(true);
  };

  const handleDeleteCapital = async (capId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this capital entry? This will immediately affect your Cash/Bank balances.'
      )
    )
      return;
    try {
      await deleteCapitalAdjustment(userId, capId);
      toast({
        title: 'Capital Record Deleted',
        description: 'The capital transaction has been deleted successfully.',
      });
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error deleting capital',
        description: 'Failed to delete capital transaction. Please try again.',
      });
    }
  };

  const handleCloseAddSecurity = (open: boolean) => {
    setIsAddSecurityOpen(open);
    if (!open) {
      setEditingSecurity(null);
    }
  };

  const handleEditSecurity = (sec: SecurityDeposit) => {
    setEditingSecurity(sec);
    setIsAddSecurityOpen(true);
  };

  const handleDeleteSecurity = async (secId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this security deposit record? This will immediately affect your Cash/Bank balances.'
      )
    )
      return;
    try {
      await deleteSecurityDeposit(userId, secId);
      toast({
        title: 'Security Deposit Deleted',
        description: 'The security deposit transaction has been deleted successfully.',
      });
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error deleting security deposit',
        description: 'Failed to delete security deposit. Please try again.',
      });
    }
  };

  return (
    <>
      <Tabs defaultValue="capital" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="capital">Capital Management</TabsTrigger>
          <TabsTrigger value="security">Security Deposits</TabsTrigger>
        </TabsList>

        <TabsContent value="capital" className="space-y-4">
          <CapitalManagementTab
            current={current}
            capitalHistory={capitalHistory}
            formatCurrency={formatCurrency}
            onAddCapital={() => setIsAddCapitalOpen(true)}
            onEditCapital={handleEditCapital}
            onDeleteCapital={handleDeleteCapital}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityDepositsTab
            securityHistory={securityHistory}
            formatCurrency={formatCurrency}
            onAddSecurity={() => setIsAddSecurityOpen(true)}
            onEditSecurity={handleEditSecurity}
            onDeleteSecurity={handleDeleteSecurity}
          />
        </TabsContent>
      </Tabs>

      <AddCapitalDialog
        userId={userId}
        isOpen={isAddCapitalOpen}
        onOpenChange={handleCloseAddCapital}
        onSuccess={onSuccess}
        editingCapital={editingCapital}
      />

      <AddSecurityDialog
        userId={userId}
        isOpen={isAddSecurityOpen}
        onOpenChange={handleCloseAddSecurity}
        onSuccess={onSuccess}
        editingSecurity={editingSecurity}
      />
    </>
  );
}
