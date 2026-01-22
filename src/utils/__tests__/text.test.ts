import { describe, it, expect } from 'vitest'
import { normalizeDescription } from '../text'

describe('text utilities', () => {
  it('should return empty string for empty input', () => {
    expect(normalizeDescription('')).toBe('')
  })

  it('should preserve single newlines', () => {
    expect(normalizeDescription('foo\nbar')).toBe('foo\nbar')
  })

  it('should preserve double newlines (1 empty line)', () => {
    expect(normalizeDescription('foo\n\nbar')).toBe('foo\n\nbar')
  })

  it('should collapse 3 newlines to 2', () => {
    expect(normalizeDescription('foo\n\n\nbar')).toBe('foo\n\nbar')
  })

  it('should collapse 5 newlines to 2', () => {
    expect(normalizeDescription('foo\n\n\n\n\nbar')).toBe('foo\n\nbar')
  })

  it('should collapse multiple groups of excessive newlines', () => {
    expect(normalizeDescription('a\n\n\nb\n\n\n\nc')).toBe('a\n\nb\n\nc')
  })

  it('should handle text with multiple empty lines between paragraphs', () => {
    const input = `First paragraph

Second paragraph


Third paragraph`

    const expected = `First paragraph

Second paragraph

Third paragraph`

    expect(normalizeDescription(input)).toBe(expected)
  })

  it('should handle list-like content with single empty lines', () => {
    const input = `- Woof

- Bark

- Meow`

    expect(normalizeDescription(input)).toBe(input)
  })

  it('should normalize list-like content with excessive empty lines', () => {
    const input = `- Woof


- Bark`

    const expected = `- Woof

- Bark`

    expect(normalizeDescription(input)).toBe(expected)
  })

  it('should not affect text without newlines', () => {
    expect(normalizeDescription('simple text')).toBe('simple text')
  })

  it('should handle leading and trailing newlines', () => {
    expect(normalizeDescription('\n\n\ntext\n\n\n')).toBe('\n\ntext\n\n')
  })

  it('should handle mixed whitespace', () => {
    expect(normalizeDescription('foo\n\n\n   \n\nbar')).toBe('foo\n\n   \n\nbar')
  })
})
