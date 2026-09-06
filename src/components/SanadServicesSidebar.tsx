import React, { useState } from 'react';
import {
  Sparkles,
  Scale,
  Calculator,
  ShieldCheck,
  Building2,
  GraduationCap,
  Clock,
  ExternalLink,
  ChevronLeft,
  X,
  Layers,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export interface SanadPlatformService {
  id: string;
  name: string; // e.g. "سند تاكس"
  subTitle: string; // e.g. "القوانين والضرائب والامتثال"
  badge: string; // "نشط حالياً" or "قريباً / قيد التحديث"
  status: 'active' | 'updating';
  icon: 'tax' | 'pro' | 'audit' | 'office' | 'academy';
  description: string;
  color: string;
}

export const SANAD_SERVICES: SanadPlatformService[] = [
  {
    id: 'sanad-tax',
    name: 'سند تاكس',
    subTitle: 'القوانين والضرائب والامتثال',
    badge: 'المنظومة الحالية',
    status: 'active',
    icon: 'tax',
    description: 'المستشار الذكي المعتمد في القوانين الضريبية والجمركية واللوائح والقرارات الفلسطينية.',
    color: '#10b981',
  },
  {
    id: 'sanad-pro',
    name: 'سند برو',
    subTitle: 'المحاسبة والقوائم والتحليل المالي',
    badge: 'قيد التحديث',
    status: 'updating',
    icon: 'pro',
    description: 'منظومة إعداد القوائم المالية، شجرة الحسابات، والتحليلات المحاسبية المتقدمة للشركات.',
    color: '#3b82f6',
  },
  {
    id: 'sanad-audit',
    name: 'سند أوديت',
    subTitle: 'التدقيق وإدارة أدلة المراجعة',
    badge: 'قيد التحديث',
    status: 'updating',
    icon: 'audit',
    description: 'أدوات تدقيق الحسابات وإدارة أوراق العمل ومسارات المراجعة لمدققي الحسابات القانونيين.',
    color: '#8b5cf6',
  },
  {
    id: 'sanad-office',
    name: 'سند أوفيس',
    subTitle: 'إدارة مكتب المحاسبة والعملاء',
    badge: 'قيد التحديث',
    status: 'updating',
    icon: 'office',
    description: 'منصة تنظيم ملفات العملاء، العقود، المهام المحاسبية، وتتبع الإقرارات السنوية والشهرية.',
    color: '#f59e0b',
  },
  {
    id: 'sanad-academy',
    name: 'سند أكاديمي',
    subTitle: 'دوري المحاسبين والحالات المهنية',
    badge: 'انتظرونا قريباً',
    status: 'updating',
    icon: 'academy',
    description: 'منصة التدريب والتأهيل العملي، الحالات التطبيقية ودوري المنافسات المهنية المحاسبية.',
    color: '#ec4899',
  },
];

interface SanadServicesSidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SanadServicesSidebar: React.FC<SanadServicesSidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [selectedService, setSelectedService] = useState<SanadPlatformService | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; sub: string } | null>(null);

  const handleServiceClick = (service: SanadPlatformService) => {
    if (service.status === 'active') {
      // Current system
      setShowToast({
        message: `${service.name}: أنت تعمل حالياً على هذه المنظومة`,
        sub: 'مستشارك الذكي المتكامل للضرائب والجمارك الفلسطينية جاهز لخدمتك الآن.',
      });
      setTimeout(() => setShowToast(null), 4000);
    } else {
      // Needs update / coming soon modal
      setSelectedService(service);
    }
  };

  const renderServiceIcon = (icon: SanadPlatformService['icon'], className = 'w-4 h-4') => {
    switch (icon) {
      case 'tax':
        return <Scale className={className} />;
      case 'pro':
        return <Calculator className={className} />;
      case 'audit':
        return <ShieldCheck className={className} />;
      case 'office':
        return <Building2 className={className} />;
      case 'academy':
        return <GraduationCap className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sanad-services-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* Floating Modern Left Sidebar */}
      <aside
        id="sanad-suite-services-sidebar"
        aria-label="منظومة خدمات سند الذكية"
        className={`
          fixed lg:relative top-2 lg:top-0 bottom-2 lg:bottom-0 left-2 lg:left-0
          h-[calc(100%-16px)] lg:h-full z-50
          bg-[#0d211a] text-slate-100
          border border-[#17382d]
          rounded-2xl sm:rounded-[22px]
          overflow-hidden
          flex flex-col shadow-xl lg:shadow-xs
          transition-all duration-300 ease-in-out select-none shrink-0
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-[calc(100%+16px)] lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[68px]' : 'lg:w-[270px] xl:w-[285px] w-[calc(100vw-32px)] max-w-[320px] sm:w-[305px]'}
        `}
      >
        {/* ========================================================================= */}
        {/* TOP HEADER: Suite Title + Collapse / Close buttons                        */}
        {/* ========================================================================= */}
        <div
          className={`p-3 border-b border-[#183a2f] flex items-center justify-between gap-2 ${
            isCollapsed ? 'lg:justify-center' : ''
          }`}
        >
          {/* Collapse toggle on desktop (on the left edge) */}
          <div className="flex items-center gap-1">
            <button
              id="sanad-services-toggle-collapse-btn"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isCollapsed ? 'توسيع قائمة منظومة سند' : 'طي قائمة منظومة سند'}
            >
              {isCollapsed ? (
                <PanelLeft className="w-4 h-4 text-emerald-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Close Button */}
            <button
              id="sanad-services-close-mobile-btn"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden text-right">
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">منظومة سند المتكاملة</span>
                <span className="text-[10px] text-emerald-400/90 font-medium block">حلول المحاسبة والضرائب</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1b4335] to-[#122e24] border border-[#275947] flex items-center justify-center shrink-0 shadow-xs text-[#d4af37]">
                <Layers className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SUITE SERVICES LIST                                                       */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-none">
          {!isCollapsed && (
            <div className="px-1 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#d4af37]" />
                باقات ومنظومات سند:
              </span>
              <span className="text-[10px] bg-white/5 border border-white/10 text-emerald-300 px-1.5 py-0.5 rounded-full">
                5 خدمات
              </span>
            </div>
          )}

          {SANAD_SERVICES.map((service, index) => {
            const isActive = service.status === 'active';

            if (isCollapsed) {
              return (
                <div key={service.id} className="relative group flex justify-center">
                  <button
                    onClick={() => handleServiceClick(service)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-300 shadow-xs'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {renderServiceIcon(service.icon, 'w-4 h-4')}
                  </button>

                  {/* Tooltip on collapse */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-right space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{service.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {service.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300">{service.subTitle}</div>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={service.id}
                id={`sanad-service-item-${service.id}`}
                onClick={() => handleServiceClick(service)}
                className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer group flex items-start gap-2.5 ${
                  isActive
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-white shadow-xs hover:bg-emerald-950/80'
                    : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {/* Icon Container */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${
                    isActive
                      ? 'bg-emerald-800 border-emerald-600 text-white'
                      : 'bg-black/30 border-white/10 text-slate-300 group-hover:text-amber-300 group-hover:border-amber-400/40'
                  }`}
                >
                  {renderServiceIcon(service.icon, 'w-4 h-4')}
                </div>

                {/* Service Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                      {service.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold whitespace-nowrap shrink-0 border ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                      }`}
                    >
                      {service.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300/90 font-medium mt-0.5 leading-snug line-clamp-1">
                    {service.subTitle}
                  </p>
                </div>

                {/* Arrow or status indicator */}
                <div className="shrink-0 text-slate-400 group-hover:text-white transition-colors self-center">
                  {isActive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM HELPER BANNER                                                      */}
        {/* ========================================================================= */}
        {!isCollapsed && (
          <div className="p-3 border-t border-[#183a2f] bg-black/20 text-center">
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-[#d4af37]" />
              <span>منظومات قيد التطوير والتحديث المستمر</span>
            </div>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* POPUP / MODAL: COMING SOON OR UNDER UPDATE ("قيد التحديث / انتظرونا")     */}
      {/* ========================================================================= */}
      {selectedService && (
        <div
          id="sanad-service-modal-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedService(null)}
        >
          <div
            id="sanad-service-modal-card"
            className="w-full max-w-md bg-[#0f241a] text-slate-100 border border-[#214c3c] rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-right animate-in zoom-in-95 duration-150"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Badge & Close */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>قيد التحديث والتجهيز</span>
              </span>
              <button
                onClick={() => setSelectedService(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Service Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
                {renderServiceIcon(selectedService.icon, 'w-6 h-6')}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-white">{selectedService.name}</h3>
                <p className="text-xs font-semibold text-emerald-400">{selectedService.subTitle}</p>
              </div>
            </div>

            {/* Main Message Box */}
            <div className="bg-[#081510] border border-[#1b3a2f] rounded-xl p-4 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-[#d4af37]" />
                <span>قيد التحديث .. انتظرونا قريباً!</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                يعمل الفريق التقني والمهني حالياً على تدريب واعتماد خوارزميات{' '}
                <strong className="text-white font-bold">{selectedService.name}</strong> لتتوافق بدقة فائقة مع المعايير المحاسبية والممارسات المهنية المعتمدة.
              </p>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] mt-2">
                <span className="text-[#d4af37] font-semibold">نبذة عن الخدمة: </span>
                {selectedService.description}
              </div>
            </div>

            {/* Notification Subscription Notice */}
            <div className="text-[11px] text-slate-400 flex items-center gap-2 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>سيتم إشعار جميع المشتركين المسجلين فور إطلاق الخدمة رسمياً دون أي رسوم إضافية.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 border border-emerald-500/40 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>فهمت ذلك، شكراً لكم</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification (if active clicked) */}
      {showToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] bg-[#0c241b] text-white border border-emerald-500/50 shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-md text-right">
          <div className="w-8 h-8 rounded-lg bg-emerald-800/80 border border-emerald-500/60 flex items-center justify-center text-emerald-300 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-white">{showToast.message}</div>
            <div className="text-[11px] text-slate-300 mt-0.5">{showToast.sub}</div>
          </div>
          <button
            onClick={() => setShowToast(null)}
            className="p-1 text-slate-400 hover:text-white mr-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
