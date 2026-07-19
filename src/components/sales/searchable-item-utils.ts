import { compareItemsForSearch, isFuzzyMatch } from '@/lib/search-utils';
import type { Item } from '@/lib/types';

export function filterAndSortItems({
  items,
  searchQuery,
  value,
  disabledItemIds,
}: {
  items: Item[];
  searchQuery: string;
  value: string;
  disabledItemIds: string[];
}): Item[] {
  const query = searchQuery.trim().toLowerCase();

  if (!query) return [];

  const list = items.filter((item) => {
    if (item.id === value) return true;
    return !disabledItemIds.includes(item.id);
  });

  const matches = list.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const company = (item.company || '').toLowerCase();
    const group = (item.medicineGroup || '').toLowerCase();

    return (
      title.includes(query) ||
      company.includes(query) ||
      group.includes(query) ||
      isFuzzyMatch(title, query) ||
      isFuzzyMatch(group, query) ||
      isFuzzyMatch(company, query)
    );
  });

  return matches
    .sort((a, b) => compareItemsForSearch(a, b, searchQuery))
    .slice(0, 50);
}

