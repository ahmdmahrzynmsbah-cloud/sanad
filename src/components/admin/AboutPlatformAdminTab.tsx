import React, { useState, useEffect } from 'react';
import {
  Target,
  Eye,
  Compass,
  ShieldCheck,
  Award,
  Users,
  Building2,
  Scale,
  Sparkles,
  BookOpen,
  HeartHandshake,
  Layers,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  Check,
} from 'lucide-react';
import { PlatformAboutData, AboutSectionCard } from '../../types';

interface AboutPlatformAdminTabProps {
  onAboutUpdated?: (about: PlatformAboutData) => void;
}

const AVAILABLE_ICONS = [
  { id: 'target', label: 'هدف / استراتيجية', icon: Target },
  { id: 'eye', label: 'رؤية / نظرة مستقبلية', icon: Eye },
  { id: 'compass', label: 'رسالة / بوصلة', icon: Compass },
  { id: 'shield', label: 'أمان / حماية / قيم', icon: ShieldCheck },
  { id: 'award', label: 'تميز / جودة', icon: Award },
  { id: 'users', label: 'فريق / شركاء', icon: Users },
  { id: 'building', label: 'مؤسسة / قطاع الأعمال', icon: Building2 },
  { id: 'scale', label: 'قانون / عدالة / تشريعات', icon: Scale },
  { id: 'sparkles', label: 'ابتكار / ذكاء اصطناعي', icon: Sparkles },
  { id: 'book', label: 'معرفة / تدريب', icon: BookOpen },
  { id: 'handshake', label: 'تعاون / ثقة مهنية', icon: HeartHandshake },
];

export const AboutPlatformAdminTab: React.FC<AboutPlatformAdminTabProps> = ({ onAboutUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [overviewTitle, setOverviewTitle] = useState('');
  const [overviewContent, setOverviewContent] = useState('');
  const [visionTitle, setVisionTitle] = useState('');
  const [visionContent, setVisionContent] = useState('');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionContent, setMissionContent] = useState('');
  const [customSections, setCustomSections] = useState<AboutSectionCard[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  // Custom section modal/editor
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [secTitle, setSecTitle] = useState('');
  const [secContent, setSecContent] = useState('');
  const [secIcon, setSecIcon] = useState('target');
  const [secIsActive, setSecIsActive] = useState(true);

  // Reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/about');
      if (res.ok) {
        const data: PlatformAboutData = await res.json();
        setOverviewTitle(data.overviewTitle || 'عن منصة «سَنَد»');
        setOverviewContent(data.overviewContent || '');
        setVisionTitle(data.visionTitle || 'رؤيتنا (Vision)');
        setVisionContent(data.visionContent || '');
        setMissionTitle(data.missionTitle || 'رسالتنا (Mission)');
        setMissionContent(data.missionContent || '');
        setCustomSections(data.customSections || []);
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.error('Failed to load about data:', err);
      setFeedback({ type: 'error', message: 'تعذر جلب بيانات عن المنصة من الخادم.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save changes
  const handleSave = async () => {
    if (!overviewContent.trim()) {
      setFeedback({ type: 'error', message: 'يرجى كتابة النبذة التعريفية عن المنصة أولاً.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        overviewTitle: overviewTitle.trim(),
        overviewContent: overviewContent.trim(),
        visionTitle: visionTitle.trim(),
        visionContent: visionContent.trim(),
        missionTitle: missionTitle.trim(),
        missionContent: missionContent.trim(),
        customSections,
      };

      const res = await fetch('/api/admin/settings/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'تم حفظ وتحديث محتوى «عن المنصة والرؤية والرسالة» بنجاح في قاعدة البيانات السحابية.',
        });
        setUpdatedAt(data.platformAbout?.updatedAt);
        if (onAboutUpdated && data.platformAbout) {
          onAboutUpdated(data.platformAbout);
        }
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'حدث خطأ أثناء حفظ التعديلات.',
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      setFeedback({ type: 'error', message: 'فشل الاتصال بالخادم أثناء حفظ التعديلات.' });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    setResetting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/settings/about/reset', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOverviewTitle(data.platformAbout.overviewTitle);
        setOverviewContent(data.platformAbout.overviewContent);
        setVisionTitle(data.platformAbout.visionTitle);
        setVisionContent(data.platformAbout.visionContent);
        setMissionTitle(data.platformAbout.missionTitle);
        setMissionContent(data.platformAbout.missionContent);
        setCustomSections(data.platformAbout.customSections || []);
        setUpdatedAt(data.platformAbout.updatedAt);
        setShowResetConfirm(false);
        setFeedback({
          type: 'success',
          message: 'تمت استعادة المحتوى الافتراضي المعتمد لمنصة «سَنَد» بنجاح.',
        });
        if (onAboutUpdated && data.platformAbout) {
          onAboutUpdated(data.platformAbout);
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'تعذر استعادة المحتوى الافتراضي.' });
      }
    } catch (err) {
      console.error('Reset error:', err);
      setFeedback({ type: 'error', message: 'فشل الاتصال بالخادم أثناء الاستعادة.' });
    } finally {
      setResetting(false);
    }
  };

  // Open add modal
  const handleOpenAddSection = () => {
    setEditingSectionId(null);
    setSecTitle('');
    setSecContent('');
    setSecIcon('target');
    setSecIsActive(true);
    setShowSectionModal(true);
  };

  // Open edit modal
  const handleOpenEditSection = (sec: AboutSectionCard) => {
    setEditingSectionId(sec.id);
    setSecTitle(sec.title);
    setSecContent(sec.content);
    setSecIcon(sec.icon || 'target');
    setSecIsActive(sec.isActive !== false);
    setShowSectionModal(true);
  };

  // Save section modal
  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secTitle.trim() || !secContent.trim()) {
      return;
    }

    if (editingSectionId) {
      // Edit
      setCustomSections((prev) =>
        prev.map((s) =>
          s.id === editingSectionId
            ? {
                ...s,
                title: secTitle.trim(),
                content: secContent.trim(),
                icon: secIcon,
                isActive: secIsActive,
              }
            : s
        )
      );
    } else {
      // Add new
      const newSec: AboutSectionCard = {
        id: `sec-${Date.now()}`,
        title: secTitle.trim(),
        content: secContent.trim(),
        icon: secIcon,
        order: customSections.length + 1,
        isActive: secIsActive,
      };
      setCustomSections((prev) => [...prev, newSec]);
    }

    setShowSectionModal(false);
    setFeedback({
      type: 'success',
      message: 'تم تعديل المحور الإضافي محلياً. اضغط على زر "حفظ التعديلات" لتثبيته في قاعدة البيانات.',
    });
  };

  // Delete section
  const handleDeleteSection = (id: string) => {
    setCustomSections((prev) => prev.filter((s) => s.id !== id));
    setFeedback({
      type: 'success',
      message: 'تم حذف المحور. يرجى الضغط على زر "حفظ التعديلات" بالأسفل لاعتماد التغيير.',
    });
  };

  // Toggle active status
  const handleToggleSectionActive = (id: string) => {
    setCustomSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: s.isActive === false ? true : false } : s))
    );
  };

  const getIconEl = (iconId?: string) => {
    const found = AVAILABLE_ICONS.find((i) => i.id === iconId?.toLowerCase());
    const Comp = found ? found.icon : Layers;
    return <Comp className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#12281e]" />
        <p className="text-sm font-semibold">جارِ تحميل محتوى «عن المنصة والرؤية والرسالة»...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner with Action Buttons */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Target className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900">
              إدارة محتوى «عن المنصة، الرؤية، والرسالة»
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            تخصيص النبذة التعريفية لمنظومة «سَنَد»، وصياغة الرؤية والرسالة والأهداف الاستراتيجية التي تظهر للمستخدمين والزوار.
          </p>
          {updatedAt && (
            <span className="text-[11px] text-slate-400 mt-1 block">
              آخر تحديث سحابي: {new Date(updatedAt).toLocaleString('ar-EG')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="admin-about-reset-btn"
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="استعادة النصوص الافتراضية المعتمدة"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>

          <button
            id="admin-about-save-btn"
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-800 to-[#12281e] text-white hover:from-emerald-700 hover:to-[#1a382b] text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارِ الحفظ السحابي...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#d4af37]" />
                <span>حفظ التعديلات السحابية</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          id="admin-about-feedback"
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-3 font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Platform Overview (النبذة التعريفية) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
              ١
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                النبذة التعريفية عن المنصة (Platform Overview)
              </h4>
              <p className="text-[11px] text-slate-500">
                مقدمة تعريفية شاملة عن دور منصة سَنَد وأدواتها لقطاع الأعمال والمحاسبين.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            أساسي
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان النبذة:
            </label>
            <input
              id="input-overview-title"
              type="text"
              value={overviewTitle}
              onChange={(e) => setOverviewTitle(e.target.value)}
              placeholder="مثال: عن منصة «سَنَد»"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                النص الكامل للنبذة التعريفية:
              </label>
              <span className="text-[11px] text-slate-400">
                {overviewContent.length} حرفاً
              </span>
            </div>
            <textarea
              id="input-overview-content"
              rows={4}
              value={overviewContent}
              onChange={(e) => setOverviewContent(e.target.value)}
              placeholder="أدخل النبذة التعريفية الكاملة..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50/50 resize-y"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Vision & Mission (الرؤية والرسالة) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Vision Box */}
        <div className="p-6 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-amber-100">
            <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-xs">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                الرؤية (Vision)
              </h4>
              <p className="text-[11px] text-slate-500">
                الطموح المستقبلي ومكانة المنظومة في قطاع التشريعات والمالية.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان الرؤية:
              </label>
              <input
                id="input-vision-title"
                type="text"
                value={visionTitle}
                onChange={(e) => setVisionTitle(e.target.value)}
                placeholder="مثال: رؤيتنا (Vision)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص الرؤية:
              </label>
              <textarea
                id="input-vision-content"
                rows={3}
                value={visionContent}
                onChange={(e) => setVisionContent(e.target.value)}
                placeholder="أدخل نص الرؤية..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-slate-50/50 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Mission Box */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-100">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                الرسالة (Mission)
              </h4>
              <p className="text-[11px] text-slate-500">
                الواجب المهني والقيمة المضافة التي نقدمها للمشتركين يومياً.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                عنوان الرسالة:
              </label>
              <input
                id="input-mission-title"
                type="text"
                value={missionTitle}
                onChange={(e) => setMissionTitle(e.target.value)}
                placeholder="مثال: رسالتنا (Mission)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص الرسالة:
              </label>
              <textarea
                id="input-mission-content"
                rows={3}
                value={missionContent}
                onChange={(e) => setMissionContent(e.target.value)}
                placeholder="أدخل نص الرسالة..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-slate-50/50 resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Dynamic Custom Sections (المحاور والأهداف والقيم الإضافية) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                المحاور والقيم والأهداف الإضافية ({customSections.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                يمكنك إضافة بطاقات إضافية كالأهداف الاستراتيجية، القيم الجوهرية، شروط الامتثال، إلخ.
              </p>
            </div>
          </div>

          <button
            id="admin-about-add-sec-btn"
            type="button"
            onClick={handleOpenAddSection}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة محور جديد</span>
          </button>
        </div>

        {customSections.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            لا توجد بطاقات إضافية حالياً. اضغط على «إضافة محور جديد» لإضافة بطاقة مثل "أهدافنا" أو "قيمنا".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customSections.map((sec) => (
              <div
                key={sec.id}
                id={`admin-sec-card-${sec.id}`}
                className={`p-4 rounded-xl border transition-all ${
                  sec.isActive !== false
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-slate-100/40 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                      {getIconEl(sec.icon)}
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                        {sec.title}
                      </h5>
                      <span className="text-[10px] text-slate-400">
                        {sec.isActive !== false ? '✅ مفعل وظاهر' : '⏸️ مخفي ومؤرشف'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSectionActive(sec.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        sec.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title={sec.isActive !== false ? 'تعطيل وإخفاء' : 'تفعيل وإظهار'}
                    >
                      {sec.isActive !== false ? 'ظاهر' : 'مخفي'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditSection(sec)}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 cursor-pointer"
                      title="تعديل المحور"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 cursor-pointer"
                      title="حذف المحور"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Save Action at the bottom */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-linear-to-r from-[#12281e] via-[#1a382b] to-[#12281e] text-white hover:opacity-95 text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارِ الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-[#d4af37]" />
              <span>حفظ جميع التعديلات في قاعدة البيانات</span>
            </>
          )}
        </button>
      </div>

      {/* Modal: Add/Edit Custom Section */}
      {showSectionModal && (
        <div
          id="section-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSectionModal(false);
          }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-linear-to-r from-[#12281e] to-[#1a382b] text-white flex items-center justify-between">
              <h4 className="text-sm sm:text-base font-black flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#d4af37]" />
                <span>{editingSectionId ? 'تعديل المحور الإضافي' : 'إضافة محور / قيمة إضافية'}</span>
              </h4>
              <button
                onClick={() => setShowSectionModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان المحور (مثال: أهدافنا الاستراتيجية، قيمنا الجوهرية):
                </label>
                <input
                  type="text"
                  required
                  value={secTitle}
                  onChange={(e) => setSecTitle(e.target.value)}
                  placeholder="أدخل عنوان المحور..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اختر أيقونة معبرة:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = secIcon === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setSecIcon(item.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] font-bold truncate max-w-full">
                          {item.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص ومحتوى المحور:
                </label>
                <textarea
                  required
                  rows={3}
                  value={secContent}
                  onChange={(e) => setSecContent(e.target.value)}
                  placeholder="أدخل الشرح أو التفاصيل..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-y"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-sec-active"
                  checked={secIsActive}
                  onChange={(e) => setSecIsActive(e.target.checked)}
                  className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="chk-sec-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تفعيل وظهور هذا المحور للمستخدمين في النافذة
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#12281e] text-white hover:bg-[#1a382b] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>تأكيد الإضافة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset */}
      {showResetConfirm && (
        <div
          id="reset-confirm-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowResetConfirm(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-red-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">
                استعادة المحتوى الافتراضي؟
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في استعادة النصوص والبطاقات الافتراضية لمنصة «سَنَد»؟ سيتم استبدال أي نصوص قمت بتعديلها حالياً.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جارِ الاستعادة...</span>
                  </>
                ) : (
                  <span>نعم، استعد الافتراضي</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
