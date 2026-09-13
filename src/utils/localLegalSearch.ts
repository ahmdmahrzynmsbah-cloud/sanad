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
 * Intelligent client-side legal retrieval fallback when server / API is unavailable
 */
export function generateClientKnowledgeFallback(query: string, laws: Law[]): string {
  const trimmed = query.trim().toLowerCase();

  // 1. Polite greetings & conversational check-ins
  if (
    /^(سلام|السلام عليكم|سلام عليكم|مرحبا|أهلا|اهلا|مرحباً|صباح الخير|مساء الخير|هاي|hello|hi)\b/i.test(trimmed) ||
    trimmed === 'سلام' ||
    trimmed === 'سلام عليكم' ||
    trimmed === 'السلام عليكم'
  ) {
    return `وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك في منصة «سَنَد». يسعدني جداً التواصل معك، كيف أستطيع مساعدتك اليوم؟`;
  }
  if (/^(عامل ايه|عامل إيه|كيفك|كيف حالك|ازيك|إزيك|شخبارك|أخبارك|شو أخبارك|شو اخبارك)/i.test(trimmed)) {
    return `الحمد لله بألف خير ونعمة، تسلم على سؤالك ولطفك! أرجو أن تكون بأفضل صحة وعافية. تفضل بأي سؤال أو استفسار وسأجيبك بكل سرور.`;
  }
  if (/^(شكرا|شكراً|تسلم|مشكور|الله يبارك فيك|يعطيك العافية|يسلمو)/i.test(trimmed)) {
    return `العفو يا غالي، على الرحب والسعة دائماً! أنا في خدمتك في أي وقت لأي سؤال أو استفسار.`;
  }
  if (/^(مين انت|من انت|ما وظيفتك|عرف عن نفسك|شو بتعمل)/i.test(trimmed)) {
    return `أنا «سَنَد»، مساعدك الذكي ومستشارك المتخصص في القوانين والأنظمة الفلسطينية والضرائب والجمارك والاستفسارات المتنوعة. أنا هنا للإجابة على جميع تساؤلاتك ومساعدتك في أي وقت.`;
  }

  const normalizedQuery = query.toLowerCase();
  const keywords = normalizedQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    return `مرحباً بك! يرجى كتابة سؤالك أو رقم المادة القانونية التي ترغب في الاستفسار عنها.`;
  }

  // Score chunks across available laws
  const allChunks: LegalChunk[] = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + ' ' + chunk.category + ' ' + chunk.sectionHeader + ' ' + chunk.text).toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (fullText.includes(word)) score += 1;
      }
      chunk.score = score;
      if (score > 0) allChunks.push(chunk);
    }
  }

  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunk = allChunks[0];

  if (topChunk && (topChunk.score || 0) > 0) {
    let result = `**${topChunk.lawTitle}** [${topChunk.sectionHeader}]:\n\n`;
    result += `${topChunk.text}\n\n`;
    result += `*(المرجع: ${topChunk.lawTitle} - التشريعات الرسمية في فلسطين)*`;
    return result;
  }

  return `لم يتم العثور على نص صريح ومباشر لهذا الاستفسار في قاعدة القوانين المحفوظة حالياً (${laws.length} تشريع متاح). يمكنك تحديد رقم المادة أو اسم القانون بدقة.`;
}
