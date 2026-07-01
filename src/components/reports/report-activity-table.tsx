'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface ReportActivityTableProps {
  monthlyActivity: {
    totalSales: number;
    totalProfit: number;
    receivedPaymentsFromDues: number;
    totalDonations: number;
    totalExpenses: number;
  };
  formatCurrency: (amount: number) => string;
}

export function ReportActivityTable({ monthlyActivity, formatCurrency }: ReportActivityTableProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 font-headline">Monthly Activity</h3>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Total Sales</TableCell>
            <TableCell className="text-right">{formatCurrency(monthlyActivity.totalSales)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Profit</TableCell>
            <TableCell className="text-right">{formatCurrency(monthlyActivity.totalProfit)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Received Payments from Dues</TableCell>
            <TableCell className="text-right">{formatCurrency(monthlyActivity.receivedPaymentsFromDues)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Donations</TableCell>
            <TableCell className="text-right text-primary">{formatCurrency(monthlyActivity.totalDonations)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Expenses</TableCell>
            <TableCell className="text-right text-destructive">
              ({formatCurrency(monthlyActivity.totalExpenses)})
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
