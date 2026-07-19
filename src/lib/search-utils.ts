/**
 * Search Utilities for Fuzzy Spelling and Phonetic Matches.
 * Used across the POS selectors and inventory directory lists.
 */

/**
 * Normalizes text phonetically to handle common brand name typos.
 */
export function normalizePhonetic(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/sh/g, 'z') // soft sibilants mapped to common z sound
    .replace(/ch/g, 'k')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'z')
    .replace(/j/g, 'z')
    .replace(/g/g, 'z')
    .replace(/s/g, 'z')
    .replace(/w/g, 'v') // w and v are frequently swapped
    .replace(/[aeiouy]/g, 'a') // collapse all vowel spaces to 'a'
    .replace(/(.)\1+/g, '$1'); // collapse duplicate letters
}

/**
 * Computes Levenshtein Distance (Edit Distance) between two strings.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Checks if target matches the query string using substring, phonetic,
 * or keyboard-typo (edit distance) similarity matching.
 */
export function isFuzzyMatch(target: string | null | undefined, query: string): boolean {
  if (!target || !query) return false;
  
  const targetLower = target.toLowerCase().trim();
  const queryLower = query.toLowerCase().trim();
  
  if (!queryLower) return false;

  // 1. Direct exact match or substring match
  if (targetLower.includes(queryLower)) return true;
  
  // 2. Phonetic normalized substring match
  const normTarget = normalizePhonetic(targetLower);
  const normQuery = normalizePhonetic(queryLower);
  if (normTarget.includes(normQuery)) return true;

  // 3. Edit distance check on individual normalized words
  const targetWords = targetLower.split(/[\s\-]+/);
  const queryWords = queryLower.split(/[\s\-]+/);
  
  for (const qWord of queryWords) {
    if (qWord.length < 3) continue; // skip very short query words
    const maxDist = qWord.length >= 5 ? 2 : 1;
    const normQ = normalizePhonetic(qWord);
    
    for (const tWord of targetWords) {
      if (tWord.length < 3) continue;
      const normT = normalizePhonetic(tWord);
      const prefix = normT.substring(0, normQ.length);
      const dist = getLevenshteinDistance(prefix, normQ);
      if (dist <= maxDist) return true;
    }
  }
  
  return false;
}

/**
 * Categorizes item form factor to prioritize Tablets & Capsules over Syrups, Suspensions, Creams, etc.
 * 1 = Tablets & Capsules
 * 2 = Syrups, Suspensions, Liquids, Drops, Solutions
 * 3 = Creams, Ointments, Gels, Injections, Others
 */
export function getFormFactorRank(title: string | null | undefined): number {
  if (!title) return 3;
  const t = title.toLowerCase();

  // Rank 1: Tablets & Capsules
  if (
    /\b(tab|tablets?|cap|capsules?)\b/i.test(t) ||
    t.includes('tab') ||
    t.includes('cap')
  ) {
    return 1;
  }

  // Rank 2: Syrups, Suspensions, Liquids, Drops
  if (
    /\b(syr|syrups?|susp|suspensions?|drop|drops|sol|solutions?|liq|liquids?)\b/i.test(t) ||
    t.includes('syr') ||
    t.includes('susp') ||
    t.includes('drop')
  ) {
    return 2;
  }

  // Rank 3: Others (Creams, Ointments, Injections, etc.)
  return 3;
}

/**
 * Calculates search match relevance score for an item against a query.
 * Lower score = higher priority.
 */
export function getSearchMatchRank(
  title: string | null | undefined,
  query: string,
  group?: string | null,
  company?: string | null
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const t = (title || '').trim().toLowerCase();
  const g = (group || '').trim().toLowerCase();
  const c = (company || '').trim().toLowerCase();

  // 1. Exact match on title, group, or company
  if (t === q || g === q || c === q) return 1;

  // 2. Title starts with query
  if (t.startsWith(q)) return 2;

  // 3. Title word starts with query
  const tWords = t.split(/[\s\-]+/);
  if (tWords.some((w) => w.startsWith(q))) return 3;

  // 4. Group or company starts with query
  if (g.startsWith(q) || c.startsWith(q)) return 4;

  // 5. Group or company word starts with query
  const gWords = g.split(/[\s\-]+/);
  const cWords = c.split(/[\s\-]+/);
  if (gWords.some((w) => w.startsWith(q)) || cWords.some((w) => w.startsWith(q))) return 5;

  // 6. Title contains query
  if (t.includes(q)) return 6;

  // 7. Group or company contains query
  if (g.includes(q) || c.includes(q)) return 7;

  // 8. Fuzzy title match
  if (isFuzzyMatch(title, q)) return 8;

  // 9. Fuzzy group or company match
  if (isFuzzyMatch(group, q) || isFuzzyMatch(company, q)) return 9;

  return 10;
}

/**
 * Helper to compare two items when searching:
 * First by match relevance, second by form factor (Tablets > Syrups > Others), third by user's chosen sortBy or title.
 */
export function compareItemsForSearch<T extends { title: string; medicineGroup?: string; company?: string; stock?: number; expiryDate?: string }>(
  a: T,
  b: T,
  query: string,
  sortBy: string = 'title-asc'
): number {
  const matchA = getSearchMatchRank(a.title, query, a.medicineGroup, a.company);
  const matchB = getSearchMatchRank(b.title, query, b.medicineGroup, b.company);

  if (matchA !== matchB) {
    return matchA - matchB;
  }

  const formA = getFormFactorRank(a.title);
  const formB = getFormFactorRank(b.title);

  if (formA !== formB) {
    return formA - formB;
  }

  // Tie-breaker based on active sortBy
  if (sortBy === 'title-desc') {
    return (b.title || '').localeCompare(a.title || '');
  }
  if (sortBy === 'stock-asc') {
    return (a.stock || 0) - (b.stock || 0);
  }
  if (sortBy === 'stock-desc') {
    return (b.stock || 0) - (a.stock || 0);
  }
  if (sortBy === 'group-asc') {
    const groupA = a.medicineGroup || '';
    const groupB = b.medicineGroup || '';
    const groupCmp = groupA.localeCompare(groupB);
    if (groupCmp !== 0) return groupCmp;
  }
  if (sortBy === 'company-asc') {
    const companyA = a.company || '';
    const companyB = b.company || '';
    const companyCmp = companyA.localeCompare(companyB);
    if (companyCmp !== 0) return companyCmp;
  }
  if (sortBy === 'expiry-asc') {
    const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    if (dateA !== dateB) return dateA - dateB;
  }

  return (a.title || '').localeCompare(b.title || '');
}


