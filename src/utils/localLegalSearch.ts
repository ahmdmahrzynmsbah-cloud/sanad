import type { Law, CitationSource } from '../types';

export interface LegalChunk {
  lawId: string;
  lawTitle: string;
  category: string;
  sectionHeader: string;
  text: string;
  sourceFileName?: string;
  articleNumber?: string;
  score?: number;
}

/**
 * Helper to convert Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII digits (0-9)
 */
export function convertArabicIndicDigits(text: string): string {
  if (!text) return '';
  const indicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = text;
  for (let i = 0; i < 10; i++) {
    res = res.split(indicDigits[i]).join(String(i));
  }
  return res;
}

/**
 * Helper to normalize Arabic text for deep search matching and comparison
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  // Normalize presentation forms (NFKD)
  let str = text.normalize('NFKD');
  str = convertArabicIndicDigits(str);
  return str
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // remove diacritics / tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0621-\u064A0-9a-zA-Z\s]/g, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Convert textual Arabic numbers and ordinals (e.g. "التاسعة عشرة", "الخامسة", "العشرون") into numeric digits
 */
export function parseArabicWordNumber(text: string): number | null {
  if (!text) return null;
  const norm = normalizeArabic(text);

  const directMap: Record<string, number> = {
    'واحد': 1, 'واحده': 1, 'اول': 1, 'اولي': 1, 'اولى': 1, 'الاول': 1, 'الاولى': 1, 'الاولي': 1,
    'اثنين': 2, 'اثنان': 2, 'ثاني': 2, 'ثانيه': 2, 'الثاني': 2, 'الثانيه': 2,
    'ثلاثه': 3, 'ثلاث': 3, 'ثالث': 3, 'ثالثه': 3, 'الثالث': 3, 'الثالثه': 3,
    'اربعه': 4, 'اربع': 4, 'رابع': 4, 'رابعه': 4, 'الرابع': 4, 'الرابعه': 4,
    'خمسه': 5, 'خمس': 5, 'خامس': 5, 'خامسه': 5, 'الخامس': 5, 'الخامسه': 5,
    'سته': 6, 'ست': 6, 'سادس': 6, 'سادسه': 6, 'السادس': 6, 'السادسه': 6,
    'سبعه': 7, 'سبع': 7, 'سابع': 7, 'سابعه': 7, 'السابع': 7, 'السابعه': 7,
    'ثمانيه': 8, 'ثمان': 8, 'ثامن': 8, 'ثامنه': 8, 'الثامن': 8, 'الثامنه': 8,
    'تسعه': 9, 'تسع': 9, 'تاسع': 9, 'تاسعه': 9, 'التاسع': 9, 'التاسعه': 9,
    'عشره': 10, 'عشر': 10, 'عاشر': 10, 'عاشره': 10, 'العاشر': 10, 'العاشره': 10,
    'حادي عشر': 11, 'حاديه عشر': 11, 'حاديه عشره': 11, 'الحادي عشر': 11, 'الحاديه عشر': 11, 'الحاديه عشره': 11, 'احد عشر': 11,
    'ثاني عشر': 12, 'ثانيه عشر': 12, 'ثانيه عشره': 12, 'الثاني عشر': 12, 'الثانيه عشر': 12, 'الثانيه عشره': 12, 'اثنا عشر': 12, 'اثني عشر': 12,
    'ثالث عشر': 13, 'ثالثه عشر': 13, 'ثالثه عشره': 13, 'الثالث عشر': 13, 'الثالثه عشر': 13, 'الثالثه عشره': 13, 'ثلاثه عشر': 13,
    'رابع عشر': 14, 'رابعه عشر': 14, 'رابعه عشره': 14, 'الرابع عشر': 14, 'الرابعه عشر': 14, 'الرابعه عشره': 14, 'اربعه عشر': 14,
    'خامس عشر': 15, 'خامسه عشر': 15, 'خامسه عشره': 15, 'الخامس عشر': 15, 'الخامسه عشر': 15, 'الخامسه عشره': 15, 'خمسه عشر': 15,
    'سادس عشر': 16, 'سادسه عشر': 16, 'سادسه عشره': 16, 'السادس عشر': 16, 'السادسه عشر': 16, 'السادسه عشره': 16, 'سته عشر': 16,
    'سابع عشر': 17, 'سابعه عشر': 17, 'سابعه عشره': 17, 'السابع عشر': 17, 'السابعه عشر': 17, 'السابعه عشره': 17, 'سبعه عشر': 17,
    'ثامن عشر': 18, 'ثامنه عشر': 18, 'ثامنه عشره': 18, 'الثامن عشر': 18, 'الثامنه عشر': 18, 'الثامنه عشره': 18, 'ثمانيه عشر': 18,
    'تاسع عشر': 19, 'تاسعه عشر': 19, 'تاسعه عشره': 19, 'التاسع عشر': 19, 'التاسعه عشر': 19, 'التاسعه عشره': 19, 'تسعه عشر': 19,
    'عشرون': 20, 'عشرين': 20, 'العشرون': 20, 'العشرين': 20,
    'ثلاثون': 30, 'ثلاثين': 30, 'الثلاثون': 30, 'الثلاثين': 30,
    'اربعون': 40, 'اربعين': 40, 'الاربعون': 40, 'الاربعين': 40,
    'خمسون': 50, 'خمسين': 50, 'الخمسون': 50, 'الخمسين': 50,
    'ستون': 60, 'ستين': 60, 'الستون': 60, 'الستين': 60,
    'سبعون': 70, 'سبعين': 70, 'السبعون': 70, 'السبعين': 70,
    'ثمانون': 80, 'ثمانين': 80, 'الثمانون': 80, 'الثمانين': 80,
    'تسعون': 90, 'تسعين': 90, 'التسعون': 90, 'التسعين': 90,
    'مئه': 100, 'مائه': 100, 'المئه': 100, 'المائه': 100,
  };

  if (directMap[norm] !== undefined) {
    return directMap[norm];
  }

  const compoundMatch = norm.match(/^(?:ال)?(حادي|حاديه|واحد|واحده|ثاني|ثانيه|اثنين|ثالث|ثالثه|ثلاث|ثلاثه|رابع|رابعه|اربع|اربعه|خامس|خامسه|خمس|خمسه|سادس|سادسه|ست|سته|سابع|سابعه|سبع|سبعه|ثامن|ثامنه|ثمان|ثمانيه|تاسع|تاسعه|تسع|تسعه)\s+و\s*(?:ال)?(عشرون|عشرين|ثلاثون|ثلاثين|اربعون|اربعين|خمسون|خمسين|ستون|ستين|سبعون|سبعين|ثمانون|ثمانين|تسعون|تسعين)$/);
  if (compoundMatch) {
    const unitsMap: Record<string, number> = {
      'حادي': 1, 'حاديه': 1, 'واحد': 1, 'واحده': 1,
      'ثاني': 2, 'ثانيه': 2, 'اثنين': 2,
      'ثالث': 3, 'ثالثه': 3, 'ثلاث': 3, 'ثلاثه': 3,
      'رابع': 4, 'رابعه': 4, 'اربع': 4, 'اربعه': 4,
      'خامس': 5, 'خامسه': 5, 'خمس': 5, 'خمسه': 5,
      'سادس': 6, 'سادسه': 6, 'ست': 6, 'سته': 6,
      'سابع': 7, 'سابعه': 7, 'سبع': 7, 'سبعه': 7,
      'ثامن': 8, 'ثامنه': 8, 'ثمان': 8, 'ثمانيه': 8,
      'تاسع': 9, 'تاسعه': 9, 'تسع': 9, 'تسعه': 9,
    };
    const tensMap: Record<string, number> = {
      'عشرون': 20, 'عشرين': 20,
      'ثلاثون': 30, 'ثلاثين': 30,
      'اربعون': 40, 'اربعين': 40,
      'خمسون': 50, 'خمسين': 50,
      'ستون': 60, 'ستين': 60,
      'سبعون': 70, 'سبعين': 70,
      'ثمانون': 80, 'ثمانين': 80,
      'تسعون': 90, 'تسعين': 90,
    };
    const u = unitsMap[compoundMatch[1]] || 0;
    const t = tensMap[compoundMatch[2]] || 0;
    if (u > 0 && t > 0) return u + t;
  }

  return null;
}

/**
 * Extract requested article or clause number with maximum precision from user queries
 */
export function extractRequestedArticleNumber(query: string): string | null {
  if (!query) return null;
  const converted = convertArabicIndicDigits(query);

  const digitMatch = converted.match(/(?:المادة|مادة|الماده|البند|بند|الفقرة|فقرة|الفصل|فصل|رقم)\s*(?:رقم|عدد)?\s*[\(\[\"\'\s]*(\d+)[\)\]\"\'\s]*/i);
  if (digitMatch && digitMatch[1]) {
    return digitMatch[1];
  }

  const askKeywordsMatch = converted.match(/(?:قولي|هات|عايز|اريد|أريد|نص|شرح|وضح|اعطني|أعطني|استخرج)\s+.*?(?:مادة|المادة|بند|البند|الماده)?\s*(?:رقم)?\s*[\(\[\"\'\s]*(\d+)[\)\]\"\'\s]*/i);
  if (askKeywordsMatch && askKeywordsMatch[1]) {
    return askKeywordsMatch[1];
  }

  const wordArticleMatch = converted.match(/(?:المادة|مادة|الماده|البند|بند|الفقرة|فقرة|الفصل|فصل)\s*(?:رقم)?\s*([ا-ي\s]{2,35})/i);
  if (wordArticleMatch && wordArticleMatch[1]) {
    const num = parseArabicWordNumber(wordArticleMatch[1].trim());
    if (num !== null) {
      return String(num);
    }
  }

  return null;
}

/**
 * Check if a query is truly about laws, taxes, customs, or uploaded files
 */
export function isLegalTaxCustomsQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.trim().toLowerCase();
  const cleaned = q.replace(/[!؟?.,،:\-\s]+/g, ' ');

  // 1. Explicit conversational greetings, personal inquiries, and identity questions
  if (
    /^(عامل ايه|عامل اي|عامل إيه|عامل إي|ازيك|إزيك|كيفك|كيف حالك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|صباح الخير|مساء الخير|سلام|السلام عليكم|سلام عليكم|مرحبا|مرحباً|أهلا|اهلا|هاي|hello|hi)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 2. Identity & bot nature questions
  if (
    /(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي|من انت|مين انت|من أنت|ما اسمك|شو اسمك|عرفني بنفسك|عرف عن نفسك|ما وظيفتك|شو وظيفتك|مين طورك|مين برمجك)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 3. Clear non-legal general knowledge topics (religion, personalities, sports, science, culture, history, geography)
  if (
    /(محمد صلاح|ميسي|رونالدو|كرة القدم|الرياضة|الدين الإسلامي|دين الاسلام|الإسلام|الاسلام|القرآن|الحديث|الصلاة|الصيام|الحج|الزكاة|النبي|الرسول|الصحابة|الفيزياء|الكيمياء|الطب|الفلك|الفضاء|الطقس|التاريخ|الجغرافيا|الفلسفة|البرمجة|الرياضيات|معنى كلمة|قصة|نكتة|شعر|طبخ|عاصمة|من هو|من هي|ما هو|ما هي|ماذا تعرف عن)/i.test(
      cleaned
    ) &&
    !/(قانون|قوانين|تشريع|تشريعات|مرسوم|مراسيم|قرار بقانون|قرار|مادة|مواد|الماده|المواد|لائحة|لوائح|نظام|أنظمة|بند|بنود|ملف|ملفات|الملف|الملفات|مستند|مستندات|المستند|وثيقة|وثائق|رفعت|رفعته|المرفوع|المرفوعة|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|رسم جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|سجل تجاري|مقاصة|إعفاء ضريبي|فاتورة ضريبية)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 4. Strict legal & tax keywords
  const legalTermsRegex = /(قانون|قوانين|تشريع|تشريعات|مرسوم|مراسيم|قرار بقانون|قرار|قرارات|مادة|مواد|الماده|المواد|لائحة|لوائح|نظام|أنظمة|بند|بنود|فقرة|فقرات|ملف|ملفات|الملف|الملفات|مستند|مستندات|المستند|المستندات|وثيقة|وثائق|الوثيقة|رفعت|رفعته|المرفوع|المرفوعة|مرفق|مرفقات|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|إعفاء ضريبي|إعفاء|إعفاءات|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|غرامة تأخير|غرامة|غرامات|عقوبة|عقوبات|محكمة الصلح|وزارة المالية|دائرة الجمارك|مكافحة غسل الأموال|فحص ضريبي|تهرب ضريبي|سجل تجاري|فاتورة ضريبية|مقاصة|استيراد|تصدير|معبر|ضريبة أملاك|شريحة ضريبية|شرائح|الخصم من المنبع|رد ضريبي|استيراد سيارات|سيارة|بضاعة|ترخيص)/i;

  if (extractRequestedArticleNumber(query)) {
    return true;
  }

  return legalTermsRegex.test(q);
}

/**
 * Helper to extract law issuance year / date from title or text
 */
function extractLawTiming(title: string, text: string): string {
  const convertedTitle = convertArabicIndicDigits(title || '');
  const convertedText = convertArabicIndicDigits((text || '').substring(0, 500));

  const matchYear = convertedTitle.match(/(?:لسنة|عام)\s*(\d{4})[م|هـ]?/i) || convertedText.match(/(?:لسنة|عام)\s*(\d{4})[م|هـ]?/i);
  if (matchYear && matchYear[1]) {
    return `لسنة ${matchYear[1]}م`;
  }
  const matchPlainYear = convertedTitle.match(/\b(19\d{2}|20\d{2})\b/);
  if (matchPlainYear && matchPlainYear[1]) {
    return `لسنة ${matchPlainYear[1]}م`;
  }
  const matchDate = convertedText.match(/بتاريخ\s*([\d\/\.\-]+)/i);
  if (matchDate && matchDate[1]) {
    return `بتاريخ ${matchDate[1]}`;
  }
  return 'وفقاً لآخر تعديل معتمد ونافذ في دولة فلسطين';
}

/**
 * Splits law text into logical sections / articles for precise matching
 */
export function chunkLawContent(law: Law): LegalChunk[] {
  const text = law.content || '';
  const chunks: LegalChunk[] = [];
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const regex = /(?:^|\n)(?=(?:[-•*]\s*)?(?:المادة|مادة|الماده|البند|بند|الفصل|فصل|الباب|باب|ملحق|الملحق|الفقرة|فقرة|أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً)\s*(?:رقم)?\s*[\(\[]?(?:\d+|[٠-٩]+|[^\n\:\.\-]{1,35})[\)\]\:\.\-]?)/gi;

  const rawSections = normalizedText.split(regex);

  for (const rawSec of rawSections) {
    const trimmed = rawSec.trim();
    if (!trimmed) continue;

    const firstLineEnd = trimmed.indexOf('\n');
    let header = firstLineEnd !== -1 ? trimmed.substring(0, firstLineEnd).trim() : trimmed.substring(0, 80).trim();
    if (header.length > 90) header = header.substring(0, 90) + '...';

    const extractedNum = extractRequestedArticleNumber(header) || extractRequestedArticleNumber(trimmed.substring(0, 200));

    if (trimmed.length > 3500) {
      const paragraphs = trimmed.split(/\n\s*\n/);
      let currentSub = '';
      let partIdx = 1;
      for (const p of paragraphs) {
        if ((currentSub + '\n\n' + p).length > 2500) {
          if (currentSub.trim()) {
            chunks.push({
              lawId: law.id,
              lawTitle: law.title,
              category: law.category || 'جمارك',
              sectionHeader: `${header} (جزء ${partIdx})`,
              text: currentSub.trim(),
              sourceFileName: law.sourceFileName,
              articleNumber: extractedNum || undefined,
            });
            partIdx++;
          }
          currentSub = p;
        } else {
          currentSub += (currentSub ? '\n\n' : '') + p;
        }
      }
      if (currentSub.trim()) {
        chunks.push({
          lawId: law.id,
          lawTitle: law.title,
          category: law.category || 'جمارك',
          sectionHeader: `${header} (جزء ${partIdx})`,
          text: currentSub.trim(),
          sourceFileName: law.sourceFileName,
          articleNumber: extractedNum || undefined,
        });
      }
    } else {
      chunks.push({
        lawId: law.id,
        lawTitle: law.title,
        category: law.category || 'جمارك',
        sectionHeader: header,
        text: trimmed,
        sourceFileName: law.sourceFileName,
        articleNumber: extractedNum || undefined,
      });
    }
  }

  if (chunks.length === 0 && normalizedText.trim()) {
    chunks.push({
      lawId: law.id,
      lawTitle: law.title,
      category: law.category || 'جمارك',
      sectionHeader: 'كامل النص',
      text: normalizedText.trim(),
      sourceFileName: law.sourceFileName,
    });
  }

  return chunks;
}

/**
 * Helper to filter out placeholder entries lacking substantive content
 */
export function isSubstantiveLaw(law: Law): boolean {
  if (!law || !law.content) return false;
  const trimmed = law.content.trim();
  if (trimmed.length < 60) return false;
  if (trimmed.includes('تم إرفاق المستند بنجاح بحجم') && trimmed.includes('يمكنك كتابة وتعديل نصوص المواد')) {
    return false;
  }
  return true;
}

/**
 * Search and build precise citation sources for a given legal query
 */
export function findCitationsForQuery(query: string, laws: Law[]): CitationSource[] {
  if (!laws || laws.length === 0 || !query) return [];

  const validLaws = laws.filter(isSubstantiveLaw);
  const activeLaws = validLaws.length > 0 ? validLaws : laws;

  const requestedArticleNumber = extractRequestedArticleNumber(query);
  const normQuery = normalizeArabic(query);
  const genericStopwords = new Set([
    'قانون', 'مرسوم', 'سنة', 'قرار', 'مادة', 'نظام', 'بند', 'ملف', 'فلسطين', 'دولة', 'رقم', 'لسنة', 'احكام', 'أحكام', 'بشأن'
  ]);
  const keywords = normQuery
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !genericStopwords.has(w));

  const allChunks: LegalChunk[] = [];
  let exactArticleMatches: LegalChunk[] = [];

  for (const law of activeLaws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const normTitle = normalizeArabic(chunk.lawTitle);
      const normCategory = normalizeArabic(chunk.category);
      const normHeader = normalizeArabic(chunk.sectionHeader);
      const normText = normalizeArabic(chunk.text);
      const normFileName = normalizeArabic(chunk.sourceFileName || '');

      let score = 0;

      if (requestedArticleNumber) {
        const isHeaderMatch = chunk.articleNumber === requestedArticleNumber ||
          new RegExp(`(?:المادة|مادة|الماده|البند|بند|الفقرة|فقرة)\\s*(?:رقم)?\\s*[\\(\\[]?${requestedArticleNumber}[\\)\\]\\:\\.\\s]`, 'i').test(chunk.sectionHeader);

        const isTextMatch = new RegExp(`(?:المادة|مادة|الماده|البند|بند|الفقرة|فقرة)\\s*(?:رقم)?\\s*[\\(\\[]?${requestedArticleNumber}[\\)\\]\\:\\.\\s]`, 'i').test(chunk.text.substring(0, 300));

        if (isHeaderMatch) {
          score += 80;
          exactArticleMatches.push(chunk);
        } else if (isTextMatch) {
          score += 50;
          exactArticleMatches.push(chunk);
        }
      }

      if (normFileName && keywords.some((w) => w.length >= 3 && normFileName.includes(w))) {
        score += 25;
      }

      if (keywords.some((w) => w.length >= 3 && normTitle.includes(w))) {
        score += 15;
      }

      for (const word of keywords) {
        if (word.length < 2) continue;
        if (normHeader.includes(word)) score += 12;
        if (normTitle.includes(word)) score += 8;
        if (normCategory.includes(word)) score += 5;
        if (normText.includes(word)) score += 4;
      }

      chunk.score = score;
      if (score >= 5) allChunks.push(chunk);
    }
  }

  const sorted = allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const combined: LegalChunk[] = [];
  const seenKeys = new Set<string>();

  for (const m of exactArticleMatches) {
    const k = `${m.lawTitle}_${m.sectionHeader}`;
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      combined.push(m);
    }
  }

  for (const sc of sorted) {
    const k = `${sc.lawTitle}_${sc.sectionHeader}`;
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      combined.push(sc);
    }
    if (combined.length >= 3) break;
  }

  return combined.map((c, idx) => ({
    id: `cit-${idx + 1}-${c.lawId}`,
    lawId: c.lawId,
    lawTitle: c.lawTitle,
    articleNumber: c.articleNumber || extractRequestedArticleNumber(c.sectionHeader) || undefined,
    sectionHeader: c.sectionHeader,
    sourceFileName: c.sourceFileName,
    category: c.category,
    originalText: c.text,
    snippet: c.text.length > 300 ? c.text.substring(0, 290).trim() + '...' : c.text,
    matchScore: c.score,
  }));
}

/**
 * Parses response text to extract any law / article citations if not already provided
 */
export function parseCitationsFromResponseText(responseText: string, laws: Law[]): CitationSource[] {
  if (!responseText || typeof responseText !== 'string' || !laws || laws.length === 0) return [];

  const found: CitationSource[] = [];
  const seen = new Set<string>();

  // Look for cited laws by title or category
  for (const law of laws) {
    const normLawTitle = normalizeArabic(law.title);
    const normResponse = normalizeArabic(responseText);

    if (normResponse.includes(normLawTitle) || (law.sourceFileName && normResponse.includes(normalizeArabic(law.sourceFileName)))) {
      const chunks = chunkLawContent(law);
      const articleMatch = extractRequestedArticleNumber(responseText);

      let matchedChunk = chunks[0];
      if (articleMatch) {
        const foundChunk = chunks.find((c) => c.articleNumber === articleMatch || c.sectionHeader.includes(articleMatch));
        if (foundChunk) matchedChunk = foundChunk;
      }

      if (matchedChunk) {
        const key = `${matchedChunk.lawTitle}_${matchedChunk.sectionHeader}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push({
            id: `cit-parsed-${found.length + 1}`,
            lawId: law.id,
            lawTitle: law.title,
            articleNumber: matchedChunk.articleNumber || articleMatch || undefined,
            sectionHeader: matchedChunk.sectionHeader,
            sourceFileName: law.sourceFileName,
            category: law.category,
            originalText: matchedChunk.text,
            snippet: matchedChunk.text.length > 300 ? matchedChunk.text.substring(0, 290).trim() + '...' : matchedChunk.text,
          });
        }
      }
    }
  }

  return found;
}
export function generateClientKnowledgeFallback(query: string, laws: Law[]): string {
  const trimmed = query.trim().toLowerCase();
  const cleaned = trimmed.replace(/[!؟?.,،:\-\s]+/g, ' ');

  // 1. Casual Greetings & Check-ins ("عامل اي", "عامل ايه", "ازيك", etc.)
  if (
    /^(عامل ايه|عامل اي|عامل إيه|عامل إي|ازيك|إزيك|كيفك|كيف حالك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|كيفك اليوم)/i.test(
      cleaned
    )
  ) {
    return `بصفتي شخصيتك الافتراضية ومساعدك الذكي «سَنَد»، أنا بأفضل حال وفي أتم الجاهزية والنشاط لمساعدتك! شكراً لسؤالك اللطيف.\n\nتفضل بطرح أي سؤال أو موضوع تريد الحديث عنه، وسأجيبك فوراً بكل رحابة وسرور.`;
  }

  if (
    /^(سلام|السلام عليكم|سلام عليكم|مرحبا|مرحباً|أهلا|اهلا|صباح الخير|مساء الخير|هاي|hello|hi)\b/i.test(cleaned)
  ) {
    return `وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك. أنا «سَنَد»، شخصيتك الافتراضية ومساعدك الرقمي الذكي، كيف أستطيع خدمتك اليوم؟`;
  }

  if (/^(شكرا|شكراً|تسلم|مشكور|الله يبارك فيك|يعطيك العافية|يسلمو|بارك الله فيك)/i.test(cleaned)) {
    return `العفو على الرحب والسعة دائماً! بصفتي مساعدك الافتراضي، يسعدني دائماً تقديم العون في أي وقت.`;
  }

  // 2. Identity & "Are you human?" questions (Clear Virtual Persona)
  if (
    /(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي)/i.test(
      cleaned
    )
  ) {
    return `لا، أنا لست إنساناً بشرياً، بل أنا «سَنَد»؛ شخصية افتراضية ومساعد رقمي ذكي تم تطويري لتقديم الدعم الشامل والإجابة على استفساراتك العامة والمتخصصة بدقة وسرعة.`;
  }

  if (
    /^(من انت|مين انت|من أنت|ما اسمك|شو اسمك|عرفني بنفسك|عرف عن نفسك|ما وظيفتك|شو وظيفتك|مين طورك)\b/i.test(cleaned)
  ) {
    return `أنا «سَنَد»، شخصيتك الافتراضية الذكية ومستشارك التفاعلي. أجمع بين القدرة على تقديم استشارات دقيقة وموثقة في القوانين والضرائب والجمارك في فلسطين، والإجابة على كافة الأسئلة العامة والمعرفية في شتى المجالات.`;
  }

  // 3. Mohamed Salah
  if (/محمد صلاح|فخر العرب/i.test(cleaned)) {
    return `نعم بكل تأكيد! بصفتي شخصية افتراضية مطلعة، يسرني إخبارك بأن **محمد صلاح** هو قائد المنتخب المصري الأول ونجم نادي ليفربول الإنجليزي، ويُعد واحداً من أبرز وأعظم أساطير كرة القدم في تاريخ العالم العربي والدوري الإنجليزي الممتاز والعالم.\n\n📌 **أبرز محطاته وإنجازاته:**\n• حقق مع نادي ليفربول ألقاباً تاريخية: دوري أبطال أوروبا، الدوري الإنجليزي الممتاز (البريميرليج)، كأس السوبر الأوروبي، وكأس العالم للأندية.\n• فاز بجائزة الحذاء الذهبي لهداف الدوري الإنجليزي الممتاز عدة مرات.\n• فاز بجائزة أفضل لاعب في إفريقيا (الكاف) عامي 2017 و2018.\n• الهداف التاريخي لنادي ليفربول في دوري أبطال أوروبا والبريميرليج.`;
  }

  // 4. Islamic religion
  if (/الدين الإسلامي|دين الاسلام|الاسلام|الإسلام|اركان الاسلام|أركان الإسلام/i.test(cleaned) && !/قانون|ضريبة|جمارك/.test(cleaned)) {
    return `بصفتي مساعدك الافتراضي المعرفي، يسعدني توضيح ذلك: **الدين الإسلامي** هو الرسالة الخاتمة التي أرسل الله بها خاتم الأنبياء والمرسلين نبينا محمد ﷺ رحمةً للعالمين. وهو دين التوحيد القائم على إفراد الله سبحانه بالعبودية، والعدل والرحمة ومكارم الأخلاق.\n\n📌 **أركان الإسلام الخمسة:**\n1. **الشهادتان:** شهادة أن لا إله إلا الله، وأن محمداً رسول الله.\n2. **إقام الصلاة:** أداء الصلوات الخمس المفروضة في أوقاتها.\n3. **إيتاء الزكاة:** حق واجب في أموال الأغنياء يُدفع للفقراء والمستحقين.\n4. **صوم رمضان:** الامتناع عن المفطرات من طلوع الفجر إلى غروب الشمس طوال شهر رمضان المبارك.\n5. **حج البيت:** قصد الكعبة المشرفة لأداء المناسك لمن استطاع إليه سبيلاً.\n\n📌 **أركان الإيمان الستة:**\nالإيمان بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، والقدر خيره وشره.`;
  }

  // 5. If NOT a legal/tax/customs query: answer as a smart, clear virtual assistant persona
  if (!isLegalTaxCustomsQuery(query)) {
    return `أهلاً بك! بصفتي شخصيتك الافتراضية ومساعدك الذكي «سَنَد»، يسعدني جداً الإجابة على أي سؤال أو استفسار عام في أي مجال (العلوم، الثقافة، الرياضة، التقنية، اللغات، أو الحوار اليومي).\n\nتفضل بطرح سؤالك بمزيد من التفصيل وسأجيبك فوراً بكل وضوح وسلاسة.`;
  }

  // 6. LEGAL / TAX / CUSTOMS QUERY
  const requestedArticleNumber = extractRequestedArticleNumber(query);
  const normQuery = normalizeArabic(query);
  const keywords = normQuery
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['قانون', 'مرسوم', 'سنة', 'قرار', 'مادة', 'نظام', 'بند', 'ملف'].includes(w));

  // Score chunks across available laws
  const allChunks: LegalChunk[] = [];
  let exactArticleMatches: LegalChunk[] = [];

  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const normTitle = normalizeArabic(chunk.lawTitle);
      const normCategory = normalizeArabic(chunk.category);
      const normHeader = normalizeArabic(chunk.sectionHeader);
      const normText = normalizeArabic(chunk.text);
      const normFileName = normalizeArabic(chunk.sourceFileName || '');

      let score = 0;

      // Exact article number bonus
      if (requestedArticleNumber) {
        const isHeaderMatch = chunk.articleNumber === requestedArticleNumber ||
          new RegExp(`(?:المادة|مادة|الماده|البند|بند|الفقرة|فقرة)\\s*(?:رقم)?\\s*[\\(\\[]?${requestedArticleNumber}[\\)\\]\\:\\.\\s]`, 'i').test(chunk.sectionHeader);

        const isTextMatch = new RegExp(`(?:المادة|مادة|الماده|البند|بند|الفقرة|فقرة)\\s*(?:رقم)?\\s*[\\(\\[]?${requestedArticleNumber}[\\)\\]\\:\\.\\s]`, 'i').test(chunk.text.substring(0, 300));

        if (isHeaderMatch) {
          score += 80;
          exactArticleMatches.push(chunk);
        } else if (isTextMatch) {
          score += 50;
          exactArticleMatches.push(chunk);
        }
      }

      // Direct file name matching
      if (normFileName && keywords.some((w) => w.length >= 3 && normFileName.includes(w))) {
        score += 25;
      }

      if (keywords.some((w) => w.length >= 3 && normTitle.includes(w))) {
        score += 15;
      }

      for (const word of keywords) {
        if (word.length < 2) continue;
        if (normHeader.includes(word)) {
          score += 10;
        }
        if (normTitle.includes(word)) {
          score += 8;
        }
        if (normCategory.includes(word)) {
          score += 5;
        }
        if (normText.includes(word)) {
          score += 3;
        }
      }

      chunk.score = score;
      if (score >= 2) allChunks.push(chunk);
    }
  }

  const topChunk = exactArticleMatches[0] || allChunks.sort((a, b) => (b.score || 0) - (a.score || 0))[0];

  if (topChunk) {
    const timing = extractLawTiming(topChunk.lawTitle, topChunk.text);
    const sourceInfo = topChunk.sourceFileName ? ` [اسم الملف: ${topChunk.sourceFileName}]` : '';

    let result = `⚖️ **المرجع والأساس التشريعي المعتمد:**\n`;
    result += `• **التشريع / الملف المصدر:** ${topChunk.lawTitle}${sourceInfo} (${timing})\n`;
    result += `• **الموضع / المادة المعنية:** ${topChunk.sectionHeader}\n`;
    result += `• **التصنيف:** ${topChunk.category}\n\n`;

    result += `💡 **الحكم والتكييف القانوني المفصل:**\n`;
    result += `${topChunk.text}\n\n`;

    result += `📋 **الضوابط والشروط والنسب المقررة:**\n`;
    result += `• **سنة المعاملة والتطبيق:** تسري هذه الأحكام والبنود المذكورة وفقاً للوثيقة والملف المعتمد في النظام.\n`;
    result += `• **صفة المكلف:** يرجى التمييز بين المعاملات الخاصة بالأفراد الطبيعيين وتلك الخاصة بالشركات والمؤسسات التجارية.\n`;
    result += `• **المستندات المطلوبة:** يُشترط استيفاء الفواتير أو البيانات الجمركية/الضريبية الرسمية المعتمدة لدى الدائرة المختصة.\n\n`;

    result += `📌 **التوجيهات والإرشادات للمكلف:**\n`;
    result += `تم استخراج هذا النص بدقة وأمانة تشريعية كاملة من الملفات وقاعدة المعرفة المرفوعة في النظام.`;
    return result;
  }

  let promptForDetails = `📋 **لتحديد الحكم الدقيق والشامل وفق الملفات والقوانين المسجلة، يرجى تزويدي بالتفاصيل التالية:**\n`;
  promptForDetails += `• **سنة المعاملة المالية أو التصريح:** (لتحديد القانون والتعديل الساري).\n`;
  promptForDetails += `• **صفة المكلف:** (فرد طبيعي/موظف أم شركة تجارية/مساهمة).\n`;
  promptForDetails += `• **المعاملة المستهدفة:** (استيراد/تصدير، ضريبة دخل، ضريبة قيمة مضافة، طرد بريدي، عقوبة/غرامة، أو اسم الملف المحدد).\n\n`;
  promptForDetails += `⚖️ **إفادة استشارية أولية:** لم يتم العثور على مادة مطابقة تماماً بهذا اللفظ في قاعدة التشريعات والملفات المسجلة حالياً (${laws.length} تشريع/ملف). تفضل بتحديد المعطيات أعلاه أو مراجعة تبويب القوانين للتأكد من رفع الملف.`;
  return promptForDetails;
}
