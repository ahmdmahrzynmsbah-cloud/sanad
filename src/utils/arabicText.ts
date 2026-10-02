/**
 * Comprehensive Arabic Text Normalization & PDF Extraction Repair Utility
 * Handles:
 * 1. Unicode Presentation Forms (NFKC normalization)
 * 2. Reversed Arabic words & LTR visual stream reversal (common in PDF exports)
 * 3. Detached/spaced-out Arabic characters within words
 * 4. Punctuation, brackets, and numbering re-orientation
 * 5. Official Palestinian gazette running header/footer cleanup
 */

// Common reversed Arabic legal keywords frequently found in corrupted PDF exports
export const REVERSED_ARABIC_INDICATORS = [
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
  'ةلود',    // دولة
  'سيرم',    // مرسوم
  'سلف',     // فلس
];

export const NORMAL_ARABIC_INDICATORS = [
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
  'دولة',
  'مرسوم',
  'تعليمات',
];

/**
 * Check if the given Arabic text appears to be reversed (RTL characters rendered LTR).
 */
export function isArabicTextReversed(text: string): boolean {
  if (!text || text.length < 5) return false;

  let reversedHits = 0;
  for (const word of REVERSED_ARABIC_INDICATORS) {
    if (text.includes(word)) {
      reversedHits += 2;
    }
  }

  let normalHits = 0;
  for (const word of NORMAL_ARABIC_INDICATORS) {
    if (text.includes(word)) {
      normalHits += 2;
    }
  }

  return reversedHits > 0 && reversedHits > normalHits;
}

/**
 * Reverse a single Arabic word's letters
 */
export function reverseArabicWordLetters(word: string): string {
  if (!word || !/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/.test(word)) {
    return word;
  }
  return word.split('').reverse().join('');
}

/**
 * Reverses Arabic word character sequences and RTL word ordering back to natural reading order.
 * Handles both visual LTR inverted tokens and whole-line inverted sequences while preserving numbers.
 */
export function reverseArabicWords(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Check if this specific line is reversed
      let lineReversedHits = 0;
      for (const w of REVERSED_ARABIC_INDICATORS) {
        if (line.includes(w)) lineReversedHits++;
      }
      let lineNormalHits = 0;
      for (const w of NORMAL_ARABIC_INDICATORS) {
        if (line.includes(w)) lineNormalHits++;
      }

      // If line is clearly normal, do NOT reverse
      if (lineNormalHits > lineReversedHits) {
        return line;
      }

      // Tokenize line preserving Arabic words, numbers, Latin words, spaces, and punctuation
      const tokens =
        line.match(
          /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|\d+|[a-zA-Z]+|[^\s\w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+|\s+/g
        ) || [line];

      // If the line has reversed indicators or text is predominantly reversed
      if (lineReversedHits > 0 || isArabicTextReversed(line)) {
        // Reverse token sequence to restore RTL reading order, flipping brackets
        const reversedTokens = [...tokens].reverse();
        return reversedTokens
          .map((t) => {
            if (/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/.test(t)) {
              return t.split('').reverse().join('');
            }
            if (t === '(') return ')';
            if (t === ')') return '(';
            if (t === '[') return ']';
            if (t === ']') return '[';
            if (t === '{') return '}';
            if (t === '}') return '{';
            if (t === '«') return '»';
            if (t === '»') return '«';
            return t;
          })
          .join('');
      }

      return line;
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
 * Clean Palestinian gazette headers, footers, website URLs and reference bar noise
 */
export function cleanGazetteNoise(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .filter((line) => {
      const l = line.trim();
      // Drop lines that are purely website URLs or official gazette metadata headers
      if (/^https?:\/\//i.test(l)) return false;
      if (/^mjr\.(lab|ogb|pna|gov)\.ps/i.test(l)) return false;
      if (/^www\.[a-z0-9\-_.]+\.ps/i.test(l)) return false;
      if (/^الرقم المرجعي\s*:\s*[\d\s\-_/]+$/i.test(l)) return false;
      if (/^صفحة\s*\d+\s*من\s*\d+$/i.test(l)) return false;
      if (/^\d+\s*ديوان الفتوى والتشريع\s*[\d\s\-_/]+$/i.test(l)) return false;
      if (/^ديوان الفتوى والتشريع\s*[\d\s\-_/]+$/i.test(l)) return false;
      return true;
    })
    .join('\n');
}

/**
 * Universal Arabic text normalizer and repair pipeline:
 * 1. Normalize Unicode NFKC (Presentation Forms-A & B to base Arabic).
 * 2. Remove zero-width spaces, directional marks, and control glyphs.
 * 3. Fix spaced-out characters.
 * 4. Detect and correct reversed Arabic words safely without corrupting normal text.
 * 5. Format paragraphs and legal article numbering.
 */
export function normalizeAndFixArabicText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Unicode Normalization NFKC (maps ﹱ ﹲ ﺀ ﺁ ﺎ ﺏ ﺐ ﺕ ﺖ into standard Arabic letters)
  let text = rawText.normalize('NFKC');

  // 2. Strip non-printable and invisible control marks (except newlines, tabs, and spaces)
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]/g, ' ');

  // 3. Fix spaced-out Arabic letters
  text = fixSpacedArabicLetters(text);

  // 4. Detect and fix reversed Arabic text
  if (isArabicTextReversed(text)) {
    text = reverseArabicWords(text);
  }

  // 5. Structure legal articles cleanly:
  // Ensure "المادة (1):" or "المادة 1 -" starts on a clean newline
  text = text.replace(/([^\n])\s*(المادة\s*(\(\d+\)|\d+))/g, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(الفصل\s*(\(\d+\)|\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر))/g, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(الباب\s*(\(\d+\)|\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر))/g, '$1\n\n$2');

  // 6. Clean gazette URL noise
  text = cleanGazetteNoise(text);

  // 7. Clean up excessive whitespace
  text = text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Converts Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) and Persian numerals (۰۱۲۳۴۵۶۷۸۹)
 * to standard English/Latin numerals (0123456789) e.g. 22
 */
export function convertArabicNumeralsToEnglish(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48));
}
