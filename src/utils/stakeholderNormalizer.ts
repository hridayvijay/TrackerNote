/**
 * Calculates the Levenshtein distance between two strings.
 * @param a - First string
 * @param b - Second string
 * @returns The distance (number of edits required to change one string into the other)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Normalizes a stakeholder name by removing honorifics, fixing casing, and fuzzy-matching
 * against existing stakeholder names to prevent duplicates due to slight misspellings.
 *
 * @param rawName - The raw stakeholder name input (e.g. "Mr. John Doe")
 * @param existingStakeholders - An array of existing stakeholder names to match against
 * @returns The normalized stakeholder name, or an existing one if a close match is found
 */
export function normalizeStakeholder(rawName: string, existingStakeholders: string[]): string {
  // 1. Strip honorifics
  const honorificsPattern = /\b(?:Sir|Ma'am|Maam|Ma am|Mr|Mrs|Ms|Dr|Miss|Ji|Sahab)\b\.?/gi;
  let cleaned = rawName.replace(honorificsPattern, '');

  // 2. Strip trailing/leading whitespace and normalize internal spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 3. Convert to Title Case
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // 4. Fuzzy-match against existingStakeholders using Levenshtein distance (threshold <= 2)
  for (const existing of existingStakeholders) {
    if (levenshteinDistance(cleaned, existing) <= 2) {
      return existing; // Return exactly as stored
    }
  }

  // 5. If no match, return cleaned Title Case
  return cleaned;
}
