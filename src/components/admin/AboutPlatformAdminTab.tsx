import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../utils/safeApi';
import {
  directSavePlatformAboutToFirestore,
  directFetchPlatformAboutFromFirestore,
} from '../../services/clientFirestore';
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
  Edit3,
} from 'lucide-react';
import { PlatformAboutData, AboutSectionCard } from '../../types';
import { useSync, notifySync } from '../../utils/sync';

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

  // Header customizable text state (نظام تعديل نصوص عن المنصة بالقلم)
  const DEFAULT_ABOUT_TITLE = 'إدارة محتوى «عن المنصة، الرؤية، والرسالة»';
  const DEFAULT_ABOUT_SUBTITLE = 'تخصيص النبذة التعريفية لمنظومة «سَنَد»، وصياغة الرؤية والرسالة والأهداف الاستراتيجية التي تظهر للمستخدمين والزوار.';

  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('about_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return DEFAULT_ABOUT_TITLE;
  });

  const [headerSubtitle, setHeaderSubtitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('about_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subtitle) return parsed.subtitle;
      }
    } catch {}
    return DEFAULT_ABOUT_SUBTITLE;
  });

  const [editingTarget, setEditingTarget] = useState<'none' | 'title' | 'subtitle' | 'all'>('none');
  const [editTitleDraft, setEditTitleDraft] = useState(headerTitle);
  const [editSubtitleDraft, setEditSubtitleDraft] = useState(headerSubtitle);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  const loadHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/about-header');
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setHeaderTitle(data.title);
          setEditTitleDraft(data.title);
        }
        if (data.subtitle) {
          setHeaderSubtitle(data.subtitle);
          setEditSubtitleDraft(data.subtitle);
        }
      }
    } catch {}
  };

  const handleSaveHeader = async (newTitle?: string, newSubtitle?: string) => {
    const titleToSave = (newTitle !== undefined ? newTitle : editTitleDraft).trim() || DEFAULT_ABOUT_TITLE;
    const subtitleToSave = (newSubtitle !== undefined ? newSubtitle : editSubtitleDraft).trim() || DEFAULT_ABOUT_SUBTITLE;

    setIsSavingHeader(true);
    setHeaderTitle(titleToSave);
    setHeaderSubtitle(subtitleToSave);
    try {
      localStorage.setItem('about_header_settings', JSON.stringify({
        title: titleToSave,
        subtitle: subtitleToSave,
        updatedAt: new Date().toISOString()
      }));
    } catch {}

    try {
      const res = await fetch('/api/admin/settings/about-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave, subtitle: subtitleToSave }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'تم حفظ وتحديث نصوص عن المنصة والرؤية والرسالة بنجاح ✍️' });
      }
    } catch {
      setFeedback({ type: 'success', message: 'تم حفظ التعديلات محلياً بنجاح ✍️' });
    } finally {
      setIsSavingHeader(false);
      setEditingTarget('none');
      setShowEditHeaderModal(false);
      notifySync('about_header');
      window.dispatchEvent(new CustomEvent('about-header-updated', {
        detail: { title: titleToSave, subtitle: subtitleToSave }
      }));
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleResetHeader = () => {
    setEditTitleDraft(DEFAULT_ABOUT_TITLE);
    setEditSubtitleDraft(DEFAULT_ABOUT_SUBTITLE);
    handleSaveHeader(DEFAULT_ABOUT_TITLE, DEFAULT_ABOUT_SUBTITLE);
  };

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
    let loaded = false;
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
        loaded = true;
      }
    } catch {}

    if (!loaded) {
      try {
        const direct = await directFetchPlatformAboutFromFirestore();
        if (direct) {
          setOverviewTitle(direct.overviewTitle || 'عن منصة «سَنَد»');
          setOverviewContent(direct.overviewContent || '');
          setVisionTitle(direct.visionTitle || 'رؤيتنا (Vision)');
          setVisionContent(direct.visionContent || '');
          setMissionTitle(direct.missionTitle || 'رسالتنا (Mission)');
          setMissionContent(direct.missionContent || '');
          setCustomSections(direct.customSections || []);
          setUpdatedAt(direct.updatedAt);
        }
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    loadHeaderSettings();
  }, []);

  useSync(['platform_about', 'system_settings', 'all'], () => {
    fetchData();
  });

  useSync(['about_header', 'all'], () => {
    loadHeaderSettings();
  });

  // Save changes
  const handleSave = async () => {
    if (!overviewContent.trim()) {
      setFeedback({ type: 'error', message: 'يرجى كتابة النبذة التعريفية عن المنصة أولاً.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      overviewTitle: overviewTitle.trim(),
      overviewContent: overviewContent.trim(),
      visionTitle: visionTitle.trim(),
      visionContent: visionContent.trim(),
      missionTitle: missionTitle.trim(),
      missionContent: missionContent.trim(),
      customSections,
    };

    let saved = false;
    let savedData: any = null;

    try {
      const res = await fetch('/api/admin/settings/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed = await safeFetchJson(res);
      if (parsed.ok && parsed.data?.success) {
        saved = true;
        savedData = parsed.data.platformAbout;
      }
    } catch {}

    if (!saved) {
      const directOk = await directSavePlatformAboutToFirestore(payload);
      if (directOk) {
        saved = true;
        savedData = { ...payload, updatedAt: new Date().toISOString() };
      }
    }

    if (saved) {
      notifySync('platform_about');
      setFeedback({
        type: 'success',
        message: 'تم حفظ وتحديث محتوى «عن المنصة والرؤية والرسالة» بنجاح في قاعدة البيانات السحابية.',
      });
      if (savedData?.updatedAt) {
        setUpdatedAt(savedData.updatedAt);
      }
      if (onAboutUpdated && savedData) {
        onAboutUpdated(savedData);
      }
    } else {
      setFeedback({ type: 'error', message: 'حدث خطأ أثناء حفظ التعديلات سحابياً.' });
    }
    setSaving(false);
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
        notifySync('platform_about');
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
      {/* Top Banner with Action Buttons & Direct Pen Editing */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:max-w-2xl">
          {/* Top helper badge system */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditTitleDraft(headerTitle);
                setEditSubtitleDraft(headerSubtitle);
                setEditingTarget('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] sm:text-xs font-bold shadow-xs border border-emerald-600/70 transition-all cursor-pointer hover:scale-105 active:scale-95 group/pen"
              title="نظام القلم: انقر لتعديل هذا العنوان والوصف بحرية ✍️"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-200 group-hover/pen:rotate-12 transition-transform" />
              <span>تعديل هذا الكلام ✍️</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditTitleDraft(headerTitle);
                setEditSubtitleDraft(headerSubtitle);
                setShowEditHeaderModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
              title="فتح نافذة التعديل المتقدمة"
            >
              <Sparkles className="w-3 h-3 text-emerald-700" />
              <span>نافذة التعديل</span>
            </button>
          </div>

          {/* Main Container with direct pen system */}
          <div className="relative pt-6 group/target rounded-xl transition-all">
            {/* Direct Pen Badge hovering directly over this text block */}
            <div className="absolute top-0 right-0 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={() => {
                  setEditTitleDraft(headerTitle);
                  setEditSubtitleDraft(headerSubtitle);
                  setEditingTarget(editingTarget === 'all' ? 'none' : 'all');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] sm:text-[11px] font-bold shadow-sm border border-emerald-500/80 transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in"
                title="تعديل هذا الكلام بالقلم ✍️"
              >
                <Edit3 className="w-3 h-3 text-emerald-200 animate-pulse" />
                <span>تعديل هذا الكلام ✍️</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditTitleDraft(headerTitle);
                  setEditSubtitleDraft(headerSubtitle);
                  setShowEditHeaderModal(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[10px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="تعديل في نافذة مخصصة"
              >
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                <span>تعديل متقدم</span>
              </button>
            </div>

            {editingTarget === 'all' ? (
              /* Inline Direct Edit Mode for both Title and Subtitle */
              <div className="bg-emerald-50/80 border-2 border-emerald-400/90 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                    <span>تعديل عنوان ووصف قسم عن المنصة بحرية بالقلم:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetHeader}
                    className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    title="استعادة النص الافتراضي"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة الافتراضي</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">العنوان الرئيسي:</label>
                  <input
                    type="text"
                    value={editTitleDraft}
                    onChange={(e) => setEditTitleDraft(e.target.value)}
                    placeholder="مثال: إدارة محتوى «عن المنصة، الرؤية، والرسالة»"
                    className="w-full text-sm font-bold bg-white border border-emerald-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">الوصف الفرعي:</label>
                  <textarea
                    rows={2}
                    value={editSubtitleDraft}
                    onChange={(e) => setEditSubtitleDraft(e.target.value)}
                    placeholder="وصف القسم الشامل..."
                    className="w-full text-xs bg-white border border-emerald-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingTarget('none')}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveHeader()}
                    disabled={isSavingHeader}
                    className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingHeader ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    <span>حفظ النصوص الجديدة</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Target className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap group/title">
                    <span
                      onClick={() => {
                        setEditTitleDraft(headerTitle);
                        setEditSubtitleDraft(headerSubtitle);
                        setEditingTarget('all');
                      }}
                      className="cursor-pointer hover:text-emerald-800 transition-colors"
                      title="انقر لتعديل هذا العنوان"
                    >
                      {headerTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTitleDraft(headerTitle);
                        setEditSubtitleDraft(headerSubtitle);
                        setEditingTarget('all');
                      }}
                      className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100/80 transition-all cursor-pointer opacity-80 hover:opacity-100"
                      title="تعديل هذا العنوان بالقلم ✍️"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-800" />
                    </button>
                  </h3>
                </div>
                <p
                  onClick={() => {
                    setEditTitleDraft(headerTitle);
                    setEditSubtitleDraft(headerSubtitle);
                    setEditingTarget('all');
                  }}
                  className="text-xs sm:text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors"
                  title="انقر لتعديل هذا الوصف"
                >
                  {headerSubtitle}
                </p>
                {updatedAt && (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    آخر تحديث سحابي: {new Date(updatedAt).toLocaleString('ar-EG-u-nu-latn')}
                  </span>
                )}
              </div>
            )}
          </div>
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
              1
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

      {/* Modal: Edit About Header Customization */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">تخصيص عنوان ووصف «عن المنصة»</h3>
                  <p className="text-xs text-slate-500">تعديل الكلام الظاهر في ترويسة هذه الصفحة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditHeaderModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">العنوان الرئيسي:</label>
                <input
                  type="text"
                  value={editTitleDraft}
                  onChange={(e) => setEditTitleDraft(e.target.value)}
                  placeholder="مثال: إدارة محتوى «عن المنصة، الرؤية، والرسالة»"
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">الوصف الفرعي:</label>
                <textarea
                  rows={3}
                  value={editSubtitleDraft}
                  onChange={(e) => setEditSubtitleDraft(e.target.value)}
                  placeholder="صياغة النبذة التعريفية والوصف..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetHeader}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditHeaderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveHeader()}
                  disabled={isSavingHeader}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingHeader ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>حفظ وتحديث</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
