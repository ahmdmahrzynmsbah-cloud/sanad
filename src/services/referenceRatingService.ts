import { ReferenceEvaluation, ReferenceStats, CitationSource } from '../types';
import { notifySync } from '../utils/sync';

const LOCAL_STORAGE_STATS_KEY = 'sanad_reference_stats_cache';
const LOCAL_STORAGE_EVALS_KEY = 'sanad_user_reference_evaluations';

let inMemoryStats: Record<string, ReferenceStats> = {};
let inMemoryEvaluations: ReferenceEvaluation[] = [];

// Initialize from localStorage and migrate legacy colliding keys
try {
  const cachedStats = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
  if (cachedStats) {
    inMemoryStats = JSON.parse(cachedStats);
  }
  const cachedEvals = localStorage.getItem(LOCAL_STORAGE_EVALS_KEY);
  if (cachedEvals) {
    inMemoryEvaluations = JSON.parse(cachedEvals);
  }

  const LEGACY_BROAD_KEY = '4_اإلدارة_العامة_للضرائب_غير_المباشرة_تعليمات_الفص__sec_التعليمات_و_النماذج_الخاصة_بالقرار_بقانو';
  const MIGRATED_KEY = '4_اإلدارة_العامة_للضرائب_غير_المباشرة_تعليمات__sec_التعليمات_و_النماذج_الخاصة_بالقرار_بقانون_بشأن_ضري_p53_hrhq9i9';

  if (inMemoryStats[LEGACY_BROAD_KEY]) {
    inMemoryStats[MIGRATED_KEY] = {
      ...inMemoryStats[LEGACY_BROAD_KEY],
      referenceKey: MIGRATED_KEY,
    };
    delete inMemoryStats[LEGACY_BROAD_KEY];
    try {
      localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(inMemoryStats));
    } catch {}
  }

  if (Array.isArray(inMemoryEvaluations)) {
    let changed = false;
    inMemoryEvaluations.forEach((e) => {
      if (e.referenceKey === LEGACY_BROAD_KEY) {
        e.referenceKey = MIGRATED_KEY;
        changed = true;
      }
    });
    if (changed) {
      try {
        localStorage.setItem(LOCAL_STORAGE_EVALS_KEY, JSON.stringify(inMemoryEvaluations));
      } catch {}
    }
  }
} catch {}

/**
 * Generate a deterministic hash fingerprint from text snippet to prevent collisions across chunks
 */
export function generateTextFingerprint(text?: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  let hash = 0;
  const sample = trimmed.slice(0, 300);
  for (let i = 0; i < sample.length; i++) {
    hash = (hash << 5) - hash + sample.charCodeAt(i);
    hash |= 0;
  }
  return `_h${Math.abs(hash).toString(36)}`;
}

/**
 * Generate a consistent, deterministic reference key based on law title, article number or section header
 */
export function computeReferenceKey(
  lawTitle: string,
  articleNumber?: string,
  sectionHeader?: string,
  lawId?: string,
  originalText?: string
): string {
  const cleanTitle = (lawTitle || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, '_')
    .slice(0, 45);

  const cleanArticle = (articleNumber || '')
    .trim()
    .replace(/[^\w\d\u0600-\u06FF]+/g, '');

  if (cleanArticle) {
    return `${cleanTitle}__art_${cleanArticle}`;
  }

  // Extract part number or suffix from section header if present (e.g. جزء 53 or مادة 12)
  const partMatch = (sectionHeader || '').match(/(?:جزء|قسم|فقرة|بند|صفحة|مادة)\s*(\d+|[٠-٩]+)/i);
  const partSuffix = partMatch ? `_p${partMatch[1]}` : '';

  // Distinct text fingerprint (hash of text snippet) to guarantee no collisions across chunks
  const textFingerprint = generateTextFingerprint(originalText);

  const cleanHeader = (sectionHeader || '')
    .trim()
    .replace(/[^\w\u0600-\u06FF]+/g, '_')
    .slice(0, 50);

  return `${cleanTitle}__sec_${cleanHeader}${partSuffix}${textFingerprint}`;
}

/**
 * Fetch all reference stats and evaluations from server
 */
export async function fetchReferenceRatings(): Promise<{
  evaluations: ReferenceEvaluation[];
  stats: Record<string, ReferenceStats>;
}> {
  try {
    const res = await fetch('/api/references/ratings');
    if (res.ok) {
      const data = await res.json();
      if (data.stats) {
        inMemoryStats = { ...inMemoryStats, ...data.stats };
        try {
          localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(inMemoryStats));
        } catch {}
      }
      if (Array.isArray(data.evaluations)) {
        inMemoryEvaluations = data.evaluations;
        try {
          localStorage.setItem(LOCAL_STORAGE_EVALS_KEY, JSON.stringify(inMemoryEvaluations));
        } catch {}
      }
      return data;
    }
  } catch (err) {
    console.warn('[ReferenceRating] Network error fetching ratings, using local cache:', err);
  }

  return {
    evaluations: inMemoryEvaluations,
    stats: inMemoryStats,
  };
}

/**
 * Submit a rating & accuracy evaluation for a citation reference.
 * Marks it as the most accurate answer and trains the chatbot.
 */
export async function submitReferenceEvaluation(params: {
  citation: CitationSource;
  query: string;
  rating: number; // 1 to 5
  isMostAccurate: boolean;
  feedbackTag?: string;
  notes?: string;
  userId?: string;
  username?: string;
}): Promise<{ success: boolean; stats: ReferenceStats; message: string }> {
  const { citation, query, rating, isMostAccurate, feedbackTag, notes, userId, username } = params;

  const refKey =
    citation.referenceKey ||
    computeReferenceKey(
      citation.lawTitle,
      citation.articleNumber,
      citation.sectionHeader,
      citation.lawId,
      citation.originalText
    );

  const newEval: ReferenceEvaluation = {
    id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    referenceKey: refKey,
    query: query || '',
    normalizedQuery: (query || '').trim().toLowerCase(),
    lawId: citation.lawId,
    lawTitle: citation.lawTitle,
    articleNumber: citation.articleNumber,
    sectionHeader: citation.sectionHeader,
    sourceFileName: citation.sourceFileName,
    originalText: citation.originalText,
    rating: Math.min(5, Math.max(1, rating)),
    isMostAccurate: Boolean(isMostAccurate),
    feedbackTag,
    notes,
    userId,
    username,
    timestamp: new Date().toISOString(),
  };

  // Immediate local update
  inMemoryEvaluations = [newEval, ...inMemoryEvaluations.filter((e) => !(e.referenceKey === refKey && e.query === query && e.userId === userId))];
  
  const currentStat = inMemoryStats[refKey] || {
    referenceKey: refKey,
    lawTitle: citation.lawTitle,
    articleNumber: citation.articleNumber,
    sectionHeader: citation.sectionHeader,
    totalRatings: 0,
    averageRating: 5,
    ratingsSum: 0,
    mostAccurateVotes: 0,
    associatedQueries: [],
    lastRatedAt: new Date().toISOString(),
  };

  const newTotalRatings = currentStat.totalRatings + 1;
  const newRatingsSum = currentStat.ratingsSum + rating;
  const newAvg = Number((newRatingsSum / newTotalRatings).toFixed(1));
  const newAccurateVotes = currentStat.mostAccurateVotes + (isMostAccurate ? 1 : 0);
  const updatedQueries = Array.from(new Set([...(currentStat.associatedQueries || []), query].filter(Boolean)));

  const updatedStats: ReferenceStats = {
    ...currentStat,
    totalRatings: newTotalRatings,
    ratingsSum: newRatingsSum,
    averageRating: newAvg,
    mostAccurateVotes: newAccurateVotes,
    associatedQueries: updatedQueries,
    lastRatedAt: new Date().toISOString(),
  };

  inMemoryStats[refKey] = updatedStats;

  try {
    localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(inMemoryStats));
    localStorage.setItem(LOCAL_STORAGE_EVALS_KEY, JSON.stringify(inMemoryEvaluations));
  } catch {}

  notifySync('reference_ratings');

  // Send to backend for server persistence and RAG learning
  try {
    const res = await fetch('/api/references/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newEval,
        referenceId: citation.id,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.stats) {
        inMemoryStats[refKey] = data.stats;
        try {
          localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(inMemoryStats));
        } catch {}
      }
      return {
        success: true,
        stats: data.stats || updatedStats,
        message: 'تم حفظ التقييم بنجاح وتعلّم المساعد الذكي هذا المرجع.',
      };
    }
  } catch (err) {
    console.warn('[ReferenceRating] Server error, saved in client storage:', err);
  }

  return {
    success: true,
    stats: updatedStats,
    message: 'تم حفظ التقييم محلياً وسيعتمده المساعد الذكي في الإجابات.',
  };
}

/**
 * Retrieve stats for a specific reference
 */
export function getCachedReferenceStats(refKey: string): ReferenceStats | undefined {
  return inMemoryStats[refKey];
}

/**
 * Check if the user has already rated this reference for this query or generally
 */
export function getUserEvaluationForReference(
  refKey: string,
  userId?: string
): { rating?: number; isMostAccurate?: boolean; evaluation?: ReferenceEvaluation } {
  const found = inMemoryEvaluations.find(
    (e) => e.referenceKey === refKey && (!userId || e.userId === userId)
  );

  if (found) {
    return {
      rating: found.rating,
      isMostAccurate: found.isMostAccurate,
      evaluation: found,
    };
  }

  return {};
}

/**
 * Get all evaluations for admin view or learning inspection
 */
export function getAllEvaluations(): ReferenceEvaluation[] {
  return inMemoryEvaluations;
}

/**
 * Get all reference stats
 */
export function getAllReferenceStats(): Record<string, ReferenceStats> {
  return inMemoryStats;
}
