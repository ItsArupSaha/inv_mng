'use server';

import type { Sale } from '../types';
import {
  getSales as getSalesImpl,
  getSalesPaginated as getSalesPaginatedImpl,
  getSalesForCustomer as getSalesForCustomerImpl,
  getSalesForMonth as getSalesForMonthImpl,
  searchSales as searchSalesImpl,
} from './sales-queries';
import {
  addSale as addSaleImpl,
  deleteSale as deleteSaleImpl,
} from './sales-actions';

export async function getSales(userId: string): Promise<Sale[]> {
  return getSalesImpl(userId);
}

export async function getSalesPaginated(params: {
  userId: string;
  pageLimit?: number;
  lastVisibleId?: string;
}): Promise<{ sales: Sale[]; hasMore: boolean }> {
  return getSalesPaginatedImpl(params);
}

export async function getSalesForCustomer(userId: string, customerId: string): Promise<Sale[]> {
  return getSalesForCustomerImpl(userId, customerId);
}

export async function getSalesForMonth(userId: string, year: number, month: number): Promise<Sale[]> {
  return getSalesForMonthImpl(userId, year, month);
}

export async function searchSales(userId: string, searchTerm: string): Promise<Sale[]> {
  return searchSalesImpl(userId, searchTerm);
}

export async function addSale(
  userId: string,
  data: Omit<Sale, 'id' | 'saleId' | 'subtotal' | 'total'> & { creditApplied?: number; total?: number }
): Promise<{ success: boolean; error?: string; sale?: Sale }> {
  return addSaleImpl(userId, data);
}

export async function deleteSale(userId: string, saleId: string): Promise<{ success: boolean; error?: string }> {
  return deleteSaleImpl(userId, saleId);
}
