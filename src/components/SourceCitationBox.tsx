import React, { useState, useEffect } from 'react';
import {
  Scale,
  BookOpen,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Quote,
  Sparkles,
  Maximize2,
  X,
  Layers,
  Star,
  Award,
  ThumbsUp,
  CheckCircle2,
  TrendingUp,
  Info,
} from 'lucide-react';
import type { CitationSource, User } from '../types';
import {
  submitReferenceEvaluation,
  getCachedReferenceStats,
  getUserEvaluationForReference,
  computeReferenceKey,
  fetchReferenceRatings,
} from '../services/referenceRatingService';
import { useSync } from '../utils/sync';

interface SourceCitationBoxProps {
  citations?: CitationSource[];
  isLegal?: boolean;
  query?: string;
  currentUser?: User | null;
}

export const SourceCitationBox: React.FC<SourceCitationBoxProps> = ({
  citations,
  isLegal,
  query = '',
  currentUser,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Rating and Evaluation States
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync listener for real-time rating updates across browser tabs
  const [, setTick] = useState(0);
  useSync('reference_ratings', () => {
    setTick((t) => t + 1);
  });

  // Initial fetch of ratings in background
  useEffect(() => {
    fetchReferenceRatings().catch(() => {});
  }, []);

  if (!citations || citations.length === 0) {
    return null;
  }

  const currentCitation = citations[activeIndex] || citations[0];
  if (!currentCitation) return null;

  const currentRefKey =
    currentCitation.referenceKey ||
    computeReferenceKey(
      currentCitation.lawTitle,
      currentCitation.articleNumber,
      currentCitation.sectionHeader,
      currentCitation.lawId,
      currentCitation.originalText
    );

  const stats = getCachedReferenceStats(currentRefKey) || {
    referenceKey: currentRefKey,
    lawTitle: currentCitation.lawTitle,
    articleNumber: currentCitation.articleNumber,
    sectionHeader: currentCitation.sectionHeader,
    totalRatings: currentCitation.totalRatings || 0,
    averageRating: currentCitation.averageRating || 5,
    ratingsSum: (currentCitation.averageRating || 5) * (currentCitation.totalRatings || 0),
    mostAccurateVotes: currentCitation.mostAccurateVotes || 0,
    associatedQueries: [],
    lastRatedAt: '',
  };

  // Identify the SINGLE citation that is truly the most accurate among all displayed citations
  // Under NO circumstances should all citations be labeled as the most accurate!
  const topAccurateIndex = React.useMemo(() => {
    let bestIdx = -1;
    let maxVotes = 0;
    let bestScore = -Infinity;

    citations.forEach((cit, idx) => {
      const k =
        cit.referenceKey ||
        computeReferenceKey(
          cit.lawTitle,
          cit.articleNumber,
          cit.sectionHeader,
          cit.lawId,
          cit.originalText
        );
      const s = getCachedReferenceStats(k);
      const votes = Math.max(s?.mostAccurateVotes || 0, cit.mostAccurateVotes || 0);
      const isTopMatch = Boolean(cit.isLearnedTopMatch);
      const avg = s?.averageRating || cit.averageRating || 5;
      const score = (cit.matchScore || 0) + (avg * 5);

      if (votes > 0 || isTopMatch) {
        const effectiveVotes = Math.max(votes, isTopMatch ? 1 : 0);
        if (effectiveVotes > maxVotes || (effectiveVotes === maxVotes && score > bestScore)) {
          maxVotes = effectiveVotes;
          bestScore = score;
          bestIdx = idx;
        }
      }
    });

    return bestIdx;
  }, [citations]);

  const userEval = getUserEvaluationForReference(currentRefKey, currentUser?.id);
  const effectiveRating = userEval.rating || 0;
  const isMarkedMostAccurate = Boolean(userEval.isMostAccurate);

  const handleCopyQuote = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Submit rating or mark as most accurate
  const handleRate = async (star: number, markAccurate: boolean = false, tag?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await submitReferenceEvaluation({
        citation: {
          ...currentCitation,
          referenceKey: currentRefKey,
        },
        query: query || currentCitation.lawTitle,
        rating: star,
        isMostAccurate: markAccurate || isMarkedMostAccurate,
        feedbackTag: tag,
        userId: currentUser?.id,
        username: currentUser?.fullName || currentUser?.username,
      });

      if (res.success) {
        setSuccessToast(
          markAccurate
            ? '🏆 رائع! تم ترجيح هذا المرجع كـ «الإجابة الأدق». سيتعلم الشات بوت الآن تقديمه كخيار أول لأي مستخدم يسأل عن هذا الموضوع.'
            : `⭐ شكراً لتقييمك (${star} نجوم)! تم حفظ التقييم وتحديث خوارزمية التعلم الذاتي للشات بوت.`
        );
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch (err) {
      console.error('Error submitting reference evaluation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMostAccurate = () => {
    const nextVal = !isMarkedMostAccurate;
    handleRate(effectiveRating || 5, nextVal, nextVal ? 'الأدق نصاً' : undefined);
  };

  const displayText = isExpanded
    ? currentCitation.originalText
    : currentCitation.snippet ||
      currentCitation.originalText.substring(0, 240) +
        (currentCitation.originalText.length > 240 ? '...' : '');

  const isLongText = currentCitation.originalText.length > 240;

  return (
    <div
      id={`source-citation-box-${currentCitation.id || activeIndex}`}
      className="mt-3.5 border border-amber-300/80 bg-gradient-to-b from-amber-50/70 via-amber-50/40 to-white rounded-2xl p-3 sm:p-3.5 text-xs shadow-xs transition-all"
    >
      {/* Citation Box Top Bar Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-amber-200/70">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-2xs">
            <Scale className="w-3.5 h-3.5" />
            <span>الاستشهاد بالمصدر التشريعي</span>
          </div>

          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            نص موثق ومعتمد
          </span>

          {/* If this specific active reference is the top learned match among all citations */}
          {activeIndex === topAccurateIndex && (currentCitation.isLearnedTopMatch || stats.mostAccurateVotes > 0) && (
            <span className="inline-flex items-center gap-1 text-amber-900 bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-600 animate-spin-slow" />
              الأدق تقييماً ({stats.averageRating || '5.0'} ★)
            </span>
          )}
        </div>

        {/* Action Buttons: Expand Full Modal & Copy */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1 text-zinc-500 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
            title="عرض المادة الأصلية كاملة"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">عرض كامل</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyQuote(currentCitation.originalText)}
            className="p-1 text-zinc-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
            title="نسخ النص الأصلي المقتبس"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[10px]">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">نسخ الاقتباس</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Multiple Citations Tabs / Selector if more than 1 source */}
      {citations.length > 1 && (
        <div className="flex flex-col gap-1.5 mb-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-600 font-bold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              المراجع المقتبس منها ({citations.length} مراجع):
            </span>
            <span className="text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full font-medium">
              تصفح وقيّم المرجع الأدق ليتعلمه النظام
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll">
            {citations.map((cit, idx) => {
              const isThisTabTop = topAccurateIndex === idx;

              return (
                <button
                  key={cit.id || idx}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setIsExpanded(false);
                    setSuccessToast(null);
                  }}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                    activeIndex === idx
                      ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                      : isThisTabTop
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-zinc-700 border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>
                    {cit.articleNumber ? `مادة ${cit.articleNumber}` : `مرجع ${idx + 1}`}
                  </span>
                  {isThisTabTop && (
                    <span
                      className={`text-[9px] px-1 rounded-sm font-bold ${
                        activeIndex === idx
                          ? 'bg-amber-800 text-amber-200'
                          : 'bg-amber-200 text-amber-950'
                      }`}
                    >
                      الأدق ⭐
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Law Title & Article Identification Card */}
      <div className="bg-white/90 border border-amber-200/90 rounded-xl p-2.5 mb-2.5 space-y-1.5 shadow-2xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-amber-600 shrink-0" />
              <span>التشريع / القانون المصدر:</span>
            </div>
            <h5 className="font-bold text-zinc-900 text-xs sm:text-[13px] leading-snug">
              {currentCitation.lawTitle}
            </h5>
          </div>

          {currentCitation.category && (
            <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] px-2 py-0.5 rounded font-medium shrink-0">
              {currentCitation.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1 border-t border-zinc-100">
          {currentCitation.articleNumber && (
            <span className="bg-amber-100/80 text-amber-950 font-bold px-2 py-0.5 rounded-md border border-amber-300">
              المادة: {currentCitation.articleNumber}
            </span>
          )}

          {currentCitation.sectionHeader && (
            <span className="text-zinc-700 font-semibold truncate max-w-[280px]">
              {currentCitation.sectionHeader}
            </span>
          )}

          {currentCitation.sourceFileName && (
            <span
              className="text-zinc-500 flex items-center gap-1 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200"
              title={currentCitation.sourceFileName}
            >
              <FileText className="w-2.5 h-2.5 text-zinc-400" />
              <span className="truncate max-w-[140px]">{currentCitation.sourceFileName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Quoted Verbatim Law Snippet Container */}
      <div className="relative bg-[#fafaf8] border border-amber-200/70 rounded-xl p-3 text-zinc-800 font-serif leading-relaxed text-[12px] sm:text-[13px] shadow-2xs">
        <div className="flex items-center gap-1 text-amber-800 text-[10px] font-sans font-bold mb-1.5">
          <Quote className="w-3 h-3 text-amber-600 rotate-180" />
          <span>النص الأصلي المقتبس حرفياً:</span>
        </div>

        <p className="whitespace-pre-wrap text-zinc-800 leading-relaxed font-normal">
          {displayText}
        </p>

        {isLongText && (
          <div className="mt-2 pt-1.5 border-t border-amber-200/50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-amber-900 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>عرض ملخص المادة</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>قراءة النص الأصلي كاملاً ({currentCitation.originalText.length} حرف)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[10px] text-emerald-800 hover:underline flex items-center gap-1 font-semibold"
            >
              <Maximize2 className="w-3 h-3" />
              <span>فتح في نافذة مكبرة</span>
            </button>
          </div>
        )}
      </div>

      {/* Reference Accuracy Evaluation & Chatbot Self-Learning Interactive Card */}
      <div className="mt-2.5 bg-gradient-to-r from-amber-50/90 via-amber-100/30 to-emerald-50/80 border border-amber-300/80 rounded-xl p-2.5 sm:p-3 text-xs space-y-2 shadow-2xs">
        {/* Card Header & Community Rating Score */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-amber-200/60">
          <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-[11px]">
            <Award className="w-4 h-4 text-amber-600" />
            <span>تقييم دقة هذا المرجع وتدريب الشات بوت:</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-600">
            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-amber-200 text-amber-900">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              {stats.averageRating || '5.0'} / 5 ({stats.totalRatings} تقييم)
            </span>

            {stats.mostAccurateVotes > 0 && (
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                رُجّح كالأدق {stats.mostAccurateVotes} مرة
              </span>
            )}
          </div>
        </div>

        {/* Action Row: 5-Star Interactive Rating & "Most Accurate" Toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* 5-Star Rating Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-600 font-medium ml-1">تقييمك:</span>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating !== null ? hoverRating : effectiveRating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => handleRate(star)}
                  disabled={isSubmitting}
                  className="p-1 hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none"
                  title={`تقييم ${star} من 5`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      active
                        ? 'fill-amber-400 text-amber-500 drop-shadow-2xs'
                        : 'text-zinc-300 hover:text-amber-300'
                    }`}
                  />
                </button>
              );
            })}
            {effectiveRating > 0 && (
              <span className="text-[10px] text-emerald-800 font-bold mr-1">
                ({effectiveRating} من 5)
              </span>
            )}
          </div>

          {/* Mark as Most Accurate Reference Button */}
          <button
            type="button"
            onClick={handleToggleMostAccurate}
            disabled={isSubmitting}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
              isMarkedMostAccurate
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 ring-2 ring-emerald-200'
                : 'bg-white hover:bg-amber-100/80 text-amber-950 border border-amber-300 hover:border-amber-400'
            }`}
            title="اعتماد هذا المرجع كالإجابة الأدق ليتعلمه الشات بوت ويقدمه كخيار أول مستقبلاً"
          >
            {isMarkedMostAccurate ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>تم اعتماده كأدق مرجع من قبلك</span>
              </>
            ) : (
              <>
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>ترجيح هذا المرجع كالإجابة الأدق 🏆</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Reasons Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-amber-200/50">
          <span className="text-[10px] text-zinc-500 font-medium shrink-0">سبب الترجيح:</span>
          {[
            'مطابق لنص القانون بدقة',
            'الأشمل شرحاً وتفصيلاً',
            'أحدث تشريع ساري المفعول',
            'إجابة مباشرة وواضحة',
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleRate(effectiveRating || 5, true, tag)}
              className="text-[9.5px] bg-white hover:bg-amber-100 text-zinc-700 border border-amber-200 hover:border-amber-300 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer"
            >
              + {tag}
            </button>
          ))}
        </div>

        {/* Dynamic Success Toast Notification */}
        {successToast && (
          <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-lg text-[11px] font-medium flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{successToast}</span>
          </div>
        )}
      </div>

      {/* Full Screen / Large Modal for Full Original Text Inspection & In-Modal Rating */}
      {isModalOpen && (
        <div
          id="citation-source-modal-overlay"
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="citation-source-modal-card"
            className="bg-white rounded-2xl border border-amber-300 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-950 via-[#103025] to-emerald-900 text-white flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-bold text-sm sm:text-base text-amber-100">
                    الاستشهاد بالمصدر والنص التشريعي الأصلي
                  </h3>
                </div>
                <p className="text-xs text-emerald-200/80 leading-snug">
                  {currentCitation.lawTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-meta bar */}
            <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap text-xs text-amber-950 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {currentCitation.articleNumber && (
                  <span className="bg-amber-200/80 text-amber-950 font-bold px-2.5 py-0.5 rounded-md">
                    المادة: {currentCitation.articleNumber}
                  </span>
                )}
                {currentCitation.sectionHeader && (
                  <span className="font-semibold text-zinc-800">
                    {currentCitation.sectionHeader}
                  </span>
                )}
              </div>

              {currentCitation.sourceFileName && (
                <span className="text-[11px] text-zinc-600 bg-white px-2 py-0.5 rounded border border-amber-200">
                  الملف: {currentCitation.sourceFileName}
                </span>
              )}
            </div>

            {/* Modal Body: Full Verbatim Text */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#fafcfb] space-y-4 touch-scroll">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-2xs text-zinc-800 leading-relaxed text-sm sm:text-[15px] font-serif whitespace-pre-wrap">
                {currentCitation.originalText}
              </div>

              {/* Evaluation Bar inside Modal */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>تقييم دقة هذا النص التشريعي:</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleRate(s)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            effectiveRating >= s
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-zinc-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/50">
                  <span className="text-[11px] text-zinc-600">
                    ترجيحك لهذا المرجع يدرب الذكاء الاصطناعي لتقديمه كإجابة موثوقة لأي شخص يسأل مستقبلاً.
                  </span>

                  <button
                    type="button"
                    onClick={handleToggleMostAccurate}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isMarkedMostAccurate
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {isMarkedMostAccurate ? '✓ معتمد كأدق مرجع' : '🏆 ترجيح كالأدق'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                مستخرج بأمانة تشريعية كاملة من قاعدة المعرفة
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyQuote(currentCitation.originalText)}
                  className="bg-emerald-900 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>تم النسخ بنجاح</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ النص الأصلي</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
