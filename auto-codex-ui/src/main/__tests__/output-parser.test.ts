import { describe, it, expect } from 'vitest';
import { extractOAuthAuthUrl } from '../terminal/output-parser';

describe('Terminal Output Parser', () => {
  describe('extractOAuthAuthUrl', () => {
    it('extracts the first https URL', () => {
      const output = 'If your browser does not open, visit: https://example.com/oauth/start?foo=bar';
      expect(extractOAuthAuthUrl(output)).toBe('https://example.com/oauth/start?foo=bar');
    });

    it('sanitizes common trailing punctuation', () => {
      const output = 'Open: https://example.com/callback).';
      expect(extractOAuthAuthUrl(output)).toBe('https://example.com/callback');
    });

    it('returns null when no URL is present', () => {
      expect(extractOAuthAuthUrl('no url here')).toBeNull();
    });
  });
});

