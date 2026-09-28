/**
 * Folds Arabic spelling variants so a search for "احمد" also matches
 * "أحمد", "يحيي" matches "يحيى", "فاطمه" matches "فاطمة", etc.
 * Also strips diacritics / tatweel and lower-cases Latin text.
 */
export function normalizeArabic(value: string): string {
  return value
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
