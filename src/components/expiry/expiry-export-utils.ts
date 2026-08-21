'use client';

import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Item } from '@/lib/types';
import { itemStockValue } from '@/lib/expiry-stats';

interface ExportUser {
  companyName?: string | null;
  address?: string | null;
  phone?: string | null;
}

export function handleDownloadPdf(filteredAndSortedItems: Item[], authUser: ExportUser | null, reportTitle: string) {
  if (!filteredAndSortedItems.length || !authUser) return;

  const doc = new jsPDF();
  const dateString = format(new Date(), 'PPP');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(authUser.companyName || 'Pharmacy', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(authUser.address || '', 14, 26);
  doc.text(authUser.phone || '', 14, 32);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Medicine Expiry Report (${reportTitle})`, 105, 45, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated on: ${dateString}`, 105, 51, { align: 'center' });
  doc.setTextColor(0);

  const totalValue = filteredAndSortedItems.reduce((sum, item) => sum + itemStockValue(item), 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Stock value at risk: ৳${totalValue.toFixed(2)}`, 105, 56, { align: 'center' });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 62,
    head: [['Title', 'Group (Generic)', 'Company', 'Expiry Date', 'Stock', 'Cost (TK)', 'Value (TK)']],
    body: filteredAndSortedItems.map(item => [
      item.title,
      item.medicineGroup || '-',
      item.company || '-',
      item.expiryDate || '-',
      item.stock,
      item.productionPrice.toFixed(2),
      itemStockValue(item).toFixed(2),
    ]),
  });

  doc.save(`expiry-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function handleDownloadXlsx(filteredAndSortedItems: Item[], reportTitle: string) {
  if (!filteredAndSortedItems.length) return;

  const dataToExport = filteredAndSortedItems.map(item => ({
    Title: item.title,
    'Group (Generic)': item.medicineGroup || '-',
    Company: item.company || '-',
    'Expiry Date': item.expiryDate || '-',
    Stock: item.stock,
    'Production Cost': item.productionPrice,
    'Stock Value (Cost)': itemStockValue(item),
    'Selling Price': item.sellingPrice,
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  const columnWidths = Object.keys(dataToExport[0]).map(key => {
    const maxLength = Math.max(
      ...dataToExport.map(row => String(row[key as keyof typeof row]).length),
      key.length
    );
    return { wch: maxLength + 2 };
  });
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle.slice(0, 30) || 'Expiry Report');
  XLSX.writeFile(workbook, `expiry-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
