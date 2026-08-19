/**
 * Pure string-similarity primitives shared by all search surfaces.
 * Kept free of domain concepts (items, medicines) so it is trivially testable.
 */

/**
 * Normalizes text phonetically for common Bangla-to-English transliteration
 * drift: sibilant confusion (s/sh/x/j/z/g), ph/f, th/t, hard-c/q/k, w/v,
 * vowel collapse, and doubled letters.
 */
export function normalizePhonetic(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/sh/g, 'z')
    .replace(/ch/g, 'k')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'z')
    .replace(/j/g, 'z')
    .replace(/g/g, 'z')
    .replace(/s/g, 'z')
    .replace(/w/g, 'v')
    .replace(/[aeiouy]/g, 'a')
    .replace(/(.)\1+/g, '$1');
}

/** Classic Levenshtein edit distance (substitution, insertion, deletion). */
export function getLevenshteinDistance(a: string, b: string): number {
  return boundedDamerauDistance(a, b, Infinity, { allowTransposition: false });
}

/**
 * Damerau-Levenshtein distance (optimal string alignment): Levenshtein plus
 * transposition of two adjacent characters — the most common quick-typing
 * error. `max` enables early exit: any result beyond max returns max + 1.
 */
export function damerauLevenshtein(a: string, b: string, max: number = Infinity): number {
  return boundedDamerauDistance(a, b, max, { allowTransposition: true });
}

function boundedDamerauDistance(
  a: string,
  b: string,
  max: number,
  { allowTransposition }: { allowTransposition: boolean }
): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const rowLength = b.length + 1;
  let prevPrev = new Array<number>(rowLength);
  let prev = new Array<number>(rowLength);
  let curr = new Array<number>(rowLength);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      let value = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
      if (
        allowTransposition &&
        i > 1 && j > 1 &&
        a.charAt(i - 1) === b.charAt(j - 2) &&
        a.charAt(i - 2) === b.charAt(j - 1)
      ) {
        value = Math.min(value, prevPrev[j - 2] + 1); // transposition
      }
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1; // no cell in this row can beat max
    const swapTemp = prevPrev;
    prevPrev = prev;
    prev = curr;
    curr = swapTemp;
  }
  const result = prev[b.length];
  return result > max ? max + 1 : result;
}

/** Maximum tolerated edit distance for a query of the given length. */
export function maxEditsForQueryLength(len: number): number {
  if (len >= 7) return 2;
  if (len >= 5) return 2;
  if (len >= 3) return 1;
  return 0;
}

/**
 * Best-effort typo match of one query word against one target word.
 * Returns the edit distance when within tolerance, else null.
 * Checks the full target word and a prefix window (target may be longer
 * than the query, e.g. query "monas" vs word "monasopa").
 */
export function typoDistance(queryWord: string, targetWord: string): number | null {
  if (queryWord.length < 3 || targetWord.length < 3) return null;
  const max = maxEditsForQueryLength(queryWord.length);
  if (max === 0) return null;

  const candidates: number[] = [damerauLevenshtein(queryWord, targetWord, max)];
  if (targetWord.length > queryWord.length) {
    // Also score against prefix windows so a typo inside a longer brand
    // name still matches: exact-length prefix first, then one extra char.
    candidates.push(damerauLevenshtein(queryWord, targetWord.slice(0, queryWord.length), max));
    candidates.push(damerauLevenshtein(queryWord, targetWord.slice(0, queryWord.length + 1), max));
  }
  const best = Math.min(...candidates);
  return best <= max ? best : null;
}
