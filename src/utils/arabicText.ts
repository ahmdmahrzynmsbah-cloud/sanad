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
 * Clean Palestinian gazette headers, footers, website URLs, watermarks, logos, and reference bar noise
 */
export function cleanGazetteNoise(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove multi-token inline gazette running headers (e.g. Palestinian Official Gazette headers)
  cleaned = cleaned.replace(/mjr\.[^\s]+\s+\d+\s+ديوان الجريدة الرسمية\s+[\d\-]+\s+الرقم المرجعي:\s*[\d\/\-]+\s+العدد\s+\d+/gi, '\n');
  cleaned = cleaned.replace(/mjr\.[^\s]+\s+\d+\s+ديوان الجريدة الرسمية\s+[\d\-]+/gi, '\n');
  cleaned = cleaned.replace(/الرقم المرجعي:\s*[\d\/\-]+\s+العدد\s+\d+/gi, '\n');
  cleaned = cleaned.replace(/mjr\.[a-z0-9\-_.]+\.ps[^\s]*/gi, '');
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/www\.[a-z0-9\-_.]+\.ps[^\s]*/gi, '');

  // 2. Remove watermark and logo annotations
  cleaned = cleaned.replace(/\[\s*(علامة مائية|شعار|لوجو|ختم رسمي|ترويسة)[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/(?:^|\n)\s*(علامة مائية|شعار دولة فلسطين|شعار السلطة الوطنية|ختم رسمي)\s*(?=\n|$)/gi, '\n');

  // 3. Remove line-based gazette metadata
  return cleaned
    .split('\n')
    .filter((line) => {
      const l = line.trim();
      if (!l) return false;
      if (/^https?:\/\//i.test(l)) return false;
      if (/^mjr\.(lab|ogb|pna|gov)\.ps/i.test(l)) return false;
      if (/^www\.[a-z0-9\-_.]+\.ps/i.test(l)) return false;
      if (/^الرقم المرجعي\s*:\s*[\d\s\-_/]+$/i.test(l)) return false;
      if (/^صفحة\s*\d+\s*من\s*\d+$/i.test(l)) return false;
      if (/^\d+\s*ديوان (الجريدة الرسمية|الفتوى والتشريع)\s*[\d\s\-_/]*$/i.test(l)) return false;
      if (/^ديوان (الجريدة الرسمية|الفتوى والتشريع)\s*[\d\s\-_/]*$/i.test(l)) return false;
      if (/^الوقائع الفلسطينية\s+العدد\s+\d+[\d\s\-_/]*$/i.test(l)) return false;
      return true;
    })
    .join('\n');
}

/**
 * Detects whether extracted text is garbled/mojibake (e.g. Win1256/custom font encoding artifact)
 * e.g. "hō°ûE hcG ájOôa á«µ [] e hcG ácGô°T..."
 */
export function isMojibakeText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const sample = text.slice(0, 5000);
  if (sample.length < 15) return false;

  // 1. Specific AXT / PDF corrupted font signatures (from Al-Rassam, PageMaker, QuarkXPress, Palestinian gazettes)
  const axtSignatures = sample.match(/(?:TMjQ|Qòa|hcG|bEòY|ÙYG|Yhòa|SE'G|Hhõd|gójö|gój|øjôa|eC|JQÒ|acò|Aسنتد|Aسنذ|ág|°û|¿É|âE|á«|ác|ôa|aà|ºû|øj|ÉA|ªG|âS|âC|øe|üe|TMe|TMj|Qò|Yhò|bEò|SE'|bE|Yh|Oôa|ájO|fEcG)/g);
  if (axtSignatures && axtSignatures.length >= 2) {
    return true;
  }

  // 2. Extended Latin accented / CP1256 glyph matches
  const mojibakeCharsMatch = sample.match(/[áâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ°µ§©«»±²³´¶·¸¹º¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßπΩ∑√∫¢]/g);
  const mojibakeCount = mojibakeCharsMatch ? mojibakeCharsMatch.length : 0;
  if (mojibakeCount >= 4) {
    return true;
  }

  // 3. Ratio of Latin letters in supposedly Arabic text:
  const nonSpace = sample.replace(/\s+/g, '');
  const arabicMatch = sample.match(/[\u0600-\u06FF]/g);
  const arabicCount = arabicMatch ? arabicMatch.length : 0;
  const latinMatch = sample.match(/[a-zA-Z]/g);
  const latinCount = latinMatch ? latinMatch.length : 0;

  const latinRatio = nonSpace.length > 0 ? latinCount / nonSpace.length : 0;
  const arabicRatio = nonSpace.length > 0 ? arabicCount / nonSpace.length : 0;

  // In an Arabic document, if Latin characters exceed 12% and Arabic is < 65%
  if (latinRatio > 0.12 && arabicRatio < 0.65) {
    return true;
  }

  if (latinCount > 15 && (mojibakeCount >= 1 || (axtSignatures && axtSignatures.length >= 1))) {
    return true;
  }

  if (arabicRatio < 0.35 && (latinCount > 20 || mojibakeCount > 0)) {
    return true;
  }

  return false;
}

/**
 * Converts Windows-1256 / CP1256 Mojibake text into standard Arabic characters
 */
export function repairMojibakeArabic(text: string): string {
  if (!text) return '';

  const cp1256Map: Record<string, string> = {
    'Á': 'ء', 'Â': 'آ', 'Ã': 'أ', 'Ä': 'ؤ', 'Å': 'إ', 'Æ': 'ئ', 'Ç': 'ا', 'È': 'ب',
    'É': 'ة', 'Ê': 'ت', 'Ë': 'ث', 'Ì': 'ج', 'Í': 'ح', 'Î': 'خ', 'Ï': 'د', 'Ð': 'ذ',
    'Ñ': 'ر', 'Ò': 'ز', 'Ó': 'س', 'Ô': 'ش', 'Õ': 'ص', 'Ö': 'ض', '×': 'ط', 'Ø': 'ظ',
    'Ù': 'ع', 'Ú': 'غ', 'à': 'ـ', 'á': 'ف', 'â': 'ق', 'ã': 'ك', 'ä': 'ل', 'å': 'م',
    'æ': 'ن', 'ç': 'ه', 'è': 'و', 'é': 'ى', 'ê': 'ي', 'ë': 'ً', 'ì': 'ٌ', 'í': 'ٍ',
    'î': 'َ', 'ï': 'ُ', 'ð': 'ِ', 'ñ': 'ّ', 'ò': 'ْ',
    '°': 'ذ', 'µ': 'ص', '«': 'ث', '»': 'ف', '¿': 'م', '§': 'ا', '©': 'ة', '¨': 'ب',
    'hcG': 'ال', 'ácô°T': 'شركة', 'ácGô°T': 'شركات', 'ájOôa': 'فردية', '¿ÉaàFG': 'ائتمان'
  };

  let repaired = text;
  for (const [key, val] of Object.entries(cp1256Map)) {
    if (key.length > 1) {
      repaired = repaired.replaceAll(key, val);
    }
  }

  let out = '';
  for (const char of repaired) {
    if (cp1256Map[char]) {
      out += cp1256Map[char];
    } else {
      out += char;
    }
  }

  return out;
}

/**
 * Universal Arabic text normalizer and repair pipeline:
 * 1. Normalize Unicode NFKC (Presentation Forms-A & B to base Arabic).
 * 2. Remove zero-width spaces, directional marks, and control glyphs.
 * 3. Fix spaced-out characters and tatweel elongation.
 * 4. Detect and correct reversed Arabic words and article numbering.
 * 5. Clean gazette watermarks, logos, and headers.
 * 6. Format paragraphs and legal article numbering cleanly.
 */
export function normalizeAndFixArabicText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // Check if text is Mojibake and repair it
  if (isMojibakeText(text)) {
    text = repairMojibakeArabic(text);
  }

  // 1. Unicode Normalization NFKC (maps ﹱ ﹲ ﺀ ﺁ ﺎ ﺏ ﺐ ﺕ ﺖ into standard Arabic letters)
  text = text.normalize('NFKC');

  // 2. Strip non-printable and invisible control marks (except newlines, tabs, and spaces)
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]/g, ' ');

  // 3. Remove excessive Tatweel (ـ) that distorts words (e.g. رئيـــــــــس -> رئيس)
  text = text.replace(/ـ{2,}/g, '');

  // 4. Clean gazette URL, watermark, and running header noise early
  text = cleanGazetteNoise(text);

  // 4.1 Fix broken PDF ligatures & common OCR distortions
  const typoMap: [string, string][] = [
    ['األموال', 'الأموال'], ['اإلرهاب', 'الإرهاب'], ['األنشطة', 'الأنشطة'], ['األعمال', 'الأعمال'],
    ['األشخاص', 'الأشخاص'], ['األفعال', 'الأفعال'], ['األحزاب', 'الأحزاب'], ['األساس', 'الأساس'],
    ['األمم', 'الأمم'], ['األساليب', 'الأساليب'], ['األطراف', 'الأطراف'], ['األدوات', 'الأدوات'],
    ['األصول', 'الأصول'], ['األخرى', 'الأخرى'], ['االشتراك', 'الاشتراك'], ['االطالع', 'الاطلاع'],
    ['االلتزام', 'الالتزام'], ['االستئناف', 'الاستئناف'], ['اإلجراءات', 'الإجراءات'],
    ['اإلشراف', 'الإشراف'], ['اإلدارة', 'الإدارة'], ['اإلقراض', 'الإقراض'], ['اإلخطار', 'الإخطار'],
    ['اإليداع', 'الإيداع'], ['اإلذن', 'الإذن'], ['متحصالت', 'متحصلات'], ['الرتكاب', 'لارتكاب'],
    ['خالف', 'خلاف'], ['وتعديالته', 'وتعديلاته'], ['ملنظمة', 'لمنظمة'], ['فلسطني', 'فلسطين'],
    ['وكالء', 'وكلاء'], ['عمالء', 'عملاء'], ['عمالئهم', 'عملائهم'], ['عمالئها', 'عملائها'],
    ['خالل', 'خلال'], ['سجالت', 'سجلات'], ['اآلتية', 'الآتية'], ['اآلخرين', 'الآخرين'],
    ['اآلخر', 'الآخر'], ['األحجار', 'الأحجار'], ['االحتفاظ', 'الاحتفاظ'],
    ['نيابة ً', 'نيابةً'], ['مخول ٌ', 'مخولٌ'], ['وفقًا', 'وفقاً'], ['الحقًا', 'لاحقاً'],
    ['سابقًا', 'سابقاً'], ['تلقائيًا', 'تلقائياً'], ['فوريًا', 'فورياً'], ['استنادًا', 'استناداً'],
    ['بناء ً', 'بناءً'], ['أيًا', 'أياً'], ['عامًا', 'عاماً'], ['منصبًا', 'منصباً'],
    ['بارزًا', 'بارزاً'], ['عمدًا', 'عمداً'], ['ملكًا', 'ملكاً'], ['دائمًا', 'دائماً'],
    ['مباشرة ً', 'مباشرةً'], ['سرًا', 'سراً'], ['حكمًا', 'حكماً'], ['قانونًا', 'قانوناً'],
    ['مسبقًا', 'مسبقاً'], ['دوليًا', 'دولياً'], ['محليًا', 'محلياً'], ['ماديًا', 'مادياً'],
    ['جزئيًا', 'جزئياً'], ['كليًا', 'كلياً'], ['فعليًا', 'فعلياً'], ['رسميًا', 'رسمياً']
  ];
  for (const [k, v] of typoMap) {
    text = text.split(k).join(v);
  }

  // 4.2 Fix reversed numbering and dot placement like ". أ " or ". 1 "
  text = text.replace(/\.\s*([أ-ي])\s+/g, '$1. ');
  text = text.replace(/(\d+)\s*\.\s+/g, '$1. ');

  // 5. Fix reversed article titles and patterns from PDF.js RTL inverted streams:
  // e.g. ")1 مادة (" or ") 10 مادة (" -> "المادة (1): "
  text = text.replace(/\)\s*(\d+)\s+مادة\s*\(/g, '\n\nالمادة ($1): ');
  text = text.replace(/\(\s*(\d+)\s+مادة\s*\)/g, '\n\nالمادة ($1): ');
  text = text.replace(/مادة\s*\(\s*(\d+)\s*\)/g, '\n\nالمادة ($1): ');

  // Fix reversed decree header pattern: e.g. "م 2022 ) لسنة 39 قرار بقانون رقم (" -> "قرار بقانون رقم (39) لسنة 2022م"
  text = text.replace(/\s*م\s*(\d{4})\s*\)\s*لسنة\s*(\d+)\s*قرار\s*بقانون\s*رقم\s*\(/gi, 'قرار بقانون رقم ($2) لسنة $1م');
  text = text.replace(/\)\s*لسنة\s*(\d+)\s*قرار\s*بقانون\s*رقم\s*\(/gi, 'قرار بقانون رقم ($1)');
  text = text.replace(/\)\s*لسنة\s*(\d+)\s*قانون\s*رقم\s*\(/gi, 'قانون رقم ($1)');
  text = text.replace(/\)\s*لسنة\s*(\d+)\s*مرسوم\s*رقم\s*\(/gi, 'مرسوم رقم ($1)');

  // Fix reversed parentheses around standalone numbers: e.g. ") 10 (" -> "(10)"
  text = text.replace(/\)\s*(\d+)\s*\(/g, '($1)');

  // 6. Fix spaced-out Arabic letters
  text = fixSpacedArabicLetters(text);

  // 7. Detect and fix reversed Arabic text
  if (isArabicTextReversed(text)) {
    text = reverseArabicWords(text);
  }

  // 8. Structure legal articles and chapters cleanly
  text = text.replace(/([^\n])\s*(المادة\s*(\(\d+\)|\d+):?)/g, '$1\n\n$2');
  text = text.replace(/([^\n])\s*(الفصل\s*(\(\d+\)|\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)[^\n]*)/g, '$1\n\n$2\n');
  text = text.replace(/([^\n])\s*(الباب\s*(\(\d+\)|\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)[^\n]*)/g, '$1\n\n$2\n');

  // 9. Clean up excessive whitespace and duplicate newlines
  text = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
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
