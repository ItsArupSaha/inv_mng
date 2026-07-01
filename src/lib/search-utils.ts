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
    .replace(/^x/, 'z')
    .replace(/x/g, 'z')
    .replace(/j/g, 'z')
    .replace(/ph/g, 'f')
    .replace(/y/g, 'i')
    .replace(/c/g, 'k')
    .replace(/sh/g, 's')
    .replace(/oo/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/(.)\1+/g, '$1');
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

  // 3. Edit distance check on individual words (to catch keyboard typos)
  const targetWords = targetLower.split(/[\s\-]+/);
  const queryWords = queryLower.split(/[\s\-]+/);
  
  for (const qWord of queryWords) {
    if (qWord.length < 3) continue; // skip very short query words for edit distance
    const maxDist = qWord.length >= 5 ? 2 : 1;
    
    for (const tWord of targetWords) {
      if (tWord.length < 3) continue;
      const prefix = tWord.substring(0, qWord.length);
      const dist = getLevenshteinDistance(prefix, qWord);
      if (dist <= maxDist) return true;
    }
  }
  
  return false;
}
