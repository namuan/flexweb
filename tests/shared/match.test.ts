import { describe, expect, it } from 'vitest';
import { anyPatternMatches, matchesPattern, patternForUrl } from '../../src/shared/match';

describe('URL matching helpers', () => {
  it('creates a site-wide pattern from a URL', () => {
    expect(patternForUrl('https://example.com/articles/123')).toBe('https://example.com/*');
  });

  it('matches wildcard URL patterns', () => {
    expect(matchesPattern('https://example.com/articles/123', 'https://example.com/*')).toBe(true);
    expect(matchesPattern('https://example.org/articles/123', 'https://example.com/*')).toBe(false);
  });

  it('matches any pattern in a list', () => {
    expect(anyPatternMatches('https://docs.example.com/page', ['https://example.com/*', 'https://docs.example.com/*'])).toBe(true);
  });
});
