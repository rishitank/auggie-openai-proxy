/**
 * Tests for services/log-sanitizer.ts
 *
 * Verifies that user-controlled values cannot forge or split log entries
 */

import { sanitizeForLog } from './log-sanitizer';

describe('services/log-sanitizer', () => {
  describe('sanitizeForLog', () => {
    it('should leave ordinary values unchanged', () => {
      expect(sanitizeForLog('claude-sonnet-4-5')).toBe('claude-sonnet-4-5');
      expect(sanitizeForLog('model with spaces')).toBe('model with spaces');
    });

    it('should keep printable non-ASCII characters', () => {
      expect(sanitizeForLog('modèle-日本語-🚀')).toBe('modèle-日本語-🚀');
    });

    it('should remove LF so a value cannot start a forged log line', () => {
      const forged = 'gpt-5\n[Webhook:admin] Model: evil, PromptLength: 0';

      const result = sanitizeForLog(forged);

      expect(result).toBe('gpt-5[Webhook:admin] Model: evil, PromptLength: 0');
      expect(result).not.toMatch(/[\r\n]/);
    });

    it('should remove CR and CRLF sequences', () => {
      expect(sanitizeForLog('a\rb\r\nc')).toBe('abc');
    });

    it('should remove ANSI escape (ESC) and other C0 control characters', () => {
      expect(sanitizeForLog('\u001b[31mred\u001b[0m')).toBe('[31mred[0m');
      expect(sanitizeForLog('tab\there\u0000nul\u0008bs')).toBe('tabherenulbs');
    });

    it('should remove DEL and C1 controls including NEL (U+0085)', () => {
      expect(sanitizeForLog('a\u007fb\u0085c\u009fd')).toBe('abcd');
    });

    it('should remove Unicode line and paragraph separators', () => {
      expect(sanitizeForLog('a b c')).toBe('abc');
    });

    it('should stringify non-string values', () => {
      expect(sanitizeForLog(42)).toBe('42');
      expect(sanitizeForLog(undefined)).toBe('undefined');
    });

    it('should return an empty string when the value is only control characters', () => {
      expect(sanitizeForLog('\r\n\t\u001b')).toBe('');
    });
  });
});
