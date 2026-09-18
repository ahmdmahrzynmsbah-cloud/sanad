import React, { useState } from 'react';
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
} from 'lucide-react';
import type { CitationSource } from '../types';

interface SourceCitationBoxProps {
  citations?: CitationSource[];
  isLegal?: boolean;
}

export const SourceCitationBox: React.FC<SourceCitationBoxProps> = ({
  citations,
  isLegal,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!citations || citations.length === 0) {
    return null;
  }

  const currentCitation = citations[activeIndex] || citations[0];
  if (!currentCitation) return null;

  const handleCopyQuote = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const displayText = isExpanded
    ? currentCitation.originalText
    : currentCitation.snippet || currentCitation.originalText.substring(0, 240) + (currentCitation.originalText.length > 240 ? '...' : '');

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
        <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 touch-scroll">
          <span className="text-[10px] text-zinc-500 font-semibold shrink-0">المصادر المقتبس منها:</span>
          {citations.map((cit, idx) => (
            <button
              key={cit.id || idx}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setIsExpanded(false);
              }}
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                activeIndex === idx
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-zinc-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>
                {cit.articleNumber ? `مادة ${cit.articleNumber}` : `مرجع ${idx + 1}`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Law Title & Article Identification Card */}
      <div className="bg-white/90 border border-amber-200/90 rounded-xl p-2.5 mb-2.5 space-y-1.5">
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
            <span className="text-zinc-500 flex items-center gap-1 text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200" title={currentCitation.sourceFileName}>
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

      {/* Full Screen / Large Modal for Full Original Text Inspection */}
      {isModalOpen && (
        <div
          id="citation-source-modal-overlay"
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            id="citation-source-modal-card"
            className="bg-white rounded-2xl border border-amber-300 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
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
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#fafcfb] space-y-3 touch-scroll">
              <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-2xs text-zinc-800 leading-relaxed text-sm sm:text-[15px] font-serif whitespace-pre-wrap">
                {currentCitation.originalText}
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
