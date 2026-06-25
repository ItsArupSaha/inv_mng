import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { DateRange } from 'react-day-picker';
import type { Customer, Item } from '@/lib/types';
import { getFilteredSales, resolveExportBreakdownForSales } from './sales-export-utils';

export async function downloadSalesXlsx(userId: string, dateRange: DateRange | undefined, items: Item[], customers: Customer[]) {
  const filteredSales = await getFilteredSales(userId, dateRange);
  if (!filteredSales || filteredSales.length === 0) {
    return false;
  }

  const exportBreakdown = await resolveExportBreakdownForSales(userId, filteredSales, dateRange!.to || dateRange!.from!);
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || 'Unknown Customer';
  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  const dataToExport = filteredSales.map(sale => ({
    'Date': format(new Date(sale.date), 'yyyy-MM-dd'),
    'Sale ID': sale.saleId,
    'Customer': getCustomerName(sale.customerId),
    'Items': sale.items.map(i => `${i.quantity}x ${getItemTitle(i.itemId)}`).join('; '),
    'Discount': sale.discountType === 'percentage' ? `${sale.discountValue}%` : sale.discountValue,
    'Status': exportBreakdown[sale.id]?.statusLabel || sale.paymentMethod,
    'Paid Amount': exportBreakdown[sale.id]?.paidAmount ?? sale.total,
    'Due Amount': exportBreakdown[sale.id]?.dueAmount ?? 0,
    'Total': sale.total,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  // Auto-fit columns
  const columnWidths = Object.keys(dataToExport[0]).map(key => {
    const maxLength = Math.max(
      ...dataToExport.map(row => {
        const value = row[key as keyof typeof row];
        return typeof value === 'number' ? String(value).length : (value || '').length;
      }),
      key.length
    );
    return { wch: maxLength + 2 };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
  XLSX.writeFile(workbook, `sales-report-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.xlsx`);
  return true;
}

export async function downloadSalesItemsXlsx(userId: string, dateRange: DateRange | undefined, items: Item[]) {
  const filteredSales = await getFilteredSales(userId, dateRange);
  if (!filteredSales || filteredSales.length === 0) {
    return false;
  }

  const getItemTitle = (itemId: string) => items.find(i => i.id === itemId)?.title || 'Unknown Item';

  const summary: Record<string, { title: string; qty: number; revenue: number }> = {};
  for (const sale of filteredSales) {
    for (const saleItem of sale.items) {
      const title = getItemTitle(saleItem.itemId);
      if (!summary[saleItem.itemId]) {
        summary[saleItem.itemId] = { title, qty: 0, revenue: 0 };
      }
      summary[saleItem.itemId].qty += saleItem.quantity;
      summary[saleItem.itemId].revenue += saleItem.quantity * saleItem.price;
    }
  }
  const summaryRows = Object.values(summary).sort((a, b) => a.title.localeCompare(b.title));

  const dataToExport = summaryRows.map((row, i) => ({
    '#': i + 1,
    'Item / Book Title': row.title,
    'Qty Sold': row.qty,
    'Total Revenue (BDT)': row.revenue,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const columnWidths = [{ wch: 5 }, { wch: 40 }, { wch: 12 }, { wch: 22 }];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Items Sold');
  XLSX.writeFile(workbook, `items-sold-${format(dateRange!.from!, 'yyyy-MM-dd')}-to-${format(dateRange!.to! || dateRange!.from!, 'yyyy-MM-dd')}.xlsx`);
  return true;
}
