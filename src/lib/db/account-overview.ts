import { getAccountOverview as getAccountOverviewImpl } from './account-overview-main';
import {
  getAccountBalances as getAccountBalancesImpl,
  getPayablesAsOfDate as getPayablesAsOfDateImpl,
} from './account-overview-queries';

export async function getAccountOverview(userId: string, asOfDate?: Date) {
  return getAccountOverviewImpl(userId, asOfDate);
}

export async function getAccountBalances(userId: string) {
  return getAccountBalancesImpl(userId);
}


export async function getPayablesAsOfDate(userId: string, asOfDate: Date) {
  return getPayablesAsOfDateImpl(userId, asOfDate);
}
