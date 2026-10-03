import { ReferenceEvaluation, ReferenceStats, CitationSource } from '../types';
import { notifySync } from '../utils/sync';

const LOCAL_STORAGE_STATS_KEY = 'sanad_reference_stats_cache';
const LOCAL_STORAGE_EVALS_KEY = 'sanad_user_reference_evaluations';

export const PERSISTENT_REFERENCE_EVALUATIONS_SEED: ReferenceEvaluation[] = [
  {
    id: "eval-1790985489476-jn7fk",
    referenceKey: "4_اإلدارة_العامة_للضرائب_غير_المباشرة_تعليمات__sec_التعليمات_و_النماذج_الخاصة_بالقرار_بقانون_بشأن_ضري_p53_hrhq9i9",
    query: "تعليمات فتح ملف جديد في ضريبة القيمة المضافة",
    normalizedQuery: "تعليمات فتح ملف جديد في ضريبة القيمة المضافة",
    lawId: "law-1789470159645-t8z0",
    lawTitle: "4 اإلدارة العامة للضرائب غير المباشرة تعليمات الفصل الخامس وزارة المالية قطاع االيرادات اإلدارة العامة للضرائب غير المباشرة",
    sectionHeader: "التعليمات و النماذج الخاصة بالقرار بقانون بشأن ضريبة القيمة المضافة   2024   لسنة   26   ر... (جزء 53)",
    sourceFileName: "23072025.pdf",
    originalText: "(إن وجد) - نموذج التصريح عن فروع (ان وجدت) -   كتاب صادر عن المؤسسة او الهيئة التي يتبع لها طالب التسجيل - كتاب التفويض للممثل القانوني مرفقات أخـــــرى تحددها الدائرة دولة فلسطين وزارة المالية قطاع االيرادات اإلدارة العامة للضرائب غير المباشرة :   معلومات المؤسسة أو الهيئة :   المفوض/ين بالتوقيع : عنوان المؤسسة او الهيئة /   لدى دائرة الضرائب غير المباشرة مكتب :   اسم المؤسسة او الهيئة : الجهة التي تتبع لها State of Palestine Ministry of Finance Revenue Sector General Directorate of Indirect Tax أقر وأنا بكامل اإلرادة المعتبرة قانونا واتعهد بإبالغ الدائرة   أن جميع التفاصيل الواردة أعاله صحيحة و مطابقة للبيانات المرفقة وأتحمل كامل المسؤولية القانونية عنها يوم من تاريخ التغيير   30   الضريبية عن اي تغيرات تتم على البيانات المصرح عنها أعاله خالل تسجيل األنشطة الخاضعة للضريبة التابعة لي كمشتغل مرخص وفقا ً ألحكام القانون   - 2 - 1 : . . اسم مقدم الطلب اسم مستلم الطلب توقيع مقدم الطلب توقيع مستلم الطلب تاريخ استالم الطلب تاريخ تقديم الطلب   صفته .   يوم من تاريخ استالمه   15   يتم النظر بهذا الطلب خالل :   المرفقات المطلوبة :   االسم :   االسم :   االسم :   رقم الهاتف :   رقم الهاتف :   رقم الهاتف :   البريد االلكتروني :   البريد االلكتروني :   البريد االلكتروني :   نوع النشاط الرئيسي :   رقم الهاتف :   المحافظة :   طبيعة العقار (ملك / ايجار) :   تاريخ بداية االيجار :   بالقرب من :   البطاقة الشخصية للمؤجر :   اسم المؤجر :  ً   قيمة االيجار سنويا :   البريد اإللكتروني :   تاريخ بدء النشاط :   الشارع :   البناية   :   البلد :   الحي :   محددات االلتزام الضريبي :   إسم النشاط   :   إسم النشاط :   إسم النشاط   :   إسم النشاط :   هل تمارس نشاط خاضع لضريبة القيمة المضافة نعم ال :   وجود نشاط خاضع لضريبة الدخل :   نظام المحاسبة المستخدم   يوجد يدوي   ال يوجد محوسب :   إسم النظام طلب تسجيل ملف ضريبي معفي ( المؤسسات الحكومية والهيئات المحلية والهيئات الدينية)",
    rating: 5,
    isMostAccurate: true,
    feedbackTag: "الأدق نصاً",
    notes: "",
    userId: "user-1790985304082",
    username: "احمد هانيا",
    timestamp: "2026-10-02T23:58:09.476Z",
  },
];

export const PERSISTENT_REFERENCE_STATS_SEED: Record<string, ReferenceStats> = {
  "4_اإلدارة_العامة_للضرائب_غير_المباشرة_تعليمات__sec_التعليمات_و_النماذج_الخاصة_بالقرار_بقانون_بشأن_ضري_p53_hrhq9i9": {
    referenceKey: "4_اإلدارة_العامة_للضرائب_غير_المباشرة_تعليمات__sec_التعليمات_و_النماذج_الخاصة_بالقرار_بقانون_بشأن_ضري_p53_hrhq9i9",
    lawTitle: "4 اإلدارة العامة للضرائب غير المباشرة تعليمات الفصل الخامس وزارة المالية قطاع االيرادات اإلدارة العامة للضرائب غير المباشرة",
    sectionHeader: "التعليمات و النماذج الخاصة بالقرار بقانون بشأن ضريبة القيمة المضافة   2024   لسنة   26   ر... (جزء 53)",
    totalRatings: 1,
    averageRating: 5,
    ratingsSum: 5,
    mostAccurateVotes: 1,
    associatedQueries: [
      "تعليمات فتح ملف جديد في ضريبة القيمة المضافة",
    ],
    lastRatedAt: "2026-10-02T23:58:09.476Z",
  },
};

let inMemoryStats: Record<string, ReferenceStats> = { ...PERSISTENT_REFERENCE_STATS_SEED };
let inMemoryEvaluations: ReferenceEvaluation[] = [...PERSISTENT_REFERENCE_EVALUATIONS_SEED];

// Initialize from localStorage and migrate legacy colliding keys
try {
  const cachedStats = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
  if (cachedStats) {
    const parsed = JSON.parse(cachedStats);
    if (parsed && typeof parsed === 'object') {
      inMemoryStats = { ...inMemoryStats, ...parsed };
    }
  }
  const cachedEvals = localStorage.getItem(LOCAL_STORAGE_EVALS_KEY);
  if (cachedEvals) {
    const parsed = JSON.parse(cachedEvals);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const map = new Map<string, ReferenceEvaluation>();
      inMemoryEvaluations.forEach((e) => map.set(e.id, e));
      parsed.forEach((e: ReferenceEvaluation) => map.set(e.id, e));
      inMemoryEvaluations = Array.from(map.values());
    }
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
 * Fetch all reference stats and evaluations from server & Cloud Firestore
 */
export async function fetchReferenceRatings(): Promise<{
  evaluations: ReferenceEvaluation[];
  stats: Record<string, ReferenceStats>;
}> {
  // 1. Try server endpoint
  try {
    const res = await fetch('/api/references/ratings');
    if (res.ok) {
      const data = await res.json();
      if (data.stats && Object.keys(data.stats).length > 0) {
        inMemoryStats = { ...inMemoryStats, ...data.stats };
      }
      if (Array.isArray(data.evaluations) && data.evaluations.length > 0) {
        const map = new Map<string, ReferenceEvaluation>();
        inMemoryEvaluations.forEach((e) => map.set(e.id, e));
        data.evaluations.forEach((e: ReferenceEvaluation) => map.set(e.id, e));
        inMemoryEvaluations = Array.from(map.values());
      }
    }
  } catch (err) {
    console.warn('[ReferenceRating] Network error fetching ratings from server:', err);
  }

  // 2. Direct Cloud Firestore sync (crucial for production sanadtax.com cross-device sync)
  try {
    const { directFetchReferenceRatingsFromFirestore } = await import('./clientFirestore');
    const cloudData = await directFetchReferenceRatingsFromFirestore();
    if (cloudData) {
      if (cloudData.stats && Object.keys(cloudData.stats).length > 0) {
        inMemoryStats = { ...inMemoryStats, ...cloudData.stats };
      }
      if (Array.isArray(cloudData.evaluations) && cloudData.evaluations.length > 0) {
        const map = new Map<string, ReferenceEvaluation>();
        inMemoryEvaluations.forEach((e) => map.set(e.id, e));
        cloudData.evaluations.forEach((e) => map.set(e.id, e));
        inMemoryEvaluations = Array.from(map.values());
      }
    }
  } catch {}

  try {
    localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(inMemoryStats));
    localStorage.setItem(LOCAL_STORAGE_EVALS_KEY, JSON.stringify(inMemoryEvaluations));
  } catch {}

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

  // Direct Cloud Firestore backup (dual-write so sanadtax.com sees it permanently)
  try {
    const { directSaveReferenceEvaluationToFirestore, directSaveReferenceStatsToFirestore } = await import('./clientFirestore');
    directSaveReferenceEvaluationToFirestore(newEval).catch(() => {});
    directSaveReferenceStatsToFirestore(refKey, updatedStats).catch(() => {});
  } catch {}

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
