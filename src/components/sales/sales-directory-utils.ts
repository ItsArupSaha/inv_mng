export function getFormCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\b(supp|suppository|suppositories)\b/i.test(t)) {
    return 'suppository';
  }
  if (/\b(syp|syrup|syrups|susp|suspension|suspensions|pfs|sol|solution|oral|sus)\b/i.test(t)) {
    return 'liquid';
  }
  if (/\b(inj|injection|injections|vial|vials|amp|ampoule)\b/i.test(t)) {
    return 'injection';
  }
  if (/\b(crm|cream|creams|oint|ointment|ointments|gel)\b/i.test(t)) {
    return 'topical';
  }
  if (/\b(drop|drops)\b/i.test(t)) {
    return 'drops';
  }
  return 'tablet_capsule';
}

export function getStrengths(title: string): string[] {
  const t = title.toLowerCase();
  const regex = /\b\d+(\.\d+)?\s*(mg|mcg|%|iu|gm|g|ml)?\b/gi;
  const matches = t.match(regex) || [];
  
  const strengths: string[] = [];
  for (const m of matches) {
    const clean = m.replace(/\s+/g, '');
    if (clean.endsWith('ml')) {
      continue;
    }
    const numMatch = clean.match(/^\d+(\.\d+)?/);
    if (numMatch) {
      strengths.push(numMatch[0]);
    }
  }
  return strengths;
}

export function matchStrength(strengthsA: string[], strengthsB: string[]): boolean {
  if (strengthsA.length === 0 || strengthsB.length === 0) return false;
  return strengthsA.some(s => strengthsB.includes(s));
}
