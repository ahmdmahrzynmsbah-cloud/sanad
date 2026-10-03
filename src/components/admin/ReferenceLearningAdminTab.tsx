import React, { useState, useEffect } from 'react';
import {
  Award,
  Star,
  CheckCircle2,
  Trash2,
  Search,
  BookOpen,
  Sparkles,
  MessageSquare,
  FileText,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Scale,
  TrendingUp,
  Maximize2,
  Copy,
  Check,
  User,
  Calendar,
  X,
  HelpCircle,
  BrainCircuit,
  Cloud,
} from 'lucide-react';
import { ReferenceEvaluation, ReferenceStats } from '../../types';
import { fetchReferenceRatings } from '../../services/referenceRatingService';
import { directDeleteReferenceEvaluationFromFirestore } from '../../services/clientFirestore';
import { useSync } from '../../utils/sync';

export const ReferenceLearningAdminTab: React.FC = () => {
  const [evaluations, setEvaluations] = useState<ReferenceEvaluation[]>([]);
  const [stats, setStats] = useState<Record<string, ReferenceStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'most_accurate'>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<ReferenceEvaluation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Uses unified service that merges server API, Cloud Firestore, and local/seed cache
      const data = await fetchReferenceRatings();
      setEvaluations(data.evaluations || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Error fetching reference ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  useSync('reference_ratings', () => {
    loadData();
  });

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteEvaluation = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم وإعادة ضبط خوارزمية التعلم للشات بوت؟')) return;
    try {
      // 1. Direct Cloud Firestore delete
      directDeleteReferenceEvaluationFromFirestore(id).catch(() => {});

      // 2. Server API delete
      const res = await fetch(`/api/references/rate/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionMessage('تم حذف التقييم بنجاح وتحديث خوارزمية التعلم للشات بوت');
        setTimeout(() => setActionMessage(null), 3500);
        loadData();
      } else {
        // Fallback local update
        setEvaluations((prev) => prev.filter((e) => e.id !== id));
        setActionMessage('تم إزالة التقييم من الذاكرة المحلية بنجاح');
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleCopyText = (id: string, text: string, type: 'query' | 'quote') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'query') {
      setCopiedQueryId(id);
      setTimeout(() => setCopiedQueryId(null), 2000);
    } else {
      setCopiedQuoteId(id);
      setTimeout(() => setCopiedQuoteId(null), 2000);
    }
  };

  // Metrics
  const statsList = Object.values(stats);
  const totalEvaluationsCount = evaluations.length;
  const totalAccurateVotes = evaluations.filter((e) => e.isMostAccurate).length ||
    statsList.reduce((sum, s) => sum + (s.mostAccurateVotes || 0), 0);
  const totalTrainedReferences = statsList.length || (evaluations.length > 0 ? 1 : 0);
  const avgAccuracyScore =
    evaluations.length > 0
      ? (evaluations.reduce((sum, e) => sum + (e.rating || 5), 0) / evaluations.length).toFixed(1)
      : '5.0';

  // Filtered evaluations
  const filteredEvaluations = evaluations.filter((e) => {
    if (filterType === 'most_accurate' && !e.isMostAccurate) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.query && e.query.toLowerCase().includes(q)) ||
      (e.lawTitle && e.lawTitle.toLowerCase().includes(q)) ||
      (e.sectionHeader && e.sectionHeader.toLowerCase().includes(q)) ||
      (e.articleNumber && String(e.articleNumber).includes(q)) ||
      (e.username && e.username.toLowerCase().includes(q)) ||
      (e.originalText && e.originalText.toLowerCase().includes(q))
    );
  });

  // Filtered stats list
  const filteredStats = statsList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.lawTitle && s.lawTitle.toLowerCase().includes(q)) ||
      (s.sectionHeader && s.sectionHeader.toLowerCase().includes(q)) ||
      (s.articleNumber && s.articleNumber.includes(q)) ||
      (s.associatedQueries && s.associatedQueries.some((aq) => aq.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner and Summary */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#103025] to-emerald-900 rounded-2xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300">
                <BrainCircuit className="w-5 h-5 text-amber-300" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-amber-100">
                سجل تقييمات المراجع والتعلم الذاتي للشات بوت
              </h2>
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                <Cloud className="w-3 h-3 text-emerald-300" />
                مزامنة سحابية نشطة
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              هنا تظهر مباشرة جميع الأسئلة التي طرحها المستخدمون، والقوانين والتشريعات التي تم ترجيحها كـ <strong>«الإجابة الأدق»</strong>. يتعلم المساعد الذكي تلقائياً حفظ هذا الاقتران، ليقدم القانون المرجح كخيار أول في صدارة الإجابة فور تكرار السؤال أو استفسار مشابه.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
              title="تحديث ومزامنة البيانات مع السحابة"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'جاري التحديث...' : 'تحديث البيانات'}</span>
            </button>
          </div>
        </div>

        {/* Ambient Decorative Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500">إجمالي التقييمات المسجلة</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-slate-900">{totalEvaluationsCount}</span>
            <span className="text-[10px] text-slate-400">تقييم</span>
          </div>
        </div>

        <div className="bg-white border border-amber-300 bg-amber-50/30 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-900">مرات الترجيح كالأدق 🏆</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-amber-950">{totalAccurateVotes}</span>
            <span className="text-[10px] text-amber-800">ترجيح مؤكد</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-300 bg-emerald-50/30 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-900">المراجع والأسئلة المدرّبة</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-emerald-950">{totalTrainedReferences}</span>
            <span className="text-[10px] text-emerald-800">سؤال وقانون</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500">متوسط دقة النظام</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-amber-600">{avgAccuracyScore}</span>
            <span className="text-[10px] text-amber-700">★ من 5</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بنص السؤال، اسم القانون، المادة، أو اسم المستخدم..."
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع التقييمات ({evaluations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('most_accurate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'most_accurate'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>الأدق ترجيحاً فقط ({evaluations.filter((e) => e.isMostAccurate).length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: Voted Questions & Endorsed Laws Feed (الميزة المطلوبة) */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-gradient-to-r from-slate-50 to-amber-50/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                سجل الأسئلة والقوانين المرجحة كالإجابة الأدق للتعلم الذاتي ({filteredEvaluations.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                يوضح السؤال الذي طرحه المستخدم والقانون المحدد الذي تم اعتماده لتدريب المساعد الذكي
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RotateCcw className="w-5 h-5 animate-spin text-emerald-600" />
            <span>جاري تحميل سجل التقييمات والتعلم الذاتي...</span>
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Award className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">لا توجد تقييمات مسجلة مطابقة للبحث حالياً.</p>
            <p className="text-[11px] text-slate-400">
              عندما يقوم المستخدمون بترجيح مرجع كـ «الإجابة الأدق» في الشات بوت، ستظهر هنا فوراً مصحوبة بالسؤال والقانون المعتمد.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvaluations.map((ev, index) => (
              <div
                key={ev.id || index}
                className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-3.5"
              >
                {/* Header row: Question & Badges */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 max-w-2xl flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-md font-bold text-[11px] border border-amber-300">
                        <MessageSquare className="w-3 h-3 text-amber-700" />
                        السؤال المطروح:
                      </span>

                      {ev.isMostAccurate && (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          رُجّح كـ «الإجابة الأدق» 🏆
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        {ev.rating || 5} / 5 نجوم
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug pt-0.5">
                      «{ev.query || 'استفسار عام'}»
                    </h4>
                  </div>

                  {/* Actions: Copy & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyText(ev.id, ev.query || '', 'query')}
                      className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="نسخ السؤال"
                    >
                      {copiedQueryId === ev.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 text-[10px]">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">نسخ السؤال</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEvaluation(ev.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذا التقييم وإعادة ضبط الشات بوت"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Law & Endorsed Reference Box */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <Scale className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>القانون والتشريع المعتمد:</span>
                      <span className="text-slate-900">{ev.lawTitle}</span>
                    </div>

                    {ev.articleNumber && (
                      <span className="bg-amber-100/90 text-amber-950 font-bold px-2 py-0.5 rounded-md border border-amber-300 text-[11px]">
                        مادة رقم {ev.articleNumber}
                      </span>
                    )}
                  </div>

                  {ev.sectionHeader && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">الموضع / البند:</span>
                      <span>{ev.sectionHeader}</span>
                    </div>
                  )}

                  {/* Quoted Text Preview */}
                  {ev.originalText && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 leading-relaxed font-sans relative group">
                      <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center justify-between">
                        <span>النص المقتبس المعتمد:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(ev.id, ev.originalText || '', 'quote')}
                            className="text-slate-500 hover:text-slate-800 text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            {copiedQuoteId === ev.id ? (
                              <span className="text-emerald-700">تم نسخ النص</span>
                            ) : (
                              <span>نسخ النص</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEvaluation(ev)}
                            className="text-emerald-700 hover:text-emerald-900 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>عرض كامل</span>
                          </button>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-slate-800">
                        {ev.originalText}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Self-Learning Confirmation Badge */}
                <div className="bg-gradient-to-r from-emerald-50 via-emerald-100/30 to-amber-50/20 border border-emerald-200/90 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px] text-emerald-950 font-bold">
                      حالة تعلّم الشات بوت:
                    </span>
                    <span className="text-[11px] text-emerald-900 font-medium">
                      تم حفظ هذا القانون في الذاكرة الذكية، وسيقدمه الشات بوت في صدارة الإجابة كـ «الأدق ⭐» عند تكرار الاستفسار.
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium mr-auto">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      المقيّم: <strong className="text-slate-700">{ev.username || 'مستخدم'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(ev.timestamp).toLocaleDateString('ar-EG-u-nu-latn')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: Aggregated References Stats Table */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            فهرس المراجع والتشريعات المعتمدة في الذاكرة ({filteredStats.length})
          </h3>
        </div>

        {filteredStats.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            لا توجد إحصائيات مجمعة متاحة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">التشريع / المرجع</th>
                  <th className="p-3">المادة / الموضع</th>
                  <th className="p-3 text-center">متوسط التقييم</th>
                  <th className="p-3 text-center">مرات ترجيح الأدق</th>
                  <th className="p-3">الأسئلة المرتبطة</th>
                  <th className="p-3 text-center">حالة التدريب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStats.map((item) => {
                  const isTop = item.mostAccurateVotes > 0;
                  return (
                    <tr key={item.referenceKey} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 leading-snug max-w-[280px]">
                          {item.lawTitle}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono truncate block max-w-[240px]">
                          {item.referenceKey}
                        </span>
                      </td>

                      <td className="p-3">
                        {item.articleNumber ? (
                          <span className="bg-amber-100/80 text-amber-950 font-bold px-2 py-0.5 rounded-md border border-amber-300 text-[11px]">
                            مادة {item.articleNumber}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px] truncate max-w-[200px] block">
                            {item.sectionHeader || '—'}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{item.averageRating || '5.0'}</span>
                          <span className="text-[10px] text-slate-400">({item.totalRatings})</span>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {item.mostAccurateVotes > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full font-bold text-[11px] border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            {item.mostAccurateVotes} ترجيح
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="space-y-1 max-w-[260px]">
                          {(item.associatedQueries || []).slice(0, 2).map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="text-[11px] text-slate-700 truncate bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md"
                              title={q}
                            >
                              💬 {q}
                            </div>
                          ))}
                          {(item.associatedQueries || []).length > 2 && (
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              + {(item.associatedQueries || []).length - 2} أسئلة أخرى
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {isTop ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            مرجح كإجابة أولى
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">مرجع مساعد</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* Modal: Full Quoted Text Viewer */}
      {/* ======================================================== */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-emerald-950 text-white flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-sm text-amber-200">
                    {selectedEvaluation.lawTitle}
                  </h4>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  {selectedEvaluation.sectionHeader || 'النص القانوني المعتمد'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvaluation(null)}
                className="p-1.5 text-emerald-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-[11px] text-amber-900 font-bold block mb-1">السؤال المرتبط:</span>
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  «{selectedEvaluation.query}»
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-bold block mb-1.5">
                  النص التشريعي المعتمد بالكامل:
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans max-h-[300px] overflow-y-auto">
                  {selectedEvaluation.originalText}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                تقييم: <strong>{selectedEvaluation.rating} / 5 نجوم</strong> • بواسطة {selectedEvaluation.username || 'مستخدم'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText('modal', selectedEvaluation.originalText || '', 'quote')}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ النص</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvaluation(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
