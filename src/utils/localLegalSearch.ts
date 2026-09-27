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
 * Helper to check for platform-specific and meta questions (identity, owner, laws count)
 */
export function isPlatformOrMetaQuery(query: string): { isMeta: boolean; type?: 'laws_catalog' | 'founder' | 'bot_identity' } {
  if (!query || typeof query !== 'string') return { isMeta: false };
  const cleaned = query.toLowerCase().replace(/[!؟?.,،:\-\s]+/g, ' ').trim();

  // 1. Laws count & catalog
  if (
    /(كم عدد القوانين|عدد القوانين|قائمة القوانين|فهرس القوانين|التشريعات الموجودة|ما هي القوانين|القوانين المتاحة|القوانين ال عندك|القوانين الي عندك|القوانين التي لديك|كم قانون عندك|كم قانون لديك|اعرض القوانين|شو القوانين المتاحة)/i.test(
      cleaned
    )
  ) {
    return { isMeta: true, type: 'laws_catalog' };
  }

  // 2. Owner & founder
  if (
    /(مين المالك|صاحب الموقع|مالك الموقع|صاحب المنصة|مالك المنصة|مين صاحب|مين طور|مين برمج|من اسس|من أسس|من انشأ|من أنشأ|من هو مؤسس|مؤسس الموقع|مؤسس المنصة|مين مسؤل|مين المسؤول)/i.test(
      cleaned
    )
  ) {
    return { isMeta: true, type: 'founder' };
  }

  // 3. Bot identity
  if (
    /^(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي|من انت|مين انت|من أنت|ما اسمك|شو اسمك|عرفني بنفسك|عرف عن نفسك|ما وظيفتك|شو وظيفتك)$/i.test(
      cleaned
    )
  ) {
    return { isMeta: true, type: 'bot_identity' };
  }

  return { isMeta: false };
}

/**
 * Check if a query is truly about laws, taxes, customs, or uploaded files
 */
export function isLegalTaxCustomsQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.trim().toLowerCase();
  const cleaned = q.replace(/[!؟?.,،:\-\s]+/g, ' ').trim();

  // 0. Meta questions are NOT legal cases
  if (isPlatformOrMetaQuery(query).isMeta) {
    return false;
  }

  // 1. Clear non-legal general knowledge topics (when no legal terms exist)
  if (
    /(محمد صلاح|ميسي|رونالدو|كرة القدم|الرياضة|الدين الإسلامي|دين الاسلام|القرآن|الحديث|الصلاة|الصيام|الحج|الزكاة|النبي|الرسول|الصحابة|الفيزياء|الكيمياء|الطب|الفلك|الفضاء|الطقس|التاريخ|الجغرافيا|الفلسفة|البرمجة|الرياضيات|معنى كلمة|قصة|نكتة|شعر|طبخ|عاصمة|من هو|من هي|ما هو|ما هي|ماذا تعرف عن)/i.test(
      cleaned
    ) &&
    !/(قانون|قوانين|تشريع|تشريعات|مرسوم|مراسيم|قرار بقانون|قرار|مادة|مواد|لائحة|لوائح|نظام|أنظمة|بند|بنود|ملف|ملفات|الملف|الملفات|مستند|مستندات|المستند|وثيقة|وثائق|رفعت|رفعته|المرفوع|المرفوعة|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|رسم جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|سجل تجاري|مقاصة|إعفاء ضريبي|فاتورة ضريبية|عقوبة|غرامة|تهرب|عمل|عقد|إجازة|نهاية خدمة|شركة|شركات)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 2. If query specifies an article number (e.g. المادة 15 or مادة 4)
  if (extractRequestedArticleNumber(query)) {
    return true;
  }

  // 3. Retroactive application of laws & legal theory
  if (/(اي قانون جديد من متى|متى يتم تطبيق|ينطبق على الفترة قبل صدوره|باثر رجعي|بأثر رجعي|عدم رجعية|سريان القانون|نفاذ القانون)/i.test(cleaned)) {
    return true;
  }

  // 4. Broad Palestinian legal, tax, customs, employment, corporate, and document terms
  const legalTermsRegex = /(قانون|قوانين|تشريع|تشريعات|مرسوم|مراسيم|قرار بقانون|قرار|قرارات|مادة|مواد|الماده|المواد|لائحة|لوائح|نظام|أنظمة|بند|بنود|فقرة|فقرات|ملف|ملفات|الملف|الملفات|مستند|مستندات|المستند|المستندات|وثيقة|وثائق|الوثيقة|رفعت|رفعته|المرفوع|المرفوعة|مرفق|مرفقات|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|إعفاء ضريبي|إعفاء|إعفاءات|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|غرامة تأخير|غرامة|غرامات|عقوبة|عقوبات|محكمة الصلح|محكمة البداية|محكمة الاستئناف|وزارة المالية|دائرة الجمارك|مكافحة غسل الأموال|فحص ضريبي|تهرب ضريبي|تهريب جمركي|سجل تجاري|فاتورة ضريبية|مقاصة|استيراد|تصدير|معبر|ضريبة أملاك|شريحة ضريبية|شرائح|الخصم من المنبع|رد ضريبي|استيراد سيارات|سيارة|بضاعة|ترخيص|عمل|عمال|عامل|موظف|نهاية خدمة|مكافأة|إجازة|إجازات|فصل تعسفي|عقد عمل|ساعات العمل|أجور|أجر|حد أدنى|شركة|شركات|تأسيس شركة|مراقب الشركات|شيك|شيكات|كمبيالة|سند|عقار|أراضي|طابو|إيجار|ميراث|تركات|دعوى|استئناف|اعتراض|طعن|تنفيذ|حجز|مصادرة|كفالة)/i;

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
  const cleaned = trimmed.replace(/[!؟?.,،:\-\s]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  // 1. Meta Query Checks
  const metaCheck = isPlatformOrMetaQuery(query);
  if (metaCheck.isMeta && metaCheck.type === 'laws_catalog') {
    const validLaws = (laws || []).filter((l) => l && l.content && l.content.length > 80 && !l.content.includes('يمكنك كتابة وتعديل نصوص المواد'));
    const count = validLaws.length > 0 ? validLaws.length : (laws || []).length;
    return `تحتوي قاعدة بيانات «سَنَد» حالياً على **${count}** تشريعاً وقراراً بقانون وملفاً رسمياً معتمداً في دولة فلسطين، تغطي الضرائب (الدخل والقيمة المضافة 16%)، الجمارك والمكوس والتعرفة والطرود، قانون العمل، مكافحة غسل الأموال، والقرارات المنشورة في الجريدة الرسمية. تفضل بسؤالي عن أي مادة أو نسبة وسأجيبك فوراً.`;
  }

  if (metaCheck.isMeta && metaCheck.type === 'founder') {
    return `منصة ومستشار «سَنَد» تأسست وتُدار بإشراف **المستشار القانوني أ. محمد ناصر خليل** (مستشار السياسات الجمركية والتشريعات الضريبية في فلسطين) لتقديم الاستشارات القانونية والضريبية الموثقة.`;
  }

  if (metaCheck.isMeta && metaCheck.type === 'bot_identity') {
    return `أنا «سَنَد»، المستشار القانوني والتشريعي الذكي لمنظومة القوانين والضرائب والجمارك في دولة فلسطين، ولست إنساناً بشرياً بل مساعدك الافتراضي الرقمي المتخصص. تفضل بطرح سؤالك وسأجيبك بكل دقة.`;
  }

  // 2. Standalone Casual Greetings & Check-ins ONLY (1-3 words)
  if (words.length <= 3) {
    if (/^(عامل ايه|عامل اي|عامل إيه|عامل إي|ازيك|إزيك|كيفك|كيف حالك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|كيفك اليوم)$/i.test(cleaned)) {
      return `الحمد لله بألف خير ونعمة، شكراً لسؤالك ولطفك! أرجو أن تكون بأفضل حال وعافية دائماً.\n\nتفضل بأي استفسار وسأجيبك بكل سرور ودقة.`;
    }
    if (/^(سلام|السلام عليكم|سلام عليكم|مرحبا|مرحباً|أهلا|اهلا|صباح الخير|مساء الخير|هاي|hello|hi)$/i.test(cleaned)) {
      return `وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك. أنا «سَنَد» مستشارك القانوني والتشريعي الذكي، كيف أستطيع مساعدتك اليوم؟`;
    }
    if (/^(شكرا|شكراً|تسلم|مشكور|الله يبارك فيك|يعطيك العافية|يسلمو|بارك الله فيك)$/i.test(cleaned)) {
      return `العفو على الرحب والسعة دائماً! أنا في خدمتك في أي وقت لأي سؤال أو استفسار.`;
    }
  }

  // 3. Mohamed Salah
  if (/^(من هو محمد صلاح|محمد صلاح|معلومات عن محمد صلاح|فخر العرب)$/i.test(cleaned)) {
    return `نعم بكل تأكيد! **محمد صلاح** هو قائد المنتخب المصري ونجم نادي ليفربول الإنجليزي، ويُعد واحداً من أبرز وأعظم أساطير كرة القدم في تاريخ العالم العربي والدوري الإنجليزي الممتاز.\n\n📌 **أبرز محطاته وإنجازاته:**\n• حقق مع ليفربول: دوري أبطال أوروبا، الدوري الإنجليزي الممتاز، كأس السوبر الأوروبي، وكأس العالم للأندية.\n• فاز بالحذاء الذهبي لهداف الدوري الإنجليزي عدة مواسم.\n• فاز بجائزة أفضل لاعب في إفريقيا (الكاف) مرتين.`;
  }

  // 4. Islamic religion
  if (/^(ما هو الدين الإسلامي|الدين الإسلامي|دين الاسلام|الاسلام|الإسلام|اركان الاسلام|أركان الإسلام)$/i.test(cleaned)) {
    return `**الدين الإسلامي** هو الرسالة الخاتمة التي أرسل الله بها نبينا محمد ﷺ رحمةً للعالمين، وهو دين التوحيد والعدل والرحمة ومكارم الأخلاق.\n\n📌 **أركان الإسلام الخمسة:** الشهادتان، إقام الصلاة، إيتاء الزكاة، صوم رمضان، وحج البيت لمن استطاع إليه سبيلاً.`;
  }

  // 5. Retroactivity and Application of Laws in Palestine (مبدأ عدم رجعية القوانين)
  if (/(اي قانون جديد من متى|متى يتم تطبيق|ينطبق على الفترة قبل صدوره|باثر رجعي|بأثر رجعي|عدم رجعية|سريان القانون|نفاذ القانون)/i.test(cleaned)) {
    return `### ⚖️ الأثر القانوني لسريان القوانين وتطبيقها من حيث الزمان (فلسطين):

📌 **القاعدة الأساسية (مبدأ عدم رجعية القوانين):**
وفقاً لأحكام **القانون الأساسي الفلسطيني المعدل لسنة 2003م (المادة 15)** والقواعد الدستورية المستقرة:
1. **تاريخ النفاذ:** يسري أي قانون أو قرار بقانون جديد من **تاريخ نشره في الجريدة الرسمية (الوقائع الفلسطينية)**، أو من التاريخ المحدد صراحةً في صلب القانون لنفاذه.
2. **الأثر المباشر فقط:** تنطبق أحكام القانون الجديد على الوقائع والمعاملات والتصرفات اللاحقة لتاريخ نفاذه، **ولا يسري إطلاقاً على الوقائع أو الفترات السابقة لصدوره**.

---

📋 **الضوابط والتطبيقات العملية:**
* **في المجال الضريبي والجمركي:**
  - **مبدأ الشرعية الضريبية:** لا تفرض ضرائب أو رسوم أو غرامات إلا بقانون، ولا يجوز تطبيق تعديلات ضريبية أو فرض أعباء بأثر رجعي على فترات مالية سابقة لنفاذ التعديل، حفاظاً على استقرار المراكز القانونية للمكلفين.
* **في المجال الجزائي والعقوبات:**
  - لا جريمة ولا عقوبة إلا بنص قانوني نافذ وقت ارتكاب الفعل، والاستثناء الوحيد هو **«القانون الأصلح للمتهم»** إذا كان يخفف العقوبة أو يلغي التجريم.

💡 **الخلاصة:** أي قانون جديد يطبق مستقبلاً من تاريخ نفاذه الرسمي ولا ينطبق على الفترة السابقة لصدوره.`;
  }

  // 6. Value Added Tax (VAT) rate and regulations (ضريبة القيمة المضافة)
  if (/(نسبة ضريبة القيمة المضافة|ضريبة القيمة المضافة|نسبة القيمة المضافة|ضريبة القيمه المضافه|كم ضريبة القيمة المضافة|فاتورة مقاصة|فواتير المقاصة)/i.test(cleaned)) {
    return `### ⚖️ أحكام ونسبة ضريبة القيمة المضافة النافذة في دولة فلسطين:

📌 **النسبة القانونية المعتمدة:**
النسبة العامة لضريبة القيمة المضافة (VAT) في دولة فلسطين هي **16%**، وتُطبق على جميع مبيعات السلع والخدمات المحلية والمستوردة في محافظات الوطن.

---

📋 **الضوابط والشروط والتعاملات الخاصة:**
1. **التوريدات المحلية:** تخضع لنسبة **16%** تضاف إلى القيمة الإجمالية للسلعة أو الخدمة بموجب فاتورة ضريبية رسمية.
2. **الصادرات:** تخضع لنسبة **الصفر (0%)** تشجيعاً للمنتجات الوطنية والتصدير الخارجي.
3. **فواتير المقاصة (مع الجانب الآخر):** تخضع المعاملات التجارية المتبادلة للتنسيق الضريبي عبر فواتير المقاصة (حيث تطبق نسبة 17% لتوحيد المقاصة والخصم المشترك وفق بروتوكول باريس الاقتصادي).
4. **الخصم والاسترداد:** يحق للمكلف المسجل في ضريبة القيمة المضافة خصم ضريبة المدخلات (الضريبة التي دفعها على مشترياته ومصروفاته التشغيلية) من ضريبة المخرجات وتوريد الفارق لدائرة الضريبة شهرياً أو دورياً.

💡 **المرجع الرسمي:** تعليمات وقرارات الإدارة العامة للجمارك والمكوس وضريبة القيمة المضافة بوزارة المالية الفلسطينية.`;
  }

  // 7. Income Tax exemptions and brackets (إعفاءات وشرائح ضريبة الدخل)
  if (/(اعفاءات ضريبة الدخل|إعفاءات ضريبة الدخل|اعفاء ضريبة الدخل|شرائح ضريبة الدخل|شريحة ضريبة الدخل|حساب ضريبة الدخل|ضريبة الدخل للموظف|ضريبة الدخل للشركات)/i.test(cleaned)) {
    return `### ⚖️ إعفاءات وشرائح ضريبة الدخل للأفراد والشركات في فلسطين:

📌 **المرجع القانوني:** قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته.

---

📋 **أولاً: الإعفاءات المقررة للشخص الطبيعي (الموظف / المهني) - المادة (13):**
1. **الإعفاء الأساسي:** يُمنح الشخص الطبيعي المقيم إعفاءً سنوياً أساسياً قدره **(36,000) ستة وثلاثون ألف شيكل سنوياً** (أي 3,000 شيكل شهرياً) من دخله الإجمالي.
2. **المساهمات التقاعدية:** إعفاء كامل المساهمة الفعلية في صناديق التقاعد أو التأمين الصحي المعتمدة.
3. **إعفاء السكن:** إعفاء شراء أو بناء سكن لمرة واحدة حتى 30,000 دينار أردني (أو ما يعادلها بالشيكل).
4. **مكافأة نهاية الخدمة:** معفاة من ضريبة الدخل وفق الحدود القانونية المعتمدة.

---

📊 **ثانياً: الشرائح التصاعدية لضريبة دخل الأفراد (المادة 18) بعد طرح الإعفاءات:**
• **الشريحة الأولى (من 1 إلى 40,000 شيكل سنوياً):** **5%**
• **الشريحة الثانية (من 40,001 إلى 80,000 شيكل سنوياً):** **10%**
• **الشريحة الثالثة (ما يزيد عن 80,000 شيكل سنوياً):** **15%**

🏢 **ثالثاً: ضريبة دخل الشركات (الشخص المعنوي):**
• النسبة الأساسية هي **15%** من الدخل الصافي الخاضع للضريبة (مع الاستفادة من حوافز قانون تشجيع الاستثمار الفلسطيني).`;
  }

  // 8. Palestinian Labor Law (قانون العمل الفلسطيني رقم 7 لسنة 2000م)
  if (/(قانون العمل|اجازات الموظف|إجازات الموظف|شروط الاجازة|مكافأة نهاية الخدمة|مكافاه نهايه الخدمه|ساعات العمل في قانون العمل|الفصل التعسفي في قانون العمل)/i.test(cleaned)) {
    return `### ⚖️ أحكام وحقوق العامل وفق قانون العمل الفلسطيني رقم (7) لسنة 2000م:

📌 **المرجع التشريعي:** قانون العمل الفلسطيني رقم (7) لسنة 2000م وتعديلاته.

---

📋 **1. الإجازات المقررة للموظف:**
• **الإجازة السنوية (المادة 74):** **14 يوماً مدفوعة الأجر** عن كل سنة عمل، وتصبح **21 يوماً** لمن أمضى 5 سنوات في المنشأة أو للعمال في الأعمال الخطرة والمضرة بالصحة.
• **الإجازة المرضية (المادة 79):** **14 يوماً بأجر كامل** و**14 يوماً بنصف أجر** خلال السنة الواحدة بناءً على تقرير طبي معتمد.
• **إجازة الأمومة (المادة 103):** **10 أسابيع (70 يوماً)** مدفوعة الأجر للمرأة العاملة.
• **إجازة أداء فريضة الحج:** 3 أسابيع بأجر لمرة واحدة طوال فترة خدمته لمن أمضى 5 سنوات.

---

📋 **2. ساعات العمل ونهاية الخدمة:**
• **ساعات العمل الرسمية (المادة 68):** **45 ساعة أسبوعياً** كحد أقصى موزعة على أيام الأسبوع.
• **مكافأة نهاية الخدمة (المادة 42):** يستحق العامل عند انتهاء خدمته **أجر شهر عن كل سنة عمل** قضاها لدى صاحب العمل، وتُحسب كسور السنة بنسبة ما قضاه منها.
• **فترة التجربة (المادة 34):** لا يجوز أن تزيد عن **3 أشهر**، ولا يجوز تشغيل العامل تحت التجربة لدى نفس صاحب العمل أكثر من مرة.`;
  }

  // 9. Customs & Postal Parcels (الجمارك والطرود البريدية)
  if (/(جمارك|جمرك|طرد بريدي|طرود بريدية|شحنة شخصية|شحنات|بيان جمركي|رسوم جمركية|استيراد سيارات)/i.test(cleaned)) {
    return `### ⚖️ أحكام الرسوم الجمركية والطرود البريدية في دولة فلسطين:

📌 **المرجع التشريعي:** قانون الجمارك والمكوس رقم (1) لسنة 1962م وتعديلاته، ولائحة التعرفة الجمركية الفلسطينية.

---

📋 **نظام الطرود البريدية والشحنات الشخصية:**
1. **الطرود حتى 150 دولار أمريكي:** معفاة من الرسوم الجمركية وضريبة القيمة المضافة، بشرط أن تكون للاستخدام الشخصي وغير التجاري.
2. **الطرود من 150 إلى 500 دولار أمريكي:** تخضع لضريبة القيمة المضافة (16%) ورسوم جمركية مقطوعة ومخفضة.
3. **الطرود التي تزيد عن 500 دولار أمريكي (أو ذات الطابع التجاري):** تخضع للإجراءات الجمركية الكاملة وفتح بيان جمركي رسمي وتطبيق التعرفة الجمركية بحسب بند التعرفة لكل صنف.

💡 **المستندات المطلوبة:** الفاتورة الأصلية للمشتريات، بوليصة الشحن، وإثبات الهوية الشخصية للمستلم.`;
  }

  // 10. Specific Article Requested across laws
  const requestedArticle = extractRequestedArticleNumber(query);
  if (requestedArticle) {
    const normQuery = normalizeArabic(query);
    const matchedChunks: LegalChunk[] = [];
    for (const law of laws) {
      const chunks = chunkLawContent(law);
      for (const ch of chunks) {
        if (ch.articleNumber === requestedArticle || ch.sectionHeader.includes(requestedArticle)) {
          matchedChunks.push(ch);
        }
      }
    }
    if (matchedChunks.length > 0) {
      let res = `### ⚖️ نصوص المادة رقم (${requestedArticle}) المستخرجة من التشريعات والملفات المعتمدة:\n\n`;
      matchedChunks.slice(0, 3).forEach((c, idx) => {
        const timing = extractLawTiming(c.lawTitle, c.text);
        res += `📌 **(${idx + 1}) التشريع:** ${c.lawTitle} (${timing})\n`;
        res += `• **الموضع:** ${c.sectionHeader}\n`;
        res += `• **النص المعتمد:**\n${c.text}\n\n`;
      });
      res += `💡 إذا كنت تقصد تشريعاً محدداً بعينه (مثل قانون ضريبة الدخل، قانون الجمارك، أو قانون العمل)، يرجى تحديد اسم القانون لأزودك بتفاصيله الدقيقة.`;
      return res;
    }
  }

  // 11. General Substantive RAG Search across Database
  const allChunks: LegalChunk[] = [];
  const substantiveWords = normalizeArabic(query).split(/\s+/).filter(w => w.length >= 2);
  for (const law of laws) {
    const chunks = chunkLawContent(law);
    for (const chunk of chunks) {
      let sc = 0;
      const h = normalizeArabic(chunk.sectionHeader);
      const t = normalizeArabic(chunk.text);
      for (const w of substantiveWords) {
        if (h.includes(w)) sc += 10;
        if (t.includes(w)) sc += 3;
      }
      if (sc >= 15) {
        allChunks.push({ ...chunk, score: sc });
      }
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));

  if (allChunks.length > 0) {
    const topChunk = allChunks[0];
    const timing = extractLawTiming(topChunk.lawTitle, topChunk.text);

    let result = `### ⚖️ الإفادة القانونية المستندة إلى التشريعات المعتمدة (فلسطين):\n\n`;
    result += `📌 **المرجع التشريعي المعتمد:**\n`;
    result += `• **التشريع / الملف:** ${topChunk.lawTitle} (${timing})\n`;
    result += `• **الموضع / المادة:** ${topChunk.sectionHeader}\n`;
    result += `• **التصنيف:** ${topChunk.category}\n\n`;

    result += `📋 **النص والحكم التشريعي:**\n`;
    result += `${topChunk.text}\n\n`;

    result += `💡 **إرشادات وتوجيهات عملية:**\n`;
    result += `تم استخراج هذا النص بدقة وأمانة تشريعية تامة من الوثائق والملفات الرسمية المعتمدة في النظام.`;
    return result;
  }

  // 12. Non-legal fallback
  if (!isLegalTaxCustomsQuery(query)) {
    return `أهلاً بك! بصفتي شخصيتك الافتراضية ومساعدك الذكي «سَنَد»، يسعدني جداً الإجابة على أي سؤال أو استفسار عام في أي مجال معرفي وثقافي بكل دقة وسلاسة.\n\nتفضل بطرح سؤالك وسأجيبك فوراً.`;
  }

  return `### ⚖️ استشارة قانونية وتشريعية (فلسطين):
لم يتم العثور على مادة مطابقة تماماً بهذا اللفظ الحرفي في قاعدة التشريعات والملفات المسجلة حالياً (${laws.length} تشريع/ملف).
يرجى توضيح سؤالك أو تحديد اسم القانون المنشود (مثل قانون ضريبة الدخل، قانون الجمارك، قانون العمل الفلسطيني) أو رقم المادة المطلوبة لأقوم باستخراجها لك فوراً بكل دقة.`;
}
