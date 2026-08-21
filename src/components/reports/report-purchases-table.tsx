'use client';

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { PurchaseActivitySummary } from '@/lib/report-generator';

interface ReportPurchasesTableProps {
  purchases: PurchaseActivitySummary;
  formatCurrency: (amount: number) => string;
}

export function ReportPurchasesTable({ purchases, formatCurrency }: ReportPurchasesTableProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 font-headline">Purchases (Stock Inflow)</h3>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Total Purchased</TableCell>
            <TableCell className="text-right">{formatCurrency(purchases.totalPurchased)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Paid to Suppliers</TableCell>
            <TableCell className="text-right text-destructive">
              ({formatCurrency(Math.max(0, purchases.paidToSuppliers))})
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>New Supplier Due</TableCell>
            <TableCell className="text-right text-destructive">
              ({formatCurrency(purchases.newSupplierDue)})
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
