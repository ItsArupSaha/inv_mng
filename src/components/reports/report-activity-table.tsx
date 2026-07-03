'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface ReportActivityTableProps {
  activity: {
    totalSales: number;
    totalProfit: number;
    receivedPaymentsFromDues: number;
    totalDonations: number;
    totalExpenses: number;
  };
  formatCurrency: (amount: number) => string;
  title?: string;
}

export function ReportActivityTable({ activity, formatCurrency, title = 'Monthly Activity' }: ReportActivityTableProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 font-headline">{title}</h3>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Total Sales</TableCell>
            <TableCell className="text-right">{formatCurrency(activity.totalSales)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Profit</TableCell>
            <TableCell className="text-right">{formatCurrency(activity.totalProfit)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Received Payments from Dues</TableCell>
            <TableCell className="text-right">{formatCurrency(activity.receivedPaymentsFromDues)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Donations</TableCell>
            <TableCell className="text-right text-primary">{formatCurrency(activity.totalDonations)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Expenses</TableCell>
            <TableCell className="text-right text-destructive">
              ({formatCurrency(activity.totalExpenses)})
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
