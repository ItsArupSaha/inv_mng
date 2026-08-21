'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TopSellerRow } from '@/lib/report-generator';

interface ReportTopSellersProps {
  topSellers: TopSellerRow[];
  formatCurrency: (amount: number) => string;
}

export function ReportTopSellers({ topSellers, formatCurrency }: ReportTopSellersProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 font-headline">Top Selling Medicines</h3>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Medicine</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topSellers.length > 0 ? topSellers.map(row => (
              <TableRow key={row.itemTitle}>
                <TableCell className="font-medium max-w-[220px] truncate" title={row.itemTitle}>
                  {row.itemTitle}
                </TableCell>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                <TableCell className={`text-right font-medium ${row.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(row.profit)}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  No sales in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
