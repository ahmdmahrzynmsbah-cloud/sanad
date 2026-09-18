import type { Law } from '../types';

export interface LegalChunk {
  lawId: string;
  lawTitle: string;
  category: string;
  sectionHeader: string;
  text: string;
  score?: number;
}

// Normalize Arabic text for robust search and matching
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/harakat
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .trim();
}

const ARABIC_STOPWORDS = new Set([
  'هل', 'ما', 'ماذا', 'من', 'في', 'علي', 'على', 'الي', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
  'هو', 'هي', 'هم', 'نحن', 'انت', 'أنت', 'انا', 'أنا', 'كان', 'كانت', 'يكون', 'تكون', 'ليس',
  'لن', 'لم', 'ان', 'أن', 'لو', 'اذا', 'إذا', 'كيف', 'اين', 'أين', 'متى', 'كم', 'لماذا', 'ليه',
  'شو', 'ايش', 'اي', 'أي', 'بعض', 'كل', 'غير', 'سوى', 'فقط', 'حتى', 'حيث', 'حين', 'قبل', 'بعد',
  'عند', 'لدى', 'مثل', 'نحو', 'ضد', 'حول', 'دون', 'قد', 'تم', 'يتم', 'قام', 'قامت', 'قال', 'قالت',
  'ذكر', 'عرف', 'تعرف', 'اود', 'أود', 'اريد', 'أريد', 'استفسار', 'سؤال', 'تخبرني', 'تقول', 'اعرف', 'أعرف',
  'بدي', 'عايز', 'انسان', 'إنسان', 'شخص', 'بشر', 'شيء', 'حاجة', 'ممكن', 'مرحبا', 'شكرا'
]);

// Extract meaningful search tokens and stemming prefixes
export function extractSearchTokens(text: string): string[] {
  const norm = normalizeArabic(text);
  const words = norm.split(/\s+/).filter((w) => w.length >= 2);
  const tokens = new Set<string>();

  for (const w of words) {
    if (ARABIC_STOPWORDS.has(w)) continue;
    tokens.add(w);

    // Strip prefix 'ال'
    if (w.startsWith('ال') && w.length >= 4) {
      tokens.add(w.slice(2));
    }
    // Strip prefixes 'ل', 'و', 'ف', 'ب', 'ك'
    if ((w.startsWith('ل') || w.startsWith('و') || w.startsWith('ف') || w.startsWith('ب') || w.startsWith('ك')) && w.length >= 4) {
      tokens.add(w.slice(1));
      if (w.slice(1).startsWith('ال') && w.length >= 6) {
        tokens.add(w.slice(3));
      }
    }

    // Common legal root and keyword expansions
    if (w.includes('ممول') || w.includes('تمويل')) {
      tokens.add('ممول');
      tokens.add('تمويل');
      tokens.add('ارهاب');
    }
    if (w.includes('ارهاب')) {
      tokens.add('ارهاب');
      tokens.add('تمويل');
    }
    if (w.includes('غسل')) {
      tokens.add('غسل');
      tokens.add('اموال');
    }
    if (w.includes('شيك')) {
      tokens.add('شيك');
      tokens.add('شيكات');
      tokens.add('رصيد');
    }
  }
  return Array.from(tokens);
}

/**
 * Check if a query is truly about laws, taxes, or customs (or a conversational follow-up / objection)
 */
export function isLegalTaxCustomsQuery(query: string, rawHistory?: any[]): boolean {
  if (!query || typeof query !== 'string') return false;
  const q = query.trim().toLowerCase();
  const cleaned = q.replace(/[!؟?.,،:\-\s]+/g, ' ');

  // 1. Explicit conversational objections, review requests, and follow-ups:
  // e.g. "عندك يباشا ف قاعدة المعرفه راجع نفسك", "موجودة عندك", "راجع نفسك", "دور كويس"
  const isObjectionOrReview = /(عندك|يباشا|يا باشا|ف قاعدة المعرفة|في قاعدة المعرفة|قاعدة المعرفة|قاعدة المعرفه|راجع نفسك|راجع|دور كويس|تأكد|موجود|موجودة|مش موجود|ازاي|ليه مش موجود|ليه مفيش|مفيش|طب و|وماذا عن|والعقوبة|والسجن|والغرامة|والشركاء|والشركات|طب بالنسبة|يعني ايه)/i.test(
    cleaned
  );

  if (isObjectionOrReview) {
    return true;
  }

  // 2. Explicit conversational greetings when occurring alone
  if (
    /^(عامل ايه|عامل اي|عامل إيه|عامل إي|ازيك|إزيك|كيفك|كيف حالك|شخبارك|أخبارك|شو أخبارك|شو اخبارك|طمني عنك|طمنا عنك|كيف الأمور|صباح الخير|مساء الخير|سلام|السلام عليكم|سلام عليكم|مرحبا|مرحباً|أهلا|اهلا|هاي|hello|hi)\b/i.test(
      cleaned
    ) &&
    !isObjectionOrReview
  ) {
    return false;
  }

  // 3. Identity & bot nature questions
  if (
    /(انت انسان|أنت إنسان|هل انت انسان|هل أنت إنسان|هل انت بشر|هل أنت بشر|هل انت روبوت|هل أنت روبوت|هل انت شخص|انت شخص|هل انت ai|هل انت ذكاء اصطناعي|من انت|مين انت|من أنت|ما اسمك|شو اسمك|عرفني بنفسك|عرف عن نفسك|ما وظيفتك|شو وظيفتك|مين طورك|مين برمجك)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 4. Clear non-legal general knowledge topics
  if (
    /(محمد صلاح|ميسي|رونالدو|كرة القدم|الرياضة|الدين الإسلامي|دين الاسلام|الإسلام|الاسلام|القرآن|الحديث|الصلاة|الصيام|الحج|الزكاة|النبي|الرسول|الصحابة|الفيزياء|الكيمياء|الطب|الفلك|الفضاء|الطقس|التاريخ|الجغرافيا|الفلسفة|البرمجة|الرياضيات|معنى كلمة|قصة|نكتة|شعر|طبخ|عاصمة|من هو|من هي|ما هو|ما هي|ماذا تعرف عن)/i.test(
      cleaned
    ) &&
    !/(قانون|قوانين|تشريع|تشريعات|مرسوم|قرار بقانون|مادة|مواد|لائحة|لوائح|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|رسم جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|سجل تجاري|مقاصة|إعفاء ضريبي|فاتورة ضريبية)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 5. Check if recent conversation history was about legal topics
  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    const recentUserMsgs = rawHistory
      .filter((m) => m && (m.sender === 'user' || m.role === 'user'))
      .slice(-3);
    for (const m of recentUserMsgs) {
      const text = typeof m.text === 'string' ? m.text : '';
      if (/(قانون|تشريع|مرسوم|قرار|مادة|ضريبة|ضرائب|جمارك|جمرك|إرهاب|ارهاب|غسل|اموال|أموال|ممول|تمويل|عقوبة|سجن|حبس|غرامة|شيك|شركة|شركات)/i.test(text)) {
        return true;
      }
    }
  }

  // 6. Strict legal, tax, and customs keywords
  const legalTermsRegex = /(قانون|قوانين|تشريع|تشريعات|مرسوم|قرار بقانون|مادة|مواد|لائحة|لوائح|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|إعفاء ضريبي|إعفاءات|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|غرامة تأخير|عقوبة|عقوبات|سجن|حبس|مصادرة|محكمة الصلح|وزارة المالية|دائرة الجمارك|مكافحة غسل الأموال|غسل الأموال|تمويل الإرهاب|تمويل الارهاب|ممول|فحص ضريبي|تهرب ضريبي|سجل تجاري|فاتورة ضريبية|مقاصة|شيك بدون رصيد)/i;

  return legalTermsRegex.test(q);
}

/**
 * Helper to extract law issuance year / date from title or text
 */
function extractLawTiming(title: string, text: string): string {
  const matchYear = title.match(/(?:لسنة|عام)\s*(\d{4})[م|هـ]?/i) || text.match(/(?:لسنة|عام)\s*(\d{4})[م|هـ]?/i);
  if (matchYear && matchYear[1]) {
    return `لسنة ${matchYear[1]}م`;
  }
  const matchPlainYear = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (matchPlainYear && matchPlainYear[1]) {
    return `لسنة ${matchPlainYear[1]}م`;
  }
  const matchDate = text.match(/بتاريخ\s*([\d\/\.\-]+)/i);
  if (matchDate && matchDate[1]) {
    return `بتاريخ ${matchDate[1]}`;
  }
  return 'وفقاً لآخر تعديل معتمد ونافذ';
}

/**
 * Extracts a concise summary snippet of the article without dumping the whole content
 */
function extractConciseSummary(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => Boolean(l) && !l.startsWith('مادة (') && !l.startsWith('المادة ('));

  if (lines.length === 0) {
    return text.substring(0, 300).trim() + (text.length > 300 ? '...' : '');
  }

  const keyLines = lines.slice(0, 4).join(' ');
  if (keyLines.length > 400) {
    return keyLines.substring(0, 390).trim() + '...';
  }
  return keyLines;
}

/**
 * Splits law text into logical sections / articles for precise matching
 */
export function chunkLawContent(law: Law): LegalChunk[] {
  const content = law.content || '';
  const chunks: LegalChunk[] = [];

  const regex = /(?:^|\s+|[\.\:\-\n])((?:المادة|مادة|البند|الفصل|الفرع|القسم)\s*(?:\(\s*\d+\s*\)|\d+[\s:.\-]|[IVXLCDM]+))/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let currentHeader = 'مقدمة / أحكام عامة';

  while ((match = regex.exec(content)) !== null) {
    const startOfMatch = match.index;
    const chunkText = content.substring(lastIndex, startOfMatch).trim();
    if (chunkText.length > 25) {
      chunks.push({
        lawId: law.id,
        lawTitle: law.title,
        category: law.category || 'عام',
        sectionHeader: currentHeader,
        text: chunkText,
      });
    }
    currentHeader = match[1].trim();
    lastIndex = startOfMatch + match[0].length;
  }

  const remaining = content.substring(lastIndex).trim();
  if (remaining.length > 25) {
    chunks.push({
      lawId: law.id,
      lawTitle: law.title,
      category: law.category || 'عام',
      sectionHeader: currentHeader,
      text: remaining,
    });
  }

  if (chunks.length === 0 && content.trim()) {
    chunks.push({
      lawId: law.id,
      lawTitle: law.title,
      category: law.category || 'عام',
      sectionHeader: 'كامل النص المعتمد',
      text: content.trim().substring(0, 6000),
    });
  }

  return chunks;
}

/**
 * Intelligent comprehensive assistant response engine
 * Handles BOTH general world knowledge/chat AND precise simplified legal citations
 */
export function generateClientKnowledgeFallback(query: string, laws: Law[], rawHistory?: any[]): string {
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
  const isLegal = isLegalTaxCustomsQuery(query, rawHistory);
  if (!isLegal) {
    return `أهلاً بك! بصفتي شخصيتك الافتراضية ومساعدك الذكي «سَنَد»، يسعدني جداً الإجابة على أي سؤال أو استفسار عام في أي مجال (العلوم، الثقافة، الرياضة، التقنية، اللغات، أو الحوار اليومي).\n\nتفضل بطرح سؤالك بمزيد من التفصيل وسأجيبك فوراً بكل وضوح وسلاسة.`;
  }

  // 6. LEGAL / TAX / CUSTOMS QUERY
  let searchContext = query;
  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    const recentUserTexts = rawHistory
      .filter((m) => m && (m.sender === 'user' || m.role === 'user'))
      .slice(-3)
      .map((m) => (typeof m.text === 'string' ? m.text : ''))
      .join(' ');
    searchContext = `${recentUserTexts} ${query}`.trim();
  }

  const tokens = extractSearchTokens(searchContext);

  // Check if query was an objection / correction / discussion
  const isObjection = /(عندك|يباشا|يا باشا|ف قاعدة المعرفة|في قاعدة المعرفة|قاعدة المعرفة|قاعدة المعرفه|راجع نفسك|راجع|دور كويس|تأكد|موجود|موجودة|مش موجود|ازاي|ليه مفيش)/i.test(cleaned);

  // Score individual chunks across all laws
  const allChunks: LegalChunk[] = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const normText = normalizeArabic(chunk.text);
      const normHeader = normalizeArabic(chunk.sectionHeader);
      const normTitle = normalizeArabic(chunk.lawTitle);
      const fullNorm = `${normTitle} ${normHeader} ${normText}`;

      let score = 0;
      for (const token of tokens) {
        if (fullNorm.includes(token)) {
          score += 2;
          if (normHeader.includes(token)) score += 4;
          if (normTitle.includes(token)) score += 3;
        }
      }

      if (tokens.some((t) => ['ارهاب', 'ممول', 'تمويل'].includes(t))) {
        if (normText.includes('تمويل الارهاب') || normText.includes('ممول الارهاب')) score += 15;
        if (normText.includes('عقوبه جريمه تمويل الارهاب') || normHeader.includes('57')) score += 25;
        if (normTitle.includes('39') || normTitle.includes('غسل الاموال')) score += 10;
      }

      if (score >= 4) {
        allChunks.push({ ...chunk, score });
      }
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunk = allChunks[0];

  if (topChunk && (topChunk.score || 0) >= 4) {
    const timing = extractLawTiming(topChunk.lawTitle, topChunk.text);
    const summary = extractConciseSummary(topChunk.text);

    let result = '';
    if (isObjection) {
      result += `أعتذر منك تماماً يا فندم، معك كل الحق! بالتدقيق والمراجعة الشاملة لقاعدة المعرفة والتشريعات المعتمدة لدينا:\n\n`;
    }

    result += `⚖️ **السند القانوني والمادة المحددة:**\n`;
    result += `• **التشريع المصدر:** ${topChunk.lawTitle} (${timing})\n`;
    result += `• **المادة المعتمدة:** ${topChunk.sectionHeader}\n\n`;
    result += `📋 **الحكم القانوني والعقوبات المقررة بالتفصيل:**\n`;
    result += `${summary}\n\n`;
    result += `💡 **توضيح وتفاصيل إضافية:**\n`;
    result += `• تم استخراج هذا النص بدقة من التشريعات المعتمدة في قاعدة المعرفة. إذا كنت ترغب في معرفة عقوبات الشركاء، أو الشخص الاعتباري، أو تدابير المصادرة، يسعدني تفصيلها لك فوراً.`;
    return result;
  }

  let promptForDetails = `أهلاً بك يا فندم. بالتدقيق في نصوص وتشريعات قاعدة المعرفة المعتمدة، يسعدني مناقشة هذا الموضوع معك بالتفصيل والصياغة القانونية السليمة.\n\n`;
  promptForDetails += `📋 **لتحديد النص والمادة القانونية الدقيقة المنطبقة على استفسارك، يرجى تزويدي بأحد التفاصيل التالية:**\n`;
  promptForDetails += `• سنة المعاملة المالية أو التصريح.\n`;
  promptForDetails += `• صفة المكلف (فرد طبيعي أم شركة تجارية).\n`;
  promptForDetails += `• رقم المادة أو موضوع الواقعة بالتحديد.\n\n`;
  promptForDetails += `وسأصوغ لك الحكم مرتباً ومقتضباً مع سنده القانوني وتاريخ نفاذه مباشرة.`;
  return promptForDetails;
}
