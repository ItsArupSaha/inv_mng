
'use client';
import PayablesManagement from '@/components/payables-management';
import { useAuth } from '@/hooks/use-auth';
import { Landmark } from 'lucide-react';

export default function PayablesPage() {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Landmark className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <PayablesManagement userId={user.uid} />;
}
