import { describe, it, expect } from 'vitest';
import { stripArtifacts } from '../utils/markdown.js';

describe('stripArtifacts', () => {
  it('removes bracketed text up to 40 characters', () => {
    const result = stripArtifacts('Hello [short ref] world');
    expect(result).toBe('Hello  world');
  });

  it('removes word-count annotations in Spanish', () => {
    const result = stripArtifacts('Some text (248 palabras) here');
    expect(result).toBe('Some text  here');
  });

  it('removes word-count annotations in English', () => {
    const result = stripArtifacts('Some text (10 words) here');
    expect(result).toBe('Some text  here');
  });

  it('removes singular word annotation in Spanish', () => {
    const result = stripArtifacts('Párrafo (1 palabra) fin');
    expect(result).toBe('Párrafo  fin');
  });

  it('removes singular word annotation in English', () => {
    const result = stripArtifacts('Paragraph (1 word) end');
    expect(result).toBe('Paragraph  end');
  });

  it('fixes odd count of ** per line by removing the first one', () => {
    // Line with 3 ** markers (odd) → first ** is removed
    const result = stripArtifacts('Hello **world** and **broken');
    // "Hello **world** and **broken" has 3 **, odd → replace first ** → "Hello world** and **broken"
    expect(result).toBe('Hello world** and **broken');
  });

  it('does not modify lines with even count of **', () => {
    const result = stripArtifacts('Hello **world** done');
    expect(result).toBe('Hello **world** done');
  });

  it('does not remove brackets with text over 40 characters', () => {
    const longBracket = '[VERY LONG TEXT OVER 40 CHARACTERS THAT SHOULD NOT BE REMOVED]';
    const result = stripArtifacts(`Before ${longBracket} after`);
    expect(result).toContain(longBracket);
  });

  it('trims leading and trailing whitespace', () => {
    const result = stripArtifacts('   hello world   ');
    expect(result).toBe('hello world');
  });

  it('handles empty string', () => {
    const result = stripArtifacts('');
    expect(result).toBe('');
  });

  it('returns empty string when input contains only artifacts', () => {
    const result = stripArtifacts('[ref] (10 words)');
    expect(result.trim()).toBe('');
  });
});
