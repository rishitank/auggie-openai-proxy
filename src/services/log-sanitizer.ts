/**
 * Log Sanitizer
 *
 * Single Responsibility: Neutralise user-controlled values before they are
 * written to plain-text logs (CWE-117, log injection / log forging).
 *
 * A value containing CR/LF could start a new, attacker-authored log line
 * (e.g. "gpt-5\n[Webhook:admin] Model: ..."). Other control characters can
 * rewrite terminal output (ANSI escapes via ESC, backspace) or split lines in
 * log viewers (NEL U+0085, U+2028, U+2029).
 */

/**
 * True for C0 controls (U+0000–U+001F), DEL (U+007F), C1 controls
 * (U+0080–U+009F, which include NEL) and the Unicode line/paragraph
 * separators (U+2028, U+2029).
 */
const isControlCodePoint = (codePoint: number): boolean =>
  codePoint <= 0x1f ||
  (codePoint >= 0x7f && codePoint <= 0x9f) ||
  codePoint === 0x2028 ||
  codePoint === 0x2029;

/**
 * Make a user-controlled value safe to embed in a single log line.
 *
 * CR and LF are removed first, so a value can never start a new log entry;
 * every other control character is then removed as well. Printable text,
 * including non-ASCII characters, is left untouched.
 *
 * Non-string values are converted with String() first.
 */
export const sanitizeForLog = (value: unknown): string => {
  const text = typeof value === 'string' ? value : String(value);

  // Remove line breaks with a literal replace: this is the form static
  // analysers (CodeQL js/log-injection) recognise as a sanitiser.
  const withoutLineBreaks = text.replace(/[\r\n]/g, '');

  let cleaned = '';
  for (const char of withoutLineBreaks) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && !isControlCodePoint(codePoint)) {
      cleaned += char;
    }
  }
  return cleaned;
};
