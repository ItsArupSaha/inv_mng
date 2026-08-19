import { describe, it, expect } from 'vitest';
import { isFuzzyMatch, getSearchMatchRank, compareItemsForSearch } from '../search-utils';

// The pharmacist's real-world typo cases.
const CATALOG = [
  { id: '1', title: 'Alcet 10mg Tablet', medicineGroup: 'Cetirizine', company: 'Square', stock: 10, expiryDate: '2027-01-01' },
  { id: '2', title: 'Zorel 20mg Tablet', medicineGroup: 'Omeprazole', company: 'Incepta', stock: 5, expiryDate: '2027-02-01' },
  { id: '3', title: 'Napa 500mg Tablet', medicineGroup: 'Paracetamol', company: 'Beximco', stock: 20, expiryDate: '2027-03-01' },
  { id: '4', title: 'Alatrol 10mg Tablet', medicineGroup: 'Cetirizine', company: 'Opsonin', stock: 8, expiryDate: '2027-04-01' },
] as const;

const rankOf = (title: string, query: string) =>
  getSearchMatchRank(title, query);

describe('isFuzzyMatch — pharmacist typo cases', () => {
  it.each(['alset', 'elset', 'elcet', 'alset'])('"%s" matches "Alcet"', (query) => {
    expect(isFuzzyMatch('Alcet 10mg Tablet', query)).toBe(true);
  });

  it.each(['xorel', 'jorel', 'gorel'])('"%s" matches "Zorel"', (query) => {
    expect(isFuzzyMatch('Zorel 20mg Tablet', query)).toBe(true);
  });

  it('keeps substring and phonetic behavior', () => {
    expect(isFuzzyMatch('Napa 500mg Tablet', 'napa')).toBe(true);      // substring
    expect(isFuzzyMatch('Napa 500mg Tablet', 'NAPA')).toBe(true);      // case
    expect(isFuzzyMatch('Monas 10 Tablet', 'monas')).toBe(true);
  });

  it('rejects unrelated words', () => {
    expect(isFuzzyMatch('Napa 500mg Tablet', 'computer')).toBe(false);
    expect(isFuzzyMatch('Napa 500mg Tablet', '')).toBe(false);
    expect(isFuzzyMatch(null, 'napa')).toBe(false);
  });
});

describe('getSearchMatchRank — graded tiers', () => {
  it('exact and prefix stay cheapest', () => {
    expect(rankOf('Napa 500mg Tablet', 'napa 500mg tablet')).toBe(1); // exact title
    expect(rankOf('Napa 500mg Tablet', 'napa')).toBe(2);              // prefix
  });

  it('one-letter typo ranks better than two-letter typo', () => {
    const oneLetter = rankOf('Alcet 10mg Tablet', 'alset');   // dist 1
    const twoLetter = rankOf('Alcet 10mg Tablet', 'elset');   // dist 2
    expect(oneLetter).toBeLessThan(twoLetter);
    expect(oneLetter).toBeGreaterThanOrEqual(8);
    expect(twoLetter).toBeLessThan(9);
  });

  it('the right medicine outranks a different brand for every variant', () => {
    for (const query of ['alcet', 'alset', 'elset', 'elcet']) {
      expect(rankOf('Alcet 10mg Tablet', query)).toBeLessThan(
        rankOf('Alatrol 10mg Tablet', query)
      );
    }
    for (const query of ['zorel', 'xorel', 'jorel', 'gorel']) {
      expect(rankOf('Zorel 20mg Tablet', query)).toBeLessThan(
        rankOf('Alatrol 10mg Tablet', query)
      );
    }
  });

  it('generic (group) typo still matches, graded below title typo', () => {
    const titleTypo = getSearchMatchRank('Napa 500mg Tablet', 'naps');                          // title dist 1
    const groupTypo = getSearchMatchRank('Napa 500mg Tablet', 'paracetamoo', 'Paracetamol');    // group dist 1
    expect(titleTypo).toBeLessThan(groupTypo);
    expect(groupTypo).toBeLessThan(10);
  });
});

describe('compareItemsForSearch — end-to-end ordering', () => {
  it('puts the intended medicine first for every real-world variant', () => {
    for (const query of ['alcet', 'alset', 'elset', 'elcet']) {
      const sorted = [...CATALOG].sort((a, b) => compareItemsForSearch(a, b, query));
      expect(sorted[0].title).toBe('Alcet 10mg Tablet');
    }
    for (const query of ['zorel', 'xorel', 'jorel', 'gorel']) {
      const sorted = [...CATALOG].sort((a, b) => compareItemsForSearch(a, b, query));
      expect(sorted[0].title).toBe('Zorel 20mg Tablet');
    }
  });

  it('prefers tablets over other form factors at equal match', () => {
    const items = [
      { title: 'Alcet Syrup', medicineGroup: 'Cetirizine', company: 'Square', stock: 1, expiryDate: '2027-01-01' },
      { title: 'Alcet 10mg Tablet', medicineGroup: 'Cetirizine', company: 'Square', stock: 1, expiryDate: '2027-01-01' },
    ];
    const sorted = [...items].sort((a, b) => compareItemsForSearch(a, b, 'alset'));
    expect(sorted[0].title).toBe('Alcet 10mg Tablet');
  });
});
