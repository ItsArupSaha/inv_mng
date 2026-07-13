import { isFuzzyMatch, normalizePhonetic } from '@/lib/search-utils';
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

  const getRelevanceScore = (item: Item) => {
    const title = (item.title || '').toLowerCase();
    const group = (item.medicineGroup || '').toLowerCase();
    const company = (item.company || '').toLowerCase();

    if (title.startsWith(query)) return 1;
    if (title.includes(query)) return 2;
    if (group.startsWith(query)) return 3;
    if (group.includes(query)) return 4;
    if (company.startsWith(query)) return 5;
    if (company.includes(query)) return 6;

    const normTitle = normalizePhonetic(title);
    const normGroup = normalizePhonetic(group);
    const normCompany = normalizePhonetic(company);
    const normQuery = normalizePhonetic(query);

    if (normTitle.startsWith(normQuery)) return 7;
    if (normTitle.includes(normQuery)) return 8;
    if (normGroup.startsWith(normQuery)) return 9;
    if (normGroup.includes(normQuery)) return 10;
    if (normCompany.startsWith(normQuery)) return 11;
    if (normCompany.includes(normQuery)) return 12;

    return 13;
  };

  return matches
    .sort((a, b) => {
      const scoreA = getRelevanceScore(a);
      const scoreB = getRelevanceScore(b);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return (a.title || '').localeCompare(b.title || '');
    })
    .slice(0, 50);
}
