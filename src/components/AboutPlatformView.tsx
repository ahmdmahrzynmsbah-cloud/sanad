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
} from 'lucide-react';
import { PlatformAboutData, AboutSectionCard } from '../types';

interface AboutPlatformViewProps {
  aboutData?: PlatformAboutData | null;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenLaws?: () => void;
  isLoggedIn?: boolean;
}

const DEFAULT_ABOUT: PlatformAboutData = {
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
  switch (iconName?.toLowerCase()) {
    case 'target':
      return <Target className="w-5 h-5" />;
    case 'eye':
      return <Eye className="w-5 h-5" />;
    case 'compass':
      return <Compass className="w-5 h-5" />;
    case 'shield':
    case 'shield-check':
      return <ShieldCheck className="w-5 h-5" />;
    case 'award':
      return <Award className="w-5 h-5" />;
    case 'users':
      return <Users className="w-5 h-5" />;
    case 'building':
      return <Building2 className="w-5 h-5" />;
    case 'scale':
      return <Scale className="w-5 h-5" />;
    case 'sparkles':
      return <Sparkles className="w-5 h-5" />;
    case 'book':
      return <BookOpen className="w-5 h-5" />;
    case 'handshake':
      return <HeartHandshake className="w-5 h-5" />;
    default:
      return <Layers className="w-5 h-5" />;
  }
};

export const AboutPlatformView: React.FC<AboutPlatformViewProps> = ({
  aboutData,
  onOpenLogin,
  onOpenRegister,
  onOpenLaws,
  isLoggedIn,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'overview' | 'vision-mission' | 'custom'>('all');
  const [data, setData] = useState<PlatformAboutData>(aboutData || DEFAULT_ABOUT);

  useEffect(() => {
    if (aboutData) {
      setData(aboutData);
    } else {
      // Fetch latest from API if not passed
      fetch('/api/system/about')
        .then((res) => (res.ok ? res.json() : DEFAULT_ABOUT))
        .then((resData) => {
          if (resData && resData.overviewContent) {
            setData(resData);
          }
        })
        .catch(() => {
          setData(DEFAULT_ABOUT);
        });
    }
  }, [aboutData]);

  const activeCustomSections = (data.customSections || []).filter(
    (sec) => sec.isActive !== false && sec.id !== 'sec-goals' && sec.id !== 'sec-values'
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6 lg:space-y-8 animate-in fade-in duration-300" dir="rtl">
      {/* Top Banner */}
      <div className="relative bg-linear-to-r from-[#12281e] via-[#1a382b] to-[#12281e] px-4 py-5 sm:px-8 sm:py-7 text-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-[#d4af37]/30">
        {/* Subtle Islamic pattern or luxury accent */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-5 w-full md:w-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-linear-to-br from-[#d4af37]/30 to-[#d4af37]/10 border border-[#d4af37]/50 flex items-center justify-center shadow-lg shrink-0">
              <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-[#d4af37]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-[#d4af37] text-[#12281e]">
                  PS المنظومة الوطنية الأولى
                </span>
                <span className="text-[10px] sm:text-[11px] text-emerald-300 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  تشريعات، ضرائب، وتدقيق مالي ذكي
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>عن منصة «سَنَد» الذكية</span>
              </h2>
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
                ? 'bg-[#d4af37] text-[#12281e] shadow-md'
                : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            عرض الكل
          </button>
          <button
            id="about-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-[#d4af37] text-[#12281e] shadow-md'
                : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
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
                ? 'bg-[#d4af37] text-[#12281e] shadow-md'
                : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
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
                  ? 'bg-[#d4af37] text-[#12281e] shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
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
                      <span>{data.overviewTitle || 'عن منصة «سَنَد»'}</span>
                    </h3>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      المرجع الذكي
                    </span>
                  </div>
                  <p className="text-xs sm:text-base text-slate-700 leading-relaxed font-normal text-justify">
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
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 border border-amber-300/80 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-amber-800 uppercase block">Vision</span>
                      <h4 className="text-sm sm:text-lg font-black text-slate-900">
                        {data.visionTitle || 'رؤيتنا (Vision)'}
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
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
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 border border-emerald-300/80 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                      <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-emerald-800 uppercase block">Mission</span>
                      <h4 className="text-sm sm:text-lg font-black text-slate-900">
                        {data.missionTitle || 'رسالتنا (Mission)'}
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
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
                onClick={() => {
                  onOpenLogin();
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer"
              >
                تسجيل الدخول
              </button>
            )}

            {!isLoggedIn && onOpenRegister && (
              <button
                id="about-view-register-btn"
                onClick={() => {
                  onOpenRegister();
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#12281e] text-white hover:bg-[#1a382b] transition-all cursor-pointer shadow-xs"
              >
                إنشاء حساب جديد
              </button>
            )}
          </div>
        </div>
    </div>
  );
};
