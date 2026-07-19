import * as React from 'react';
import type { Item } from '@/lib/types';
import { getFormCategory, getStrengths, matchStrength } from '@/components/sales/sales-directory-utils';
import { compareItemsForSearch } from '@/lib/search-utils';

export function useSalesDirectorySearch(items: Item[]) {
  const [directoryQuery, setDirectoryQuery] = React.useState('');
  const [selectedAlternativeItem, setSelectedAlternativeItem] = React.useState<Item | null>(null);

  const alternativeMedicines = React.useMemo(() => {
    if (!selectedAlternativeItem || !selectedAlternativeItem.medicineGroup) return [];
    const groupLower = selectedAlternativeItem.medicineGroup.trim().toLowerCase();
    
    const matching = items.filter(
      (item) =>
        item.id !== selectedAlternativeItem.id &&
        item.medicineGroup &&
        item.medicineGroup.trim().toLowerCase() === groupLower
    );

    const targetForm = getFormCategory(selectedAlternativeItem.title || '');
    const targetStrengths = getStrengths(selectedAlternativeItem.title || '');

    return [...matching].sort((a, b) => {
      const formA = getFormCategory(a.title || '');
      const formB = getFormCategory(b.title || '');
      
      const strengthsA = getStrengths(a.title || '');
      const strengthsB = getStrengths(b.title || '');
      
      const formMatchA = formA === targetForm;
      const formMatchB = formB === targetForm;
      
      const strengthMatchA = matchStrength(strengthsA, targetStrengths);
      const strengthMatchB = matchStrength(strengthsB, targetStrengths);
      
      const scoreA = formMatchA && strengthMatchA ? 3 : formMatchA ? 2 : strengthMatchA ? 1 : 0;
      const scoreB = formMatchB && strengthMatchB ? 3 : formMatchB ? 2 : strengthMatchB ? 1 : 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [selectedAlternativeItem, items]);

  const filteredDirectoryItems = React.useMemo(() => {
    const q = directoryQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 8);

    const matches = items.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.medicineGroup || '').toLowerCase().includes(q) ||
        (item.company || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q)
    );

    return matches
      .sort((a, b) => compareItemsForSearch(a, b, q))
      .slice(0, 50);
  }, [directoryQuery, items]);

  return {
    directoryQuery,
    setDirectoryQuery,
    selectedAlternativeItem,
    setSelectedAlternativeItem,
    alternativeMedicines,
    filteredDirectoryItems,
  };
}
