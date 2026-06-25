'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

interface BalanceSheetTablesProps {
  current: {
    cash: number;
    bank: number;
    receivables: number;
    stockValue: number;
    officeAssetsValue: number;
    totalAssets: number;
    payables: number;
    equity: number;
    totalCapital: number;
    retainedEarnings: number;
  };
  formatCurrency: (amount: number) => string;
}

export function BalanceSheetTables({ current, formatCurrency }: BalanceSheetTablesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 font-headline text-primary">
          Assets & Dues
        </h3>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cash</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.cash)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Bank</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.bank)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Customer Dues (Receivables)</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.receivables)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Stock Value</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.stockValue)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Office Assets</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.officeAssetsValue)}
              </TableCell>
            </TableRow>
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>Total Assets</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.totalAssets)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2 font-headline text-destructive">
          Liabilities & Equity
        </h3>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Payables</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.payables)}
              </TableCell>
            </TableRow>
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>Total Liabilities</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.payables)}
              </TableCell>
            </TableRow>
            
            {/* Owner's Equity Section */}
            <TableRow className="font-medium bg-muted/20">
              <TableCell colSpan={2} className="text-primary font-headline py-1.5 text-xs uppercase tracking-wider">
                Owner&apos;s Equity
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-6 text-muted-foreground">Capital Contributed</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(current.totalCapital)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pl-6">Retained Earnings (Profit/Loss)</TableCell>
              <TableCell className="text-right">
                <span className={current.retainedEarnings < 0 ? "text-destructive font-medium" : "text-primary font-medium"}>
                  {formatCurrency(current.retainedEarnings)}
                </span>
              </TableCell>
            </TableRow>

            <TableRow className="font-semibold bg-primary/10">
              <TableCell>Total Owner&apos;s Equity / Net Worth</TableCell>
              <TableCell className="text-right">
                {formatCurrency(current.equity)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
