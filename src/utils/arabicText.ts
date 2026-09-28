/**
 * Comprehensive Arabic Text Normalization & PDF Extraction Repair Utility
 * Handles:
 * 1. Unicode Presentation Forms (NFKC normalization)
 * 2. Reversed Arabic words/sentences (common in Arabic PDFs)
 * 3. Detached/spaced-out Arabic characters within words
 * 4. Punctuation and numbering re-orientation
 */

// Common reversed Arabic legal keywords frequently found in corrupted PDF exports
const REVERSED_ARABIC_INDICATORS = [
  'ةداملا', // المادة
  'نوناق',   // قانون
  'رارق',    // قرار
  'نيطسلف',  // فلسطين
  'كلامجلا', // الجمارك
  'ةبيرض',  // ضريبة
  'سيلجم',  // مجلس
  'ءارزولا', // الوزراء
  'موسر',   // رسوم
  'مسك',     // رسم
  'مكاحم',  // محاكم
  'ةفلاخم',  // مخالفة
  'عوضوم',   // موضوع
  'ةيلخادلا',// الداخلية
  'ةيلاملا', // المالية
  'طورش',   // شروط
  'ميكحت',  // تحكيم
  'ماكحأ',   // أحكام
  'شارتعا',  // اعتراض
  'ةيروفلا', // الفورية
  'ةداعإ',   // إعادة
  'دادتعا',  // اعتداد
  'ديدحت',  // تحديد
  'ميظنت',  // تنظيم
  'تارارق',  // قرارات
  'تاملعت',  // تعليمات
];

const NORMAL_ARABIC_INDICATORS = [
  'المادة',
  'قانون',
  'قرار',
  'فلسطين',
  'الجمارك',
  'ضريبة',
  'مجلس',
  'الوزراء',
  'رسوم',
  'محاكم',
  'مخالفة',
  'موضوع',
  'الداخلية',
  'المالية',
  'تحكيم',
  'أحكام',
  'شروط',
];

/**
 * Check if the given Arabic text appears to be reversed (RTL characters rendered LTR).
 */
export function isArabicTextReversed(text: string): boolean {
  if (!text || text.length < 10) return false;

  let reversedHits = 0;
  for (const word of REVERSED_ARABIC_INDICATORS) {
    if (text.includes(word)) {
      reversedHits++;
    }
  }

  let normalHits = 0;
  for (const word of NORMAL_ARABIC_INDICATORS) {
    if (text.includes(word)) {
      normalHits++;
    }
  }

  return reversedHits > 0 && reversedHits >= normalHits;
}

/**
 * Reverses Arabic word character sequences back to natural reading order.
 */
export function reverseArabicWords(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .map((line) => {
      // Reverse individual Arabic character tokens
      let fixedLine = line.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, (match) => {
        return match.split('').reverse().join('');
      });

      // Fix mirrored brackets in reversed text: )1( -> (1)
      fixedLine = fixedLine.replace(/\)(\d+)\(/g, '($1)');
      return fixedLine;
    })
    .join('\n');
}

/**
 * Fixes spaced-out Arabic letters within words:
 * e.g. "ق ا ن و ن   ا ل ج م ا ر ك" -> "قانون الجمارك"
 */
export function fixSpacedArabicLetters(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .map((line) => {
      // First, handle tokens separated by 2+ spaces or tabs
      const tokens = line.split(/\s{2,}|\t+/);
      const fixedTokens = tokens.map((token) => {
        const parts = token.trim().split(/\s+/);
        // If all parts are single Arabic characters, join them into a word
        if (parts.length > 1 && parts.every((p) => p.length === 1 && /^[\u0600-\u06FF]$/.test(p))) {
          return parts.join('');
        }
        return token;
      });

      let res = fixedTokens.join(' ');

      // Also handle inline spaced out sequences: "م ا د ة ( 1 )"
      res = res.replace(/(?:^|\s)((?:[\u0600-\u06FF]\s+){2,}[\u0600-\u06FF])(?=$|\s)/g, (full, seq) => {
        return full.replace(seq, seq.replace(/\s+/g, ''));
      });

      return res;
    })
    .join('\n');
}

/**
 * Universal Arabic text normalizer and repair pipeline:
 * 1. Normalize Unicode NFKC (Presentation Forms-A & B to base Arabic).
 * 2. Remove zero-width spaces and control glyphs.
 * 3. Fix spaced-out characters.
 * 4. Detect and correct reversed Arabic words.
 * 5. Format paragraphs and legal article numbering.
 */
export function normalizeAndFixArabicText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Unicode Normalization NFKC (maps ﹱ ﹲ ﺀ ﺁ ﺎ ﺏ ﺐ ﺕ ﺖ into standard Arabic letters)
  let text = rawText.normalize('NFKC');

  // 2. Strip non-printable and invisible control marks (except newlines, tabs, and spaces)
  text = text.replace(/[\u200B-\u200F\uFEFF\u00A0]/g, ' ');

  // 3. Fix spaced-out Arabic letters
  text = fixSpacedArabicLetters(text);

  // 4. Detect and fix reversed Arabic text
  if (isArabicTextReversed(text)) {
    text = reverseArabicWords(text);
  }

  // 5. Structure legal articles cleanly:
  // Ensure "المادة (1):" or "المادة 1 -" starts on a clean newline
  text = text.replace(/([^\n])\s*(المادة\s*(\(\d+\)|\d+))/g, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(الفصل\s*(\(\d+\)|\d+|الأول|الثاني|الثالث|الرابع|الخامس))/g, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(الباب\s*(\(\d+\)|\d+|الأول|الثاني|الثالث|الرابع|الخامس))/g, '$1\n\n$2');

  // 6. Clean up excessive whitespace
  text = text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}
