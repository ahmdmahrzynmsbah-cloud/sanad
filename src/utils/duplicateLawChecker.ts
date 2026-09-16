/**
 * Duplicate Law & Document Checker Utility
 * Prevents uploading or saving duplicate files, titles, or identical content to the Palestinian legal knowledge base.
 */

export interface LawCandidate {
  fileName?: string;
  title?: string;
  content?: string;
}

export interface LawReference {
  id: string;
  title: string;
  sourceFileName?: string;
  content?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedLaw?: LawReference;
  reason?: 'exact_filename' | 'normalized_filename' | 'exact_title' | 'normalized_title' | 'identical_content';
  message?: string;
}

/**
 * Normalizes Arabic and legal text for robust comparison:
 * - Strips file extensions
 * - Removes diacritics / tashkeel & tatweel
 * - Normalizes Alef (أ إ آ ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Yaa (ى -> ي, ئ -> ي)
 * - Normalizes Waw (ؤ -> و)
 * - Removes non-alphanumeric punctuation and collapses whitespace
 */
export function normalizeLegalText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\.(pdf|docx|doc|pptx|ppt|txt)$/i, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, ' ') // replace symbols/punctuation with space
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Checks if a file, title, or content already exists in the given knowledge base laws list
 */
export function findDuplicateLaw(
  candidate: LawCandidate,
  existingLaws: LawReference[]
): DuplicateCheckResult {
  if (!existingLaws || existingLaws.length === 0) {
    return { isDuplicate: false };
  }

  const rawFileNameLower = candidate.fileName ? candidate.fileName.trim().toLowerCase() : '';
  const rawTitleLower = candidate.title ? candidate.title.trim().toLowerCase() : '';
  const normCandidateFileName = candidate.fileName ? normalizeLegalText(candidate.fileName) : '';
  const normCandidateTitle = candidate.title ? normalizeLegalText(candidate.title) : '';

  for (const law of existingLaws) {
    const lawFileNameLower = law.sourceFileName ? law.sourceFileName.trim().toLowerCase() : '';
    const lawTitleLower = law.title ? law.title.trim().toLowerCase() : '';
    const normLawFileName = law.sourceFileName ? normalizeLegalText(law.sourceFileName) : '';
    const normLawTitle = normalizeLegalText(law.title);

    // 1. Exact raw filename match
    if (rawFileNameLower && lawFileNameLower && rawFileNameLower === lawFileNameLower) {
      return {
        isDuplicate: true,
        matchedLaw: law,
        reason: 'exact_filename',
        message: `هذا الملف موجود بالفعل في قاعدة المعرفة بعنوان "${law.title}" (اسم الملف: ${law.sourceFileName})، ولا يمكن إعادة رفعه.`,
      };
    }

    // 2. Normalized filename match
    if (
      normCandidateFileName &&
      normLawFileName &&
      normCandidateFileName.length >= 3 &&
      normCandidateFileName === normLawFileName
    ) {
      return {
        isDuplicate: true,
        matchedLaw: law,
        reason: 'normalized_filename',
        message: `هذا الملف موجود بالفعل في قاعدة المعرفة بعنوان "${law.title}"، ولا يمكن إعادة رفعه.`,
      };
    }

    // 3. Candidate filename matches law title
    if (
      normCandidateFileName &&
      normLawTitle &&
      normCandidateFileName.length >= 3 &&
      normCandidateFileName === normLawTitle
    ) {
      return {
        isDuplicate: true,
        matchedLaw: law,
        reason: 'normalized_title',
        message: `هذا الملف موجود بالفعل في قاعدة المعرفة بعنوان "${law.title}"، ولا يمكن إعادة رفعه.`,
      };
    }

    // 4. Exact title match
    if (rawTitleLower && lawTitleLower && rawTitleLower === lawTitleLower) {
      return {
        isDuplicate: true,
        matchedLaw: law,
        reason: 'exact_title',
        message: `هذا التشريع موجود بالفعل في قاعدة المعرفة بعنوان "${law.title}"، ولا يمكن تكراره.`,
      };
    }

    // 5. Normalized title match
    if (
      normCandidateTitle &&
      normLawTitle &&
      normCandidateTitle.length >= 3 &&
      normCandidateTitle === normLawTitle
    ) {
      return {
        isDuplicate: true,
        matchedLaw: law,
        reason: 'normalized_title',
        message: `هذا التشريع موجود بالفعل في قاعدة المعرفة بعنوان "${law.title}"، ولا يمكن تكراره.`,
      };
    }

    // 6. Content matching (if substantial content is provided on both sides)
    if (
      candidate.content &&
      law.content &&
      candidate.content.length > 150 &&
      law.content.length > 150
    ) {
      const sampleCand = normalizeLegalText(candidate.content.substring(0, 800));
      const sampleLaw = normalizeLegalText(law.content.substring(0, 800));
      if (sampleCand.length > 50 && sampleCand === sampleLaw) {
        return {
          isDuplicate: true,
          matchedLaw: law,
          reason: 'identical_content',
          message: `محتوى هذا المستند متطابق مع التشريع الموجود مسبقاً بعنوان "${law.title}"، ولا يمكن تكراره.`,
        };
      }
    }
  }

  return { isDuplicate: false };
}
