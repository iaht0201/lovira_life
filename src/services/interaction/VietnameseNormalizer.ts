/**
 * Vietnamese Text & Speech Input Normalizer for Lovira Life
 * Handles dialect replacements, phonetic STT fixes, and filler word stripping.
 */

export function stripVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeVietnameseText(input: string): string {
  if (!input) return '';

  let text = input.trim().toLowerCase();

  // 1. Remove basic punctuation marks
  text = text.replace(/[?,!.:;"'…()]/g, ' ');

  // 2. STT Phonetic & Dialect Replacement Map
  const dialectMap: [RegExp, string][] = [
    // Phonetic STT misrecognitions for Camera
    [/\bmơ\s+cờ\s+me\s+ra\b/g, 'mở camera'],
    [/\bmơ\s+ca\s+me\s+ra\b/g, 'mở camera'],
    [/\bmở\s+cờ\s+me\s+ra\b/g, 'mở camera'],
    [/\bmở\s+ca\s+me\s+ra\b/g, 'mở camera'],
    [/\bmo\s+camera\b/g, 'mở camera'],
    [/\bmở\s+cam\b/g, 'mở camera'],

    // Dialect words
    [/\bni\b/g, 'này'],
    [/\bmô\b/g, 'đâu'],
    [/\brăng\b/g, 'sao'],
    [/\brứa\b/g, 'vậy'],
    [/\btui\b/g, 'tôi'],

    // Spoken prefixes/suffixes clean-up
    [/\bcho\s+(chú|bác|cô|ông|bà|tôi|tui)\b/g, ''],
    [/\bgiúp\s+(chú|bác|cô|ông|bà|tôi|tui)\b/g, ''],
    [/\b(dạ|ơi|ạ|nhé|nha|hỉ|nè|nghen)\b/g, ''],
  ];

  for (const [pattern, replacement] of dialectMap) {
    text = text.replace(pattern, replacement);
  }

  // Normalize multiple spaces into single space
  return text.replace(/\s+/g, ' ').trim();
}
