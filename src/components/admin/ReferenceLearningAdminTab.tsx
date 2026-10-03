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
} from 'lucide-react';
import { ReferenceEvaluation, ReferenceStats } from '../../types';
import { useSync } from '../../utils/sync';

export const ReferenceLearningAdminTab: React.FC = () => {
  const [evaluations, setEvaluations] = useState<ReferenceEvaluation[]>([]);
  const [stats, setStats] = useState<Record<string, ReferenceStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<ReferenceEvaluation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/references/ratings');
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data.evaluations || []);
        setStats(data.stats || {});
      }
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
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم وإعادة ضبط وزن التعلم؟')) return;
    try {
      const res = await fetch(`/api/references/rate/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionMessage('تم حذف التقييم بنجاح وتحديث خوارزمية التعلم');
        setTimeout(() => setActionMessage(null), 3500);
        loadData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Metrics
  const statsList = Object.values(stats);
  const totalEvaluationsCount = evaluations.length;
  const totalAccurateVotes = statsList.reduce((sum, s) => sum + (s.mostAccurateVotes || 0), 0);
  const totalTrainedReferences = statsList.length;
  const avgAccuracyScore =
    statsList.length > 0
      ? (statsList.reduce((sum, s) => sum + (s.averageRating || 5), 0) / statsList.length).toFixed(1)
      : '5.0';

  // Filtered stats
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
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner and Summary */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#103025] to-emerald-900 rounded-2xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-amber-100">
                سجل تقييمات المراجع والتعلم الذاتي للشات بوت
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              تتيح هذه اللوحة متابعة تقييمات المستخدمين والخبراء لنصوص المراجع التشريعية؛ حيث يتعلم المساعد الذكي تلقائياً ترجيح المرجع الأعلى تقييماً وتقديمه كإجابة دقيقة وأولى عند تكرار الاستفسارات المماثلة.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تحديث البيانات</span>
          </button>
        </div>

        {/* Ambient Decorative Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-900">مرات الترجيح كالأدق 🏆</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-amber-950">{totalAccurateVotes}</span>
            <span className="text-[10px] text-amber-800">ترجيح</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-900">المراجع المدرّبة في الذاكرة</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-black text-emerald-950">{totalTrainedReferences}</span>
            <span className="text-[10px] text-emerald-800">مرجع موثق</span>
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
            placeholder="بحث باسم القانون، المادة، أو السؤال المرتبط..."
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Main References Learning Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            المراجع المقيّمة والمدرّبة في الذاكرة ({filteredStats.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">جاري تحميل سجل التقييمات...</div>
        ) : filteredStats.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Award className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">لا توجد تقييمات مسجلة مطابقة للبحث حالياً.</p>
            <p className="text-[11px] text-slate-400">
              عندما يقوم المستخدمون بتقييم دقة المراجع أو تحديد «الإجابة الأدق» في الشات بوت، ستظهر هنا تلقائياً.
            </p>
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
                        <span className="text-[10px] text-slate-400 font-mono">
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
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
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

      {/* User Evaluations Log (Individual reviews & votes) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-700" />
            سجل تقييمات المستخدمين الفردية ({evaluations.length})
          </h3>
        </div>

        {evaluations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            لم تسجل تقييمات فردية بعد.
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">المستخدم والوقت</th>
                  <th className="p-3">السؤال المطروح</th>
                  <th className="p-3">المرجع المقيّم</th>
                  <th className="p-3 text-center">النجوم</th>
                  <th className="p-3 text-center">ترجيح الأدق</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluations.slice(0, 30).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{ev.username || 'مستخدم'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(ev.timestamp).toLocaleDateString('ar-EG-u-nu-latn')}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="max-w-[240px] truncate text-slate-800" title={ev.query}>
                        {ev.query || '—'}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 max-w-[220px] truncate">
                        {ev.lawTitle}
                      </div>
                      {ev.articleNumber && (
                        <span className="text-[10px] text-amber-900 font-bold">
                          المادة: {ev.articleNumber}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-0.5 text-amber-700 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        {ev.rating}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {ev.isMostAccurate ? (
                        <span className="bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-200">
                          نعم 🏆
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">لا</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteEvaluation(ev.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف هذا التقييم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
