import { describe, it, expect } from 'vitest';
import {
  normalizePhonetic,
  getLevenshteinDistance,
  damerauLevenshtein,
  typoDistance,
  maxEditsForQueryLength,
} from '../string-similarity';

describe('normalizePhonetic', () => {
  it('unifies sibilant and hard-c confusion', () => {
    expect(normalizePhonetic('zorel')).toBe(normalizePhonetic('xorel'));
    expect(normalizePhonetic('jorel')).toBe(normalizePhonetic('gorel'));
    expect(normalizePhonetic('pharma')).toBe(normalizePhonetic('farma'));
  });

  it('collapses vowels and doubled letters', () => {
    expect(normalizePhonetic('mooneem')).toBe(normalizePhonetic('manam'));
  });
});

describe('edit distances', () => {
  it('levenshtein counts swapped letters as two edits', () => {
    expect(getLevenshteinDistance('teh', 'the')).toBe(2);
  });

  it('damerau counts adjacent swap as one edit', () => {
    expect(damerauLevenshtein('teh', 'the')).toBe(1);
    expect(damerauLevenshtein('pracetamol', 'paracetamol')).toBe(1); // transposition ra<->ar
  });

  it('handles insertions and deletions', () => {
    expect(damerauLevenshtein('alset', 'alcet')).toBe(1); // substitution
    expect(damerauLevenshtein('elcet', 'alcet')).toBe(1);
    expect(damerauLevenshtein('albendzole', 'albendazole')).toBe(1); // insertion
  });

  it('early-exits beyond the bound', () => {
    expect(damerauLevenshtein('napa', 'computer', 1)).toBeGreaterThan(1);
  });

  it('identical strings are zero', () => {
    expect(damerauLevenshtein('napa', 'napa')).toBe(0);
    expect(getLevenshteinDistance('napa', 'napa')).toBe(0);
  });
});

describe('typoDistance tolerance gates', () => {
  it('allows 1 edit for 3–4 letter words', () => {
    expect(maxEditsForQueryLength(3)).toBe(1);
    expect(maxEditsForQueryLength(4)).toBe(1);
    expect(typoDistance('elcet', 'alcet')).toBe(1);
  });

  it('allows 2 edits for 5+ letter words', () => {
    expect(maxEditsForQueryLength(5)).toBe(2);
    expect(typoDistance('elset', 'alcet')).toBe(2);
  });

  it('rejects short and distant words', () => {
    expect(typoDistance('ab', 'ax')).toBeNull();
    expect(typoDistance('napa', 'computer')).toBeNull();
  });

  it('matches a query typo against a longer brand word', () => {
    expect(typoDistance('monas', 'monasopa')).toBe(0);
    expect(typoDistance('monis', 'monasopa')).toBe(1);
  });
});
