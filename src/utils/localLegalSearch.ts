import type { Law } from '../types';

export interface LegalChunk {
  lawId: string;
  lawTitle: string;
  category: string;
  sectionHeader: string;
  text: string;
  score?: number;
}

/**
 * Check if a query is truly about laws, taxes, or customs
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
    !/(قانون|قوانين|تشريع|تشريعات|مرسوم|قرار بقانون|مادة|مواد|لائحة|لوائح|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|رسم جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|سجل تجاري|مقاصة|إعفاء ضريبي|فاتورة ضريبية)/i.test(
      cleaned
    )
  ) {
    return false;
  }

  // 4. Strict legal & tax keywords
  const legalTermsRegex = /(قانون|قوانين|تشريع|تشريعات|مرسوم|قرار بقانون|مادة|مواد|لائحة|لوائح|ضريبة|ضرائب|ضريبي|ضريبية|جمارك|جمرك|جمركي|جمركية|بيان جمركي|رسوم جمركية|تعرفة جمركية|طرد بريدي|إعفاء ضريبي|إعفاءات|دخل كلي|ضريبة دخل|قيمة مضافة|مكوس|غرامة تأخير|عقوبة|محكمة الصلح|وزارة المالية|دائرة الجمارك|مكافحة غسل الأموال|فحص ضريبي|تهرب ضريبي|سجل تجاري|فاتورة ضريبية|مقاصة)/i;

  return legalTermsRegex.test(q);
}

/**
 * Helper to extract law issuance year / date from title or text
 */
function extractLawTiming(title: string, text: string): string {
  // Check for "لسنة 2022م" or "لسنة 2011"
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
    return text.substring(0, 180).trim() + (text.length > 180 ? '...' : '');
  }

  // Take the first 2-3 essential lines
  const keyLines = lines.slice(0, 3).join(' ');
  if (keyLines.length > 250) {
    return keyLines.substring(0, 240).trim() + '...';
  }
  return keyLines;
}

/**
 * Splits law text into logical sections / articles for precise matching
 */
export function chunkLawContent(law: Law): LegalChunk[] {
  const text = law.content || '';
  const chunks: LegalChunk[] = [];

  const rawSections = text.split(/(?=(?:المادة|مادة|الباب|الفصل|أولاً|ثانياً|ثالثاً|رابعاً|خامساً)\s*[\d\(\)]+)/i);

  for (const rawSec of rawSections) {
    const trimmed = rawSec.trim();
    if (!trimmed) continue;

    const firstLineEnd = trimmed.indexOf('\n');
    let header = firstLineEnd !== -1 ? trimmed.substring(0, firstLineEnd).trim() : trimmed.substring(0, 50).trim();
    if (header.length > 60) header = header.substring(0, 60) + '...';

    if (trimmed.length > 2500) {
      const paragraphs = trimmed.split(/\n\s*\n/);
      let currentSub = '';
      let partIdx = 1;
      for (const p of paragraphs) {
        if ((currentSub + '\n' + p).length > 2000) {
          if (currentSub.trim()) {
            chunks.push({
              lawId: law.id,
              lawTitle: law.title,
              category: law.category || 'جمارك',
              sectionHeader: `${header} (جزء ${partIdx})`,
              text: currentSub.trim(),
            });
            partIdx++;
          }
          currentSub = p;
        } else {
          currentSub += (currentSub ? '\n' : '') + p;
        }
      }
      if (currentSub.trim()) {
        chunks.push({
          lawId: law.id,
          lawTitle: law.title,
          category: law.category || 'جمارك',
          sectionHeader: `${header} (جزء ${partIdx})`,
          text: currentSub.trim(),
        });
      }
    } else {
      chunks.push({
        lawId: law.id,
        lawTitle: law.title,
        category: law.category || 'جمارك',
        sectionHeader: header,
        text: trimmed,
      });
    }
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push({
      lawId: law.id,
      lawTitle: law.title,
      category: law.category || 'جمارك',
      sectionHeader: 'كامل النص',
      text: text.trim().substring(0, 3000),
    });
  }

  return chunks;
}

/**
 * Intelligent comprehensive assistant response engine
 * Handles BOTH general world knowledge/chat AND precise simplified legal citations
 */
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
  const normalizedQuery = query.toLowerCase();
  const keywords = normalizedQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['قانون', 'مرسوم', 'سنة', 'قرار', 'مادة'].includes(w));

  if (keywords.length === 0) {
    return `📋 **يرجى تزويدي بالتفاصيل الإضافية التالية قبل العرض:**\n1. سنة المعاملة المالية أو الضريبية.\n2. صفة المكلف (فرد طبيعي أم شركة).\n3. نوع السلعة أو الخدمة موضوع الاستفسار.\n\nتفضل بتحديد هذه التفاصيل وسأصوغ لك الحكم القانوني بدقة مع ذكر المادة والقانون المصدر.`;
  }

  // Score chunks across available laws
  const allChunks: LegalChunk[] = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + ' ' + chunk.category + ' ' + chunk.sectionHeader + ' ' + chunk.text).toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (fullText.includes(word)) {
          score += 1;
          if (chunk.sectionHeader.toLowerCase().includes(word) || chunk.lawTitle.toLowerCase().includes(word)) {
            score += 2;
          }
        }
      }
      chunk.score = score;
      if (score >= 2) allChunks.push(chunk);
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunk = allChunks[0];

  if (topChunk && (topChunk.score || 0) >= 2) {
    const timing = extractLawTiming(topChunk.lawTitle, topChunk.text);
    const summary = extractConciseSummary(topChunk.text);

    let result = `📋 **لتحديد الحكم الدقيق لحالتك الخاصة، يرجى تزويدي بالتفاصيل الإضافية التالية أولاً:**\n`;
    result += `• **سنة المعاملة:** (لتحديد النظام المالي أو جدول الشرائح الساري في تلك السنة).\n`;
    result += `• **صفة المكلف:** (هل أنت فرد طبيعي/موظف أم شركة تجارية/مساهمة؟).\n`;
    result += `• **طبيعة النشاط أو السلعة:** (لتطبيق الإعفاءات أو النسب الخاصة بالنشاط).\n\n`;
    result += `---\n\n`;
    result += `⚖️ **السند القانوني والمادة المحددة:**\n`;
    result += `• **القانون المصدر:** ${topChunk.lawTitle} (${timing})\n`;
    result += `• **المادة المحددة:** ${topChunk.sectionHeader}\n\n`;
    result += `💡 **خلاصة الحكم القانوني باختصار:**\n`;
    result += `${summary}\n\n`;
    result += `*(تم استخراج السند والمادة باختصار وبشكل مرتب دون الحاجة لسرد مجلدات القانون كاملة)*`;
    return result;
  }

  let promptForDetails = `📋 **لتحديد الحكم الدقيق لحالتك الخاصة، يرجى تزويدي بالتفاصيل الإضافية التالية:**\n`;
  promptForDetails += `• سنة المعاملة المالية أو التصريح.\n`;
  promptForDetails += `• صفة المكلف (فرد طبيعي أم شركة).\n`;
  promptForDetails += `• رقم المادة أو المعاملة الجمركية/الضريبية المستهدفة.\n\n`;
  promptForDetails += `⚖️ **إفادة استشارية أولية:** لم يتم العثور على مادة مطابقة تماماً بهذا اللفظ في قاعدة التشريعات المسجلة حالياً. بمجرد تزويدنا بالتفاصيل أعلاه سنصيغ لك الحكم مرتباً ومقتضباً مع سنده القانوني مباشرة.`;
  return promptForDetails;
}
