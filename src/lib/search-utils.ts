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

  const t = (title || '').toLowerCase();
  const g = (group || '').toLowerCase();
  const c = (company || '').toLowerCase();

  // 1. Direct title start match
  if (t.startsWith(q)) return 1;

  // 2. Title word start match
  const words = t.split(/[\s\-]+/);
  if (words.some((w) => w.startsWith(q))) return 2;

  // 3. Title contains query
  if (t.includes(q)) return 3;

  // 4. Fuzzy title match
  if (isFuzzyMatch(title, q)) return 4;

  // 5. Medicine group / company match
  if (g.startsWith(q) || c.startsWith(q)) return 5;
  if (g.includes(q) || c.includes(q)) return 6;
  if (isFuzzyMatch(g, q) || isFuzzyMatch(c, q)) return 7;

  return 8;
}

/**
 * Helper to compare two items when searching:
 * First by match relevance, second by form factor (Tablets > Syrups > Others), third by title.
 */
export function compareItemsForSearch<T extends { title: string; medicineGroup?: string; company?: string }>(
  a: T,
  b: T,
  query: string
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

  return (a.title || '').localeCompare(b.title || '');
}

