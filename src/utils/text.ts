/**
 * Normalizes description text:
 * - Collapses 2+ consecutive newlines into maximum 1 empty line (2 newlines total)
 * - Preserves single newlines and other whitespace
 *
 * Examples:
 * "foo\n\nbar" → "foo\n\nbar" (unchanged)
 * "foo\n\n\nbar" → "foo\n\nbar" (3 newlines → 2)
 * "foo\n\n\n\n\nbar" → "foo\n\nbar" (5 newlines → 2)
 */
export function normalizeDescription(text: string): string {
  return text.replaceAll(/\n{3,}/g, '\n\n')
}
