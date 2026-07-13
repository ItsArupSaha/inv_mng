'use client';

import * as React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Item } from '@/lib/types';

interface StockWarningsKpisProps {
  activeWarnings: Item[];
}

export function StockWarningsKpis({ activeWarnings }: StockWarningsKpisProps) {
  const outOfStockCount = React.useMemo(
    () => activeWarnings.filter((i) => i.stock === 0).length,
    [activeWarnings]
  );
  
  const lowStockCount = React.useMemo(
    () => activeWarnings.filter((i) => i.stock > 0).length,
    [activeWarnings]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
      <Card className="border border-red-200/60 bg-red-50/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription className="text-red-700/80 font-medium">Out of Stock</CardDescription>
          <CardTitle className="text-3xl font-bold font-headline text-red-900 flex items-center justify-between">
            {outOfStockCount}
            <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="border border-amber-200/60 bg-amber-50/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardDescription className="text-amber-700/80 font-medium">Low Stock Alerts</CardDescription>
          <CardTitle className="text-3xl font-bold font-headline text-amber-900 flex items-center justify-between">
            {lowStockCount}
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
