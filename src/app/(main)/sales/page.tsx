
'use client';
import SalesManagement from '@/components/sales-management';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function SalesPage() {
    const { user } = useAuth();
    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
    }
  return <SalesManagement userId={user.uid} />;
}
