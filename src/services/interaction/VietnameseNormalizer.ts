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

  // Ensure consistent NFC unicode form first
  let text = input.trim().normalize('NFC').toLowerCase();

  // 1. Remove basic punctuation marks
  text = text.replace(/[?,!.:;"'…()]/g, ' ');

  // 2. STT Phonetic fixes for Camera
  text = text
    .replace(/m[ơở]\s+c[ờa]\s+me\s+ra/gi, 'mở camera')
    .replace(/mo\s+camera/gi, 'mở camera')
    .replace(/mở\s+cam/gi, 'mở camera');

  // 3. Word-level dialect replacements and filler word stripping
  const words = text.split(/\s+/).filter(Boolean);
  const normalizedWords = words.map((w) => {
    if (w === 'ni') return 'này';
    if (w === 'mô') return 'đâu';
    if (w === 'răng') return 'sao';
    if (w === 'rứa') return 'vậy';
    if (w === 'tui') return 'tôi';
    return w;
  });

  const FILLERS = new Set(['dạ', 'ơi', 'ạ', 'nhé', 'nha', 'hỉ', 'nè', 'nghen']);
  const filteredWords = normalizedWords.filter((w) => !FILLERS.has(w));

  text = filteredWords.join(' ');

  // Clean conversational prefixes: "cho chú/bác/tôi...", "giúp chú/bác/tôi..."
  text = text
    .replace(/^cho\s+(chú|bác|cô|ông|bà|tôi)\s+/i, '')
    .replace(/^giúp\s+(chú|bác|cô|ông|bà|tôi)\s+/i, '')
    .replace(/\s+cho\s+(chú|bác|cô|ông|bà|tôi)$/i, '')
    .replace(/\s+giúp\s+(chú|bác|cô|ông|bà|tôi)$/i, '');

  return text.trim();
}
