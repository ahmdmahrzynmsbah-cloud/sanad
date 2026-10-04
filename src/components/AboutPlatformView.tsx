import React, { useEffect, useState } from 'react';
import {
  Target,
  Eye,
  Compass,
  ShieldCheck,
  Sparkles,
  Award,
  Users,
  Building2,
  Scale,
  X,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
  Layers,
  HeartHandshake,
  Edit3,
  Check,
  RotateCcw,
  Save,
} from 'lucide-react';
import { PlatformAboutData, AboutSectionCard } from '../types';
import { useSync, broadcastSync } from '../utils/sync';
import { directSavePlatformAboutToFirestore } from '../services/clientFirestore';

interface AboutPlatformViewProps {
  aboutData?: PlatformAboutData | null;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenLaws?: () => void;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onUpdateAbout?: (updated: PlatformAboutData) => void;
}

const DEFAULT_ABOUT: PlatformAboutData = {
  pageHeaderTitle: 'عن منصة «سَنَد» الذكية',
  pageHeaderBadge: 'PS المنظومة الوطنية الأولى',
  pageHeaderSubtitle: 'تشريعات، ضرائب، وتدقيق مالي ذكي',
  overviewTitle: 'عن منصة «سَنَد»',
  overviewContent:
    '«سَنَد» هي منصتك القانونية والمالية الذكية الأولى في فلسطين، صُممت لتكون مرجعك الموثوق في الضرائب والقوانين والتشريعات والتحليل المالي والمساعدة في التدقيق. نحن نقدم أدوات ذكية وأنظمة متطورة لدعم المدققين والمحاسبين، وشركات التدقيق ومكاتب التدقيق والمحاسبة، والمدراء الماليين والمهتمين من القطاع الخاص، مع تحديثات مستمرة لتسهيل أعمالكم وتعزيز كفاءتكم التشغيلية.',
  visionTitle: 'رؤيتنا (Vision)',
  visionContent:
    'أن نكون المنظومة الذكية الأولى والرائدة في فلسطين والمنطقة، التي تربط التشريعات والقوانين بالحلول المالية والمحاسبية المتقدمة، لتمكين قطاع الأعمال والمحاسبين من اتخاذ قرارات دقيقة بكل ثقة.',
  missionTitle: 'رسالتنا (Mission)',
  missionContent:
    'تمكين المحاسبين، ومكاتب المحاسبة، والشركات، والقطاع الخاص من خلال توفير منصة ذكية تدمج قواعد المعرفة القانونية والضريبية بالذكاء الاصطناعي والأدوات المالية، لتوفير الوقت، وضمان الامتثال، وتبسيط أعقد الإجراءات الإدارية والقانونية بدقة متناهية ومصادر موثوقة.',
  customSections: [],
};

const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'Eye':
      return <Eye className="w-5 h-5 text-amber-500" />;
    case 'Compass':
      return <Compass className="w-5 h-5 text-emerald-500" />;
    case 'ShieldCheck':
      return <ShieldCheck className="w-5 h-5 text-blue-500" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-purple-500" />;
    case 'Award':
      return <Award className="w-5 h-5 text-yellow-500" />;
    case 'Users':
      return <Users className="w-5 h-5 text-indigo-500" />;
    case 'Building2':
      return <Building2 className="w-5 h-5 text-slate-500" />;
    case 'HeartHandshake':
      return <HeartHandshake className="w-5 h-5 text-rose-500" />;
    case 'Scale':
    default:
      return <Scale className="w-5 h-5 text-emerald-600" />;
  }
};

export const AboutPlatformView: React.FC<AboutPlatformViewProps> = ({
  aboutData,
  onOpenLogin,
  onOpenRegister,
  onOpenLaws,
  isLoggedIn,
  isAdmin,
  onUpdateAbout,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'overview' | 'vision-mission' | 'custom'>('all');
  const [data, setData] = useState<PlatformAboutData>(() => {
    if (aboutData) return aboutData;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sanad_about_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.pageHeaderTitle || parsed.overviewContent)) return parsed;
        }
      } catch {}
    }
    return DEFAULT_ABOUT;
  });

  // Edit modal state
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'header' | 'overview' | 'vision' | 'mission'>('header');

  // Edit fields
  const [editHeaderTitle, setEditHeaderTitle] = useState(data.pageHeaderTitle || DEFAULT_ABOUT.pageHeaderTitle!);
  const [editHeaderBadge, setEditHeaderBadge] = useState(data.pageHeaderBadge || DEFAULT_ABOUT.pageHeaderBadge!);
  const [editHeaderSubtitle, setEditHeaderSubtitle] = useState(data.pageHeaderSubtitle || DEFAULT_ABOUT.pageHeaderSubtitle!);
  const [editOverviewTitle, setEditOverviewTitle] = useState(data.overviewTitle || DEFAULT_ABOUT.overviewTitle!);
  const [editOverviewContent, setEditOverviewContent] = useState(data.overviewContent || DEFAULT_ABOUT.overviewContent);
  const [editVisionTitle, setEditVisionTitle] = useState(data.visionTitle || DEFAULT_ABOUT.visionTitle!);
  const [editVisionContent, setEditVisionContent] = useState(data.visionContent || DEFAULT_ABOUT.visionContent);
  const [editMissionTitle, setEditMissionTitle] = useState(data.missionTitle || DEFAULT_ABOUT.missionTitle!);
  const [editMissionContent, setEditMissionContent] = useState(data.missionContent || DEFAULT_ABOUT.missionContent);

  // Direct Inline Edit State
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineTitle, setInlineTitle] = useState(data.pageHeaderTitle || DEFAULT_ABOUT.pageHeaderTitle!);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const syncFormFields = (current: PlatformAboutData) => {
    setEditHeaderTitle(current.pageHeaderTitle || DEFAULT_ABOUT.pageHeaderTitle!);
    setEditHeaderBadge(current.pageHeaderBadge || DEFAULT_ABOUT.pageHeaderBadge!);
    setEditHeaderSubtitle(current.pageHeaderSubtitle || DEFAULT_ABOUT.pageHeaderSubtitle!);
    setEditOverviewTitle(current.overviewTitle || DEFAULT_ABOUT.overviewTitle!);
    setEditOverviewContent(current.overviewContent || DEFAULT_ABOUT.overviewContent);
    setEditVisionTitle(current.visionTitle || DEFAULT_ABOUT.visionTitle!);
    setEditVisionContent(current.visionContent || DEFAULT_ABOUT.visionContent);
    setEditMissionTitle(current.missionTitle || DEFAULT_ABOUT.missionTitle!);
    setEditMissionContent(current.missionContent || DEFAULT_ABOUT.missionContent);
    setInlineTitle(current.pageHeaderTitle || DEFAULT_ABOUT.pageHeaderTitle!);
  };

  useEffect(() => {
    if (aboutData) {
      setData(aboutData);
      syncFormFields(aboutData);
    } else {
      fetch('/api/system/about')
        .then((res) => (res.ok ? res.json() : DEFAULT_ABOUT))
        .then((resData) => {
          if (resData && (resData.overviewContent || resData.pageHeaderTitle)) {
            setData(resData);
            syncFormFields(resData);
            try {
              localStorage.setItem('sanad_about_data', JSON.stringify(resData));
            } catch {}
          }
        })
        .catch(() => {
          setData(DEFAULT_ABOUT);
          syncFormFields(DEFAULT_ABOUT);
        });
    }
  }, [aboutData]);

  useSync(['platform_about', 'system_settings', 'all'], () => {
    fetch('/api/system/about')
      .then((res) => (res.ok ? res.json() : DEFAULT_ABOUT))
      .then((resData) => {
        if (resData && (resData.overviewContent || resData.pageHeaderTitle)) {
          setData(resData);
          syncFormFields(resData);
          try {
            localStorage.setItem('sanad_about_data', JSON.stringify(resData));
          } catch {}
        }
      })
      .catch(() => {});
  });

  const activeCustomSections = (data.customSections || []).filter(
    (sec) => sec.isActive !== false && sec.id !== 'sec-goals' && sec.id !== 'sec-values'
  );

  // Save all modified texts
  const handleSaveAll = async (override?: Partial<PlatformAboutData>) => {
    setIsSaving(true);
    const updated: PlatformAboutData = {
      ...data,
      pageHeaderTitle: (override?.pageHeaderTitle !== undefined ? override.pageHeaderTitle : editHeaderTitle).trim() || DEFAULT_ABOUT.pageHeaderTitle!,
      pageHeaderBadge: (override?.pageHeaderBadge !== undefined ? override.pageHeaderBadge : editHeaderBadge).trim() || DEFAULT_ABOUT.pageHeaderBadge!,
      pageHeaderSubtitle: (override?.pageHeaderSubtitle !== undefined ? override.pageHeaderSubtitle : editHeaderSubtitle).trim() || DEFAULT_ABOUT.pageHeaderSubtitle!,
      overviewTitle: (override?.overviewTitle !== undefined ? override.overviewTitle : editOverviewTitle).trim() || DEFAULT_ABOUT.overviewTitle!,
      overviewContent: (override?.overviewContent !== undefined ? override.overviewContent : editOverviewContent).trim() || DEFAULT_ABOUT.overviewContent,
      visionTitle: (override?.visionTitle !== undefined ? override.visionTitle : editVisionTitle).trim() || DEFAULT_ABOUT.visionTitle!,
      visionContent: (override?.visionContent !== undefined ? override.visionContent : editVisionContent).trim() || DEFAULT_ABOUT.visionContent,
      missionTitle: (override?.missionTitle !== undefined ? override.missionTitle : editMissionTitle).trim() || DEFAULT_ABOUT.missionTitle!,
      missionContent: (override?.missionContent !== undefined ? override.missionContent : editMissionContent).trim() || DEFAULT_ABOUT.missionContent,
      updatedAt: new Date().toISOString(),
    };

    // 1. Instant local state & cache update
    setData(updated);
    syncFormFields(updated);
    setIsInlineEditing(false);
    if (onUpdateAbout) {
      onUpdateAbout(updated);
    }
    try {
      localStorage.setItem('sanad_about_data', JSON.stringify(updated));
    } catch {}

    // 2. Persist to API
    try {
      await fetch('/api/system/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}

    try {
      await fetch('/api/admin/settings/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}

    // 3. Persist to Firestore directly
    try {
      await directSavePlatformAboutToFirestore(updated);
    } catch {}

    broadcastSync(['platform_about', 'system_settings', 'all']);

    setIsSaving(false);
    setShowEditHeaderModal(false);
    setSavedSuccessMsg('تم حفظ وتعديل النصوص بنجاح!');
    setTimeout(() => setSavedSuccessMsg(null), 3500);
  };

  const handleResetToDefault = () => {
    setEditHeaderTitle(DEFAULT_ABOUT.pageHeaderTitle!);
    setEditHeaderBadge(DEFAULT_ABOUT.pageHeaderBadge!);
    setEditHeaderSubtitle(DEFAULT_ABOUT.pageHeaderSubtitle!);
    setEditOverviewTitle(DEFAULT_ABOUT.overviewTitle!);
    setEditOverviewContent(DEFAULT_ABOUT.overviewContent);
    setEditVisionTitle(DEFAULT_ABOUT.visionTitle!);
    setEditVisionContent(DEFAULT_ABOUT.visionContent);
    setEditMissionTitle(DEFAULT_ABOUT.missionTitle!);
    setEditMissionContent(DEFAULT_ABOUT.missionContent);
    setInlineTitle(DEFAULT_ABOUT.pageHeaderTitle!);
  };

  const openModalAtTab = (tab: 'header' | 'overview' | 'vision' | 'mission') => {
    setModalActiveTab(tab);
    setShowEditHeaderModal(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300 relative" dir="rtl">
      {/* Success Feedback Notification */}
      {savedSuccessMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="relative bg-[#12281e] px-4 py-5 sm:px-8 sm:py-7 text-white rounded-2xl sm:rounded-3xl shadow-md overflow-hidden border border-emerald-900/60">
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3 sm:gap-5 w-full md:w-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-xs shrink-0 mt-1 sm:mt-0">
              <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                  {data.pageHeaderBadge || DEFAULT_ABOUT.pageHeaderBadge}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {data.pageHeaderSubtitle || DEFAULT_ABOUT.pageHeaderSubtitle}
                </span>
              </div>

              {/* Title Section with Direct Inline Editing and Modal trigger */}
              {isInlineEditing ? (
                <div className="flex items-center gap-2 flex-wrap my-1">
                  <input
                    type="text"
                    value={inlineTitle}
                    onChange={(e) => setInlineTitle(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-base sm:text-xl font-bold border-2 border-emerald-400 focus:outline-hidden min-w-[240px] sm:min-w-[320px]"
                    autoFocus
                    placeholder="اكتب عنوان الصفحة هنا..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveAll({ pageHeaderTitle: inlineTitle });
                      } else if (e.key === 'Escape') {
                        setIsInlineEditing(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSaveAll({ pageHeaderTitle: inlineTitle })}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ</span>
                  </button>
                  <button
                    onClick={() => {
                      setInlineTitle(data.pageHeaderTitle || DEFAULT_ABOUT.pageHeaderTitle!);
                      setIsInlineEditing(false);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                    <span>إلغاء</span>
                  </button>
                </div>
              ) : (
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap group pt-3.5 sm:pt-4">
                  <span
                    onClick={() => setIsInlineEditing(true)}
                    className="relative inline-flex items-center gap-2 cursor-pointer hover:text-emerald-300 transition-colors border-b-2 border-dashed border-emerald-400/40 hover:border-emerald-300 pb-0.5 select-all group/title"
                    title="انقر هنا أو على القلم لتعديل هذا الكلام بحرية"
                  >
                    {/* نظام قلم فوق الكلام مباشرة لتعديل النص بحرية */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInlineEditing(true);
                      }}
                      className="absolute -top-7 right-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[11px] font-bold shadow-md border border-emerald-300/70 transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in"
                      title="تعديل هذا العنوان بالقلم"
                    >
                      <Edit3 className="w-3 h-3 text-emerald-200 animate-pulse" />
                      <span>تعديل هذا الكلام ✍️</span>
                    </span>

                    {/* Pen icon indicator right beside the text */}
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-emerald-100 hover:text-white border border-emerald-400/50 shadow-xs transition-transform group-hover/title:scale-110 shrink-0">
                      <Edit3 className="w-3.5 h-3.5" />
                    </span>

                    <span className="leading-snug">{data.pageHeaderTitle || DEFAULT_ABOUT.pageHeaderTitle}</span>
                  </span>

                  {/* Instant Quick Edit Buttons */}
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      id="btn-edit-inline-title"
                      onClick={() => setIsInlineEditing(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white border border-white/15 transition-all text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                      title="تعديل العنوان مباشرة"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>تعديل سريع</span>
                    </button>

                    <button
                      id="btn-edit-about-header-text"
                      onClick={() => openModalAtTab('header')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 transition-all text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                      title="تعديل كافة نصوص الصفحة بحرية"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      <span>تعديل كافة النصوص</span>
                    </button>
                  </div>
                </h2>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-white/10 overflow-x-auto no-scrollbar touch-scroll overscroll-x-contain pb-1 text-xs sm:text-sm">
          <button
            id="about-tab-all"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
            }`}
          >
            عرض الكل
          </button>
          <button
            id="about-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            النبذة التعريفية
          </button>
          <button
            id="about-tab-vision"
            onClick={() => setActiveTab('vision-mission')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'vision-mission'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            الرؤية والرسالة
          </button>
          {activeCustomSections.length > 0 && (
            <button
              id="about-tab-custom"
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                activeTab === 'custom'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              محاور إضافية ({activeCustomSections.length})
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="space-y-6">
        {/* Card 1: Overview (النبذة التعريفية) */}
        {(activeTab === 'all' || activeTab === 'overview') && (
          <div
            id="about-card-overview"
            className="relative p-4 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-500/30 transition-all group"
          >
            <div className="absolute top-0 right-0 w-1.5 sm:w-2 h-full bg-linear-to-b from-emerald-600 to-[#12281e] rounded-r-2xl" />

            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
              </div>
              <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <span>{data.overviewTitle || DEFAULT_ABOUT.overviewTitle}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      المرجع الذكي
                    </span>
                    <button
                      onClick={() => openModalAtTab('overview')}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      title="تعديل النبذة التعريفية"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs sm:text-base text-slate-700 leading-relaxed font-normal text-justify whitespace-pre-line">
                  {data.overviewContent}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards 2 & 3: Vision & Mission (الرؤية والرسالة) */}
        {(activeTab === 'all' || activeTab === 'vision-mission') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Vision Card */}
            <div
              id="about-card-vision"
              className="relative p-4 sm:p-6 rounded-2xl bg-linear-to-br from-amber-50/70 via-white to-white border border-amber-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 border border-amber-300/80 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-amber-800 uppercase block">
                        Vision
                      </span>
                      <h4 className="text-sm sm:text-lg font-black text-slate-900">
                        {data.visionTitle || DEFAULT_ABOUT.visionTitle}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => openModalAtTab('vision')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100/60 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300/60 transition-colors cursor-pointer"
                    title="تعديل الرؤية"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                  {data.visionContent}
                </p>
              </div>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-amber-100 flex items-center gap-2 text-[11px] sm:text-xs font-bold text-amber-900">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                <span>ريادة الحلول المالية والتشريعية في فلسطين</span>
              </div>
            </div>

            {/* Mission Card */}
            <div
              id="about-card-mission"
              className="relative p-4 sm:p-6 rounded-2xl bg-linear-to-br from-emerald-50/70 via-white to-white border border-emerald-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 border border-emerald-300/80 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                      <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-emerald-800 uppercase block">
                        Mission
                      </span>
                      <h4 className="text-sm sm:text-lg font-black text-slate-900">
                        {data.missionTitle || DEFAULT_ABOUT.missionTitle}
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => openModalAtTab('mission')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100/60 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300/60 transition-colors cursor-pointer"
                    title="تعديل الرسالة"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                  {data.missionContent}
                </p>
              </div>
              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-emerald-100 flex items-center gap-2 text-[11px] sm:text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span>دقة تشريعية وسرعة إنجاز موثوقة</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Custom Sections */}
        {(activeTab === 'all' || activeTab === 'custom') && activeCustomSections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800">
              <Layers className="w-4 h-4 text-[#12281e]" />
              <span>محاور وقيم إضافية</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCustomSections.map((sec, idx) => (
                <div
                  key={sec.id || idx}
                  id={`about-custom-sec-${sec.id || idx}`}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      {getIconComponent(sec.icon)}
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900">
                      {sec.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {sec.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>منظومة «سَنَد» الذكية</span>
          <span>•</span>
          <span>دولة فلسطين 🇵🇸</span>
        </div>

        <div className="flex items-center gap-2.5">
          {!isLoggedIn && onOpenLogin && (
            <button
              id="about-view-login-btn"
              onClick={() => onOpenLogin()}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer"
            >
              تسجيل الدخول
            </button>
          )}

          {!isLoggedIn && onOpenRegister && (
            <button
              id="about-view-register-btn"
              onClick={() => onOpenRegister()}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#12281e] text-white hover:bg-[#1a382b] transition-all cursor-pointer shadow-xs"
            >
              إنشاء حساب جديد
            </button>
          )}
        </div>
      </div>

      {/* FULL CUSTOMIZATION MODAL: User can change ANY text freely! */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-right animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#12281e] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Edit3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">تعديل نصوص صفحة «عن المنصة»</h3>
                  <p className="text-[11px] text-slate-300">يمكنك تعديل أي عنوان أو فقرة أو نص هنا بكل حرية</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditHeaderModal(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 px-5 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar text-xs font-bold">
              <button
                onClick={() => setModalActiveTab('header')}
                className={`px-3 py-2 rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  modalActiveTab === 'header'
                    ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs font-black'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                الترويسة والعنوان
              </button>
              <button
                onClick={() => setModalActiveTab('overview')}
                className={`px-3 py-2 rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  modalActiveTab === 'overview'
                    ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs font-black'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                النبذة التعريفية
              </button>
              <button
                onClick={() => setModalActiveTab('vision')}
                className={`px-3 py-2 rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  modalActiveTab === 'vision'
                    ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs font-black'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                الرؤية (Vision)
              </button>
              <button
                onClick={() => setModalActiveTab('mission')}
                className={`px-3 py-2 rounded-t-xl transition-all border-b-2 cursor-pointer ${
                  modalActiveTab === 'mission'
                    ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs font-black'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                الرسالة (Mission)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Tab 1: Header */}
              {modalActiveTab === 'header' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>عنوان الصفحة الرئيسي (Title):</span>
                      <span className="text-[10px] text-slate-400">النص البارز في الترويسة</span>
                    </label>
                    <input
                      type="text"
                      value={editHeaderTitle}
                      onChange={(e) => setEditHeaderTitle(e.target.value)}
                      placeholder="مثال: عن منصة «سَنَد» الذكية"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm font-bold text-slate-900 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        الشارة العلوية (Badge):
                      </label>
                      <input
                        type="text"
                        value={editHeaderBadge}
                        onChange={(e) => setEditHeaderBadge(e.target.value)}
                        placeholder="مثال: PS المنظومة الوطنية الأولى"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-medium text-slate-900 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        الوصف الفرعي (Subtitle):
                      </label>
                      <input
                        type="text"
                        value={editHeaderSubtitle}
                        onChange={(e) => setEditHeaderSubtitle(e.target.value)}
                        placeholder="مثال: تشريعات، ضرائب، وتدقيق مالي ذكي"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-medium text-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  {/* Live Mini Preview */}
                  <div className="p-3.5 rounded-2xl bg-[#12281e] text-white space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-300 block">معاينة مباشرة للترويسة:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        {editHeaderBadge || 'شارة تجريبية'}
                      </span>
                      <span className="text-[10px] text-slate-300">
                        {editHeaderSubtitle || 'وصف فرعي'}
                      </span>
                    </div>
                    <div className="text-lg font-black text-white">
                      {editHeaderTitle || 'عنوان تجريبي'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Overview */}
              {modalActiveTab === 'overview' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عنوان بطاقة النبذة:</label>
                    <input
                      type="text"
                      value={editOverviewTitle}
                      onChange={(e) => setEditOverviewTitle(e.target.value)}
                      placeholder="مثال: عن منصة «سَنَد»"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm font-bold text-slate-900 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نص النبذة التعريفية بالكامل:</label>
                    <textarea
                      rows={6}
                      value={editOverviewContent}
                      onChange={(e) => setEditOverviewContent(e.target.value)}
                      placeholder="اكتب النبذة التعريفية هنا..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm text-slate-900 leading-relaxed transition-all resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Vision */}
              {modalActiveTab === 'vision' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عنوان الرؤية:</label>
                    <input
                      type="text"
                      value={editVisionTitle}
                      onChange={(e) => setEditVisionTitle(e.target.value)}
                      placeholder="مثال: رؤيتنا (Vision)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-bold text-slate-900 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نص الرؤية بالكامل:</label>
                    <textarea
                      rows={5}
                      value={editVisionContent}
                      onChange={(e) => setEditVisionContent(e.target.value)}
                      placeholder="اكتب نص الرؤية هنا..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm text-slate-900 leading-relaxed transition-all resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Mission */}
              {modalActiveTab === 'mission' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عنوان الرسالة:</label>
                    <input
                      type="text"
                      value={editMissionTitle}
                      onChange={(e) => setEditMissionTitle(e.target.value)}
                      placeholder="مثال: رسالتنا (Mission)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm font-bold text-slate-900 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نص الرسالة بالكامل:</label>
                    <textarea
                      rows={5}
                      value={editMissionContent}
                      onChange={(e) => setEditMissionContent(e.target.value)}
                      placeholder="اكتب نص الرسالة هنا..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm text-slate-900 leading-relaxed transition-all resize-y"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <button
                onClick={handleResetToDefault}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="استعادة النصوص الافتراضية الأصلية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الأصلي</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditHeaderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAll()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#12281e] hover:bg-[#1a382b] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ كافة التعديلات'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
