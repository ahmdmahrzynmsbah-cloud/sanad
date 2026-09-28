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
 * Robust detection of Arabic dialect greetings and pleasantries (Egyptian, Levantine, Gulf, Standard)
 */
export function detectConversationalGreeting(query: string): { isGreeting: boolean; reply?: string } {
  if (!query || typeof query !== 'string') return { isGreeting: false };
  const cleaned = query.trim().toLowerCase().replace(/[!؟?.,،:\-\s]+/g, ' ').trim();

  // 1. "عامل ايه" / "عامل اي" / "كيف حالك" / "ازيك" / "شخبارك"
  if (
    /^(عامل ايه|عامل اي|عامل إيه|عامل إي|انت عامل ايه|انت عامل اي|أنت عامل ايه|أنت عامل إيه|ازيك عامل ايه|كيفك عامل ايه|عاملين ايه|عاملين اي|شو عامل|إيش عامل|ايش عامل|كيفك|كيف حالك|كيف الحال|ازيك|إزيك|شلونك|شخبارك|أخبارك|اخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|كيفك اليوم|اخبارك ايه|أخبارك إيه|اخبارك اي|ازيك يا غالي|ازيك يا كبير|كيف حالك يا غالي|كيفك يا غالي|شلونك اليوم)$/i.test(
      cleaned
    ) ||
    /^(يا هلا|اهلا وسهلا|أهلا وسهلا|مرحبا بك|مرحباً بك|صباح الورد|مساء الورد|نهارك سعيد)$/i.test(cleaned)
  ) {
    return {
      isGreeting: true,
      reply: 'أهلاً وسهلاً بك! أنا بخير والحمد لله، وأتمنى أن تكون بأتم الصحة والعافية دائماً. أنا «سَنَد»، مستشارك الذكي في القوانين والضرائب والجمارك بدولة فلسطين. تفضل بطرح أي سؤال أو استفسار وسأجيبك بكل سرور ودقة!',
    };
  }

  // 1.b Compound Greetings (e.g. "سلام عليكم كيف الحال", "مرحبا كيفك", "صباح الخير شو الأخبار")
  if (
    /^(سلام|السلام عليكم|سلام عليكم|وعليكم السلام|مرحبا|مرحباً|أهلا|اهلا|يا هلا|صباح الخير|مساء الخير|هاي)\s+(كيفك|كيف حالك|كيف الحال|شخبارك|اخبارك|أخبارك|شو أخبارك|شو اخبارك|عامل ايه|عامل اي|ازيك|شلونك|طمني عنك|طمنا عنك)$/i.test(cleaned) ||
    /^(كيفك|كيف حالك|كيف الحال|ازيك|عامل ايه|عامل اي|شلونك|شخبارك)\s+(يا غالي|يا كبير|يا باشا|يا طيب|حبيبي|اليوم|شو الاخبار|شو الأخبار)$/i.test(cleaned) ||
    /^(سلام|السلام عليكم|سلام عليكم|وعليكم السلام)\s+(ورحمة الله وبركاته|ورحمة الله)$/i.test(cleaned)
  ) {
    return {
      isGreeting: true,
      reply: 'وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك. أنا بخير والحمد لله، ومستعد تماماً لمساعدتك في أي استفسار حول القوانين والضرائب والجمارك في دولة فلسطين. تفضل بما تود معرفته!',
    };
  }

  // 2. Pure Greetings
  if (
    /^(سلام|السلام عليكم|سلام عليكم|وعليكم السلام|مرحبا|أهلا|اهلا|مرحباً|يا هلا|صباح الخير|مساء الخير|هاي|hello|hi|good morning|good evening)$/i.test(
      cleaned
    )
  ) {
    return {
      isGreeting: true,
      reply: 'وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك في منصة «سَنَد». أنا مستشارك الذكي في القوانين والأنظمة الضريبية والجمركية بدولة فلسطين. كيف يمكنني مساعدتك اليوم؟',
    };
  }

  // 3. Gratitude & Pleasantries
  if (
    /^(شكرا|شكراً|شكرا جزيلا|شكراً جزيلاً|تسلم|مشكور|الله يعطيك العافية|يعطيك العافية|الله يعافيك|يسلمو|بارك الله فيك|جزاك الله خير|جزاك الله خيرا|تسلم ايدك|الف شكر|ألف شكر|حبيبي|تسلم يا غالي|مشكور يا غالي)$/i.test(
      cleaned
    )
  ) {
    return {
      isGreeting: true,
      reply: 'العفو، على الرحب والسعة دائماً وأبداً! أنا في خدمتك دائماً لأي استفسار أو تدقيق قانوني أو ضريبي أو جمركي. لا تتردد في سؤالي في أي وقت.',
    };
  }

  // 4. Affirmations & Casual replies
  if (/^(تمام|الحمد لله|الحمدلله|كويس|الحمد لله تمام|ماشى|ماشي|اوكي|أوكي|ok|منور|يا غالي|يا باشا)$/i.test(cleaned)) {
    return {
      isGreeting: true,
      reply: 'دائماً يا رب بأفضل حال! أنا جاهز تماماً لمساعدتك في أي استفسار قانوني أو ضريبي أو جمركي في دولة فلسطين. تفضل بما تود معرفته.',
    };
  }

  return { isGreeting: false };
}

/**
 * Check if a query is truly about laws, taxes, customs, or uploaded files
 */
export function isLegalTaxCustomsQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.trim().toLowerCase();
  const cleaned = q.replace(/[!؟?.,،:\-\s]+/g, ' ').trim();

  // 0. Conversational greetings are NEVER legal queries
  if (detectConversationalGreeting(query).isGreeting) {
    return false;
  }

  // 0.b Meta questions are NOT legal cases
  if (isPlatformOrMetaQuery(query).isMeta) {
    return false;
  }

  // 1. Clear non-legal general knowledge, technical, computing, and mathematical topics
  if (
    /(سداسي عشر|سداسي عشري|hexadecimal|ثنائي|binary|عشري|decimal|نظام عددي|التحويل من|تحويل من|تحويل الأعداد|برمجة|كود|خوارزمية|جافا سكريبت|بايثون|html|css|react|فيزياء|كيمياء|رياضيات|معادلة|تكامل|تفاضل|طبخ|وصفة|كرة القدم|رياضة|محمد صلاح|ميسي|رونالدو|الدين الإسلامي|دين الاسلام|القرآن|الحديث|الصلاة|الصيام|الحج|الزكاة|النبي|الرسول|الصحابة|الطب|الفلك|الفضاء|الطقس|التاريخ|الجغرافيا|الفلسفة|معنى كلمة|قصة|نكتة|شعر|عاصمة|من هو|من هي|ما هو|ما هي|ماذا تعرف عن)/i.test(
      cleaned
    ) &&
    !/(ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|إعفاء ضريبي|إعفاء|إعفاءات|فاتورة ضريبية|مقاصة|قانون العمل|حقوق العامل|حقوق العمال|إصابة عمل|أجور العمال|أجر العامل|نهاية خدمة|مكافأة|إجازة|إجازات|فصل تعسفي|عقد عمل|ساعات العمل|تأسيس شركة|سجل تجاري|غسل أموال|غسيل أموال|تمويل إرهاب|سلطة النقد|مدفوعات|محكمة|دعوى|قرار بقانون)/i.test(
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
  const legalTermsRegex = /(قانون|قوانين|تشريع|تشريعات|مرسوم|مراسيم|قرار بقانون|قرارات بقوانين|قرارات وزراء|مادة|مواد|الماده|المواد|لائحة تنفيذية|لوائح تنفيذية|أنظمة تنفيذية|نظام تنفيذي|بند قانوني|بنود قانونية|ملف|ملفات|الملف|الملفات|مستند|مستندات|المستند|المستندات|وثيقة|وثائق|الوثيقة|رفعت|رفعته|المرفوع|المرفوعة|مرفق|مرفقات|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|إعفاء ضريبي|إعفاء|إعفاءات|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|غرامة تأخير|غرامة|غرامات|عقوبة|عقوبات|محكمة الصلح|محكمة البداية|محكمة الاستئناف|وزارة المالية|دائرة الجمارك|مكافحة غسل الأموال|فحص ضريبي|تهرب ضريبي|تهريب جمركي|سجل تجاري|فاتورة ضريبية|مقاصة|استيراد|تصدير|معبر|ضريبة أملاك|شريحة ضريبية|شرائح|الخصم من المنبع|رد ضريبي|استيراد سيارات|سيارة|بضاعة|ترخيص|قانون العمل|حقوق العامل|حقوق العمال|إصابة عمل|إصابات العمل|عمال|العمال|العمالة|العاملين|أجور العمال|أجر العامل|موظف|موظفين|نهاية خدمة|مكافأة|إجازة|إجازات|فصل تعسفي|عقد عمل|ساعات العمل|أجور|أجر|حد أدنى|شركة|شركات|تأسيس شركة|مراقب الشركات|شيك|شيكات|كمبيالة|طابو|إيجار|ميراث|تركات|دعوى|استئناف|اعتراض|طعن|تنفيذ|حجز|مصادرة|كفالة)/i;

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

  const regex = /(?:\n\s*|\s{2,}|\.\s+|\:\s+|^)(?=(?:[-•*]\s*)?(?:المادة|مادة|الماده|البند|بند|الفصل|فصل|الباب|باب|ملحق|الملحق|الفقرة|فقرة|أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً)\s*(?:رقم)?\s*[\(\[]?(?:\d+|[٠-٩]+|[^\n\:\.\-]{1,35})[\)\]\:\.\-]?)/gi;

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
      sectionHeader: law.title || 'كامل النص للتشريع',
      text: normalizedText.trim(),
      sourceFileName: law.sourceFileName,
    });
  }

  return chunks;
}

/**
 * Helper to keep all laws indexed without dropping short or uploaded notes
 */
export function isSubstantiveLaw(law: Law): boolean {
  if (!law) return false;
  if (law.title && law.title.trim().length > 0) return true;
  if (law.content && law.content.trim().length > 10) return true;
  return false;
}

/**
 * Search and build precise citation sources for a given legal query
 */
export function findCitationsForQuery(query: string, laws: Law[]): CitationSource[] {
  if (!laws || laws.length === 0 || !query) return [];

  const activeLaws = laws.filter(isSubstantiveLaw);
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
        score += 20;
      }

      for (const word of keywords) {
        if (word.length < 2) continue;
        if (normHeader.includes(word)) score += 15;
        if (normTitle.includes(word)) score += 10;
        if (normCategory.includes(word)) score += 5;
        if (normText.includes(word)) score += 4;
      }

      chunk.score = score;
      if (score >= 8) allChunks.push(chunk);
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
    if (combined.length >= 4) break;
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

  // 0. Conversational greetings and pleasantries check FIRST
  const greetingCheck = detectConversationalGreeting(query);
  if (greetingCheck.isGreeting && greetingCheck.reply) {
    return greetingCheck.reply;
  }

  // 1. Meta Query Checks
  const metaCheck = isPlatformOrMetaQuery(query);
  if (metaCheck.isMeta && metaCheck.type === 'laws_catalog') {
    const count = (laws || []).length;
    return `تحتوي قاعدة بيانات «سَنَد» حالياً على **${count}** تشريعاً وقراراً بقانون وملفاً رسمياً معتمداً في دولة فلسطين. تفضل بسؤالك المحدد وسأجيبك فوراً.`;
  }

  if (metaCheck.isMeta && metaCheck.type === 'founder') {
    return `منصة «سَنَد» تأسست وتُدار بإشراف **المستشار القانوني أ. محمد ناصر خليل** (مستشار السياسات الجمركية والتشريعات الضريبية في فلسطين).`;
  }

  if (metaCheck.isMeta && metaCheck.type === 'bot_identity') {
    return `أنا «سَنَد»، المستشار القانوني والتشريعي الذكي لمنظومة القوانين والضرائب والجمارك في دولة فلسطين. تفضل بطرح سؤالك مباشرة.`;
  }

  // 3. Terrorism Financing Penalty (عقوبة تمويل الإرهاب أو غسل الأموال)
  if (/(عقوبة تمويل|عقوبه تمويل|عقوبة غسل|عقوبه غسل|كم عقوبة|ما هي عقوبة|ما عقوبة|عقوبة الارهاب|عقوبة الإرهاب)/i.test(cleaned) && /(ارهاب|إرهاب|تمويل|غسل)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** يعاقب بالسجن مدة لا تقل عن (3) ثلاث سنوات ولا تزيد على (15) خمس عشرة سنة، وبغرامة مالية لا تقل عن (50,000) خمسين ألف دينار أردني ولا تزيد على (100,000) مائة ألف دينار أردني (أو ما يعادلها بالعملة المتداولة قانوناً)، مع مصادرة الأموال والمتحصلات والوسائط المستخدمة.
⚖️ **السند القانوني:** المادة (57) من قرار بقانون رقم (39) لسنة 2022م بشأن مكافحة غسل الأموال وتمويل الإرهاب.`;
  }

  // 3.b Definition of Terrorism Financing (تعريف تمويل الإرهاب أو أركانه)
  if (/(ما هو تمويل|ما معنى تمويل|تعريف تمويل|اركان جريمة|أركان جريمة|مفهوم تمويل)/i.test(cleaned) && /(ارهاب|إرهاب)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** تقديم أو جمع الأموال عمداً بأي وسيلة مباشرة أو غير مباشرة بنية استخدامها أو مع العلم بأنها ستستخدم كلياً أو جزئياً في عمل إرهابي أو من قبل إرهابي أو جماعة إرهابية.
⚖️ **السند القانوني:** المادة (6) من قرار بقانون رقم (39) لسنة 2022م بشأن مكافحة غسل الأموال وتمويل الإرهاب.`;
  }

  // 4. Retroactivity of Laws (مبدأ عدم رجعية القوانين وسريانها)
  if (/(اي قانون جديد من متى|متى يتم تطبيق|ينطبق على الفترة قبل صدوره|باثر رجعي|بأثر رجعي|عدم رجعية|سريان القانون|نفاذ القانون)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** لا تسري القوانين بأثر رجعي على الفترات السابقة؛ بل تطبق فقط من تاريخ نشرها في الجريدة الرسمية (الوقائع الفلسطينية) أو التاريخ المحدد لنفاذها في صلب القانون، على الوقائع والتصرفات اللاحقة لذلك التاريخ فقط.
⚖️ **السند القانوني:** المادة (15) من القانون الأساسي الفلسطيني المعدل لسنة 2003م (مبدأ عدم رجعية القوانين).`;
  }

  // 5. Value Added Tax (VAT) rate (نسبة ضريبة القيمة المضافة)
  if (/(نسبة ضريبة القيمة المضافة|ضريبة القيمة المضافة|نسبة القيمة المضافة|ضريبة القيمه المضافه|كم ضريبة القيمة المضافة|كم نسبة القيمة)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** النسبة القانونية العامة لضريبة القيمة المضافة في دولة فلسطين هي 16% وتطبق على مبيعات السلع والخدمات المحلية والمستوردة.
⚖️ **السند القانوني:** قرارات وتعليمات وزارة المالية والإدارة العامة للجمارك والمكوس وضريبة القيمة المضافة في دولة فلسطين.`;
  }

  // 5.b Makasa Invoices (فواتير المقاصة)
  if (/(فاتورة مقاصة|فاتوره مقاصه|فواتير المقاصة|فواتير مقاصة|نسبة المقاصة)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** تخضع فواتير المقاصة المتبادلة للتنسيق المالي بنسبة 17% لتوحيد المقاصة والخصم المشترك.
⚖️ **السند القانوني:** تعليمات الإدارة العامة للمقاصة والضرائب بوزارة المالية الفلسطينية.`;
  }

  // 6. Income Tax Exemption for Individuals (إعفاء ضريبة الدخل)
  if (/(اعفاء ضريبة الدخل|إعفاء ضريبة الدخل|اعفاءات ضريبة الدخل|إعفاءات ضريبة الدخل|كم اعفاء الموظف|كم إعفاء الموظف|إعفاء الشخص الطبيعي)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** يُمنح الشخص الطبيعي المقيم (الموظف) إعفاءً سنوياً أساسياً قدره (36,000) ستة وثلاثون ألف شيكل سنوياً (بواقع 3,000 شيكل شهرياً) من دخله الإجمالي الخاضع للضريبة.
⚖️ **السند القانوني:** المادة (13) من قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته.`;
  }

  // 6.b Income Tax Brackets (شرائح ضريبة الدخل للأفراد)
  if (/(شرائح ضريبة الدخل|شريحة ضريبة الدخل|نسب ضريبة الدخل|جدول ضريبة الدخل)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** الشرائح الضريبية التصاعدية لدخل الأفراد بعد خصم الإعفاءات هي: من 1 إلى 40,000 شيكل (5%)، ومن 40,001 إلى 80,000 شيكل (10%)، وما زاد عن 80,000 شيكل (15%).
⚖️ **السند القانوني:** المادة (18) من قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته.`;
  }

  // 6.c Corporate Tax (ضريبة الشركات)
  if (/(ضريبة الشركات|ضريبة الشركة|نسبة ضريبة الشركات|ضريبة الشخص المعنوي)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** النسبة الأساسية لضريبة الدخل على الشركات (الشخص المعنوي) هي 15% من صافي الدخل الخاضع للضريبة.
⚖️ **السند القانوني:** قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته.`;
  }

  // 7. Palestinian Labor Law - Annual Leave (الإجازة السنوية)
  if (/(إجازة|اجازة|اجازات|إجازات).*?(سنوي|سنويه|سنوية|عمل)/i.test(cleaned) || /(إجازة سنوية|اجازة سنوية|إجازة العمل|اجازة العمل|الإجازة السنوية|الاجازة السنوية|كم إجازة|كم اجازة|أيام الإجازة|ايام الاجازة)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** يستحق العامل إجازة سنوية مدفوعة الأجر مدتها 14 يوماً عن كل سنة عمل، وتصبح 21 يوماً لمن أمضى 5 سنوات في المنشأة أو للعمال في الأعمال الخطرة أو الضارة بالصحة.
⚖️ **السند القانوني:** المادة (74) من قانون العمل الفلسطيني رقم (7) لسنة 2000م.`;
  }

  // 7.a General Labor Law Summary
  if (/(قانون العمل|حقوق العامل|شروط العمل)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** ينظم قانون العمل الفلسطيني حقوق وواجبات العامل وصاحب العمل: الحد الأقصى لساعات العمل 45 ساعة أسبوعياً، والإجازة السنوية 14 يوماً وتصل إلى 21 يوماً، ومكافأة نهاية الخدمة أجر شهر عن كل سنة عمل.
⚖️ **السند القانوني:** قانون العمل الفلسطيني رقم (7) لسنة 2000م.`;
  }

  // 7.b End of Service (مكافأة نهاية الخدمة)
  if (/(مكافأة نهاية الخدمة|مكافاه نهايه الخدمه|حساب نهاية الخدمة|مكافأة الخدمة)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** يستحق العامل عند انتهاء خدمته مكافأة نهاية خدمة مقدارها أجر شهر عن كل سنة عمل قضاها لدى صاحب العمل، وتُحسب كسور السنة بنسبة ما قضاه منها.
⚖️ **السند القانوني:** المادة (42) من قانون العمل الفلسطيني رقم (7) لسنة 2000م.`;
  }

  // 7.c Working Hours (ساعات العمل)
  if (/(ساعات العمل|ساعات الدوام|كم ساعة عمل|الحد الاقصى لساعات العمل)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** الحد الأقصى لساعات العمل الرسمية الفعلية هو 45 ساعة أسبوعياً موزعة على أيام الأسبوع.
⚖️ **السند القانوني:** المادة (68) من قانون العمل الفلسطيني رقم (7) لسنة 2000م.`;
  }

  // 7.d Probation Period (فترة التجربة)
  if (/(فترة التجربة|فترة تجربة|مدة التجربة|فترة الاختبار)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** لا يجوز أن تزيد فترة التجربة عن 3 أشهر كحد أقصى، ولا يجوز تشغيل العامل تحت التجربة لدى صاحب العمل ذاته أكثر من مرة.
⚖️ **السند القانوني:** المادة (34) من قانون العمل الفلسطيني رقم (7) لسنة 2000م.`;
  }

  // 7.e Maternity Leave (إجازة الأمومة)
  if (/(إجازة أمومة|اجازة امومة|إجازة الأمومة|اجازة الامومة|إجازة وضع|اجازة وضع)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** تستحق المرأة العاملة إجازة أمومة مدفوعة الأجر مدتها 10 أسابيع (70 يوماً).
⚖️ **السند القانوني:** المادة (103) من قانون العمل الفلسطيني رقم (7) لسنة 2000م.`;
  }

  // 8. Postal Parcels & Customs (الطرود البريدية والجمارك)
  if (/(طرد بريدي|طرود بريدية|شحنة شخصية|شحنات شخصية|إعفاء الطرود|اعفاء الطرود)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر:** تُعفى الطرود البريدية والشحنات الشخصية التي لا تتجاوز قيمتها 150 دولار أمريكي من الرسوم الجمركية وضريبة القيمة المضافة بشرط الاستخدام الشخصي وغير التجاري.
⚖️ **السند القانوني:** تعليمات الإدارة العامة للجمارك والمكوس بوزارة المالية الفلسطينية وقانون الجمارك والمكوس رقم (1) لسنة 1962م.`;
  }

  // 9. Specific Article Requested across laws
  const requestedArticle = extractRequestedArticleNumber(query);
  if (requestedArticle) {
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
      const best = matchedChunks[0];
      const timing = extractLawTiming(best.lawTitle, best.text);
      return `🎯 **الجواب المباشر:** ${best.text.trim()}
⚖️ **السند القانوني:** المادة (${requestedArticle}) من ${best.lawTitle} (${timing}) - ${best.sectionHeader}`;
    }
  }

  // 10. General Substantive RAG Search across Database (Answers ONLY from the matched chunk)
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
      if (sc >= 12) {
        allChunks.push({ ...chunk, score: sc });
      }
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));

  if (allChunks.length > 0) {
    const topChunk = allChunks[0];
    const timing = extractLawTiming(topChunk.lawTitle, topChunk.text);
    const sourceInfo = topChunk.sourceFileName ? ` [الملف: ${topChunk.sourceFileName}]` : '';

    return `🎯 **الجواب المباشر:**\n${topChunk.text.trim()}\n\n⚖️ **المصدر المعتمد:** ${topChunk.lawTitle}${sourceInfo} (${timing}) - ${topChunk.sectionHeader}`;
  }

  // 11. Computer Science & Number Systems Guide (Hexadecimal, Binary, Decimal)
  if (/(سداسي عشر|سداسي عشري|hexadecimal|النظم العددية|تحويل من|نظام عشري|نظام ثنائي)/i.test(cleaned)) {
    return `🎯 **الجواب المباشر: كيفية التحويل من النظام السداسي عشر (Hexadecimal) إلى النظام العشري (Decimal):**

في النظام السداسي عشر، الأساس هو **16**، وتُستخدم الرموز من **0 إلى 9** بالإضافة إلى الحروف من **A إلى F** حيث:
• **A = 10** | **B = 11** | **C = 12** | **D = 13** | **E = 14** | **F = 15**

### 📌 خطوات التحويل:
1. نحدد موقع كل خانة بدءاً من اليمين إلى اليسار ابتداءً من الأس **0** ($16^0, 16^1, 16^2, 16^3, ...$).
2. نضرب كل رقم أو حرف (بقيمته العشرية المقابلة) في $16$ مرفوعاً للأس المقابل لموقعه.
3. نجمع النواتج معاً للحصول على العدد النهائي في النظام العشري.

---

### 💡 مثال توضيحي 1: تحويل العدد $(2F)_{16}$ إلى عشري:
• خانة اليمين (F): $15 \times 16^0 = 15 \times 1 = 15$
• خانة اليسار (2): $2 \times 16^1 = 2 \times 16 = 32$
• المجموع: $32 + 15 = 47$
👈 إذن: **$(2F)_{16} = (47)_{10}$**

---

### 💡 مثال توضيحي 2: تحويل العدد $(1A3)_{16}$ إلى عشري:
• الخانة الأولى (3): $3 \times 16^0 = 3 \times 1 = 3$
• الخانة الثانية (A): $10 \times 16^1 = 10 \times 16 = 160$
• الخانة الثالثة (1): $1 \times 16^2 = 1 \times 256 = 256$
• المجموع: $256 + 160 + 3 = 419$
👈 إذن: **$(1A3)_{16} = (419)_{10}$**

⚖️ **المصدر المعتمد:** منهاج تكنولوجيا المعلومات والاتصالات (ICT AR Sec3) - الوحدة الأولى: النظم العددية ومشروع تحويل الأعداد.`;
  }

  // 12. If strictly legal query and not found in knowledge base
  const isLegal = isLegalTaxCustomsQuery(query);
  if (isLegal) {
    return `عذراً، لم أجد نصاً قانونياً يغطي هذا الاستفسار في قاعدة المعرفة المرفقة.`;
  }

  // 13. General query fallback
  return `أهلاً بك! أنا «سَنَد»، مستشارك الذكي المعتمد في دولة فلسطين. تفضل بطرح أي سؤال أو استفسار وسأجيبك بكل دقة وسرور.`;
}
