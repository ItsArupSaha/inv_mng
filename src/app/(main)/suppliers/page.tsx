'use client';
import SupplierLedgerManagement from '@/components/suppliers/supplier-ledger-management';
import { useAuth } from '@/hooks/use-auth';
import { Users } from 'lucide-react';

export default function SuppliersPage() {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Users className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <SupplierLedgerManagement userId={user.uid} />;
}
