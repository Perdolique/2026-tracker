/**
 * Regex pattern that matches 3 or more consecutive newlines.
 * Used to normalize text by collapsing excessive newlines into maximum 1 empty line (2 newlines total).
 */
export const EXCESSIVE_NEWLINES_REGEX = /\n{3,}/g

/**
 * Normalizes description text:
 * - Collapses 3+ consecutive newlines into maximum 1 empty line (2 newlines total)
 * - Preserves single newlines and other whitespace
 *
 * Examples:
 * "foo\n\nbar" → "foo\n\nbar" (unchanged)
 * "foo\n\n\nbar" → "foo\n\nbar" (3 newlines → 2)
 * "foo\n\n\n\n\nbar" → "foo\n\nbar" (5 newlines → 2)
 */
export function normalizeDescription(text: string): string {
  return text.replaceAll(EXCESSIVE_NEWLINES_REGEX, '\n\n')
}
