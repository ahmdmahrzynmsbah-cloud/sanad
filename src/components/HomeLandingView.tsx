import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Globe,
  Handshake,
  ArrowLeft,
  Sparkles,
  Quote,
  ExternalLink,
  MessageSquare,
  Lock,
  Building2,
  FileCheck2,
  CheckCircle2,
  Clock,
  Target,
  Eye,
  PhoneCall
} from 'lucide-react';
import { SystemBranding, User } from '../types';

interface HomeLandingViewProps {
  branding?: SystemBranding;
  currentUser: User | null;
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onNavigateToSupervisors: () => void;
  onNavigateToRelatedSites: () => void;
  onNavigateToPartners?: () => void;
  onOpenAbout?: () => void;
  onOpenContact?: () => void;
  onNavigateToChat: () => void;
  lawsCount: number;
}

export const HomeLandingView: React.FC<HomeLandingViewProps> = ({
  branding,
  currentUser,
  onNavigateToAuth,
  onNavigateToSupervisors,
  onNavigateToRelatedSites,
  onNavigateToPartners,
  onOpenAbout,
  onOpenContact,
  onNavigateToChat,
  lawsCount,
}) => {
  // Founder details with robust fallbacks
  const founderName = branding?.founderName || 'المستشار القانوني أ. محمد ناصر خليل';
  const founderTitle = branding?.founderTitle || 'مستشار السياسات الجمركية والتشريعات الضريبية';
  const founderBio =
    branding?.founderBio ||
    'خبير ومستشار قانوني وتشريعي متخصص في النظم الجمركية والضريبية الفلسطينية وقوانين تشجيع الاستثمار. أسهم في صياغة ومراجعة العديد من مشاريع القرارات بقوانين واللوائح التنفيذية ومذكرات الاستئناف لدى المحاكم الجمركية والضريبية. بادر بتأسيس وتطوير هذه المنصة الرقمية الذكية لتكون مرجعاً موثقاً وحصناً قانونياً يُمكّن التجار والمكلفين والمستوردين والمواطنين من الإلمام بحقوقهم والتزاماتهم وحوافزهم التشريعية بوضوح وشفافية ودقة متناهية.';
  const founderPhotoUrl =
    branding?.founderPhotoUrl ||
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80';
  const founderQuote =
    branding?.founderQuote ||
    '«الوعي بالقانون والتشريع الضريبي والجمركي هو أولى ركائز العدالة الاقتصادية وبناء دولة المؤسسات وسيادة القانون.»';
  const siteOverview =
    branding?.siteOverview ||
    'منظومة وطنية ذكية متخصصة تعتمد على الذكاء الاصطناعي المعزز بالنصوص القانونية والقرارات بقانون المعمول بها في دولة فلسطين (مثل قانون الجمارك والمكوس رقم 1 لسنة 1962م وتعديلاته، وقرار بقانون رقم 8 لسنة 2011م بشأن ضريبة الدخل وتعديلاته، وقانون ضريبة القيمة المضافة)، لتقديم إجابات قانونية واستشارات موثقة ودقيقة للمكلفين، التجار، المستوردين، والمواطنين على مدار الساعة.';

  const systemName = branding?.systemName || 'مساعد الجمارك والضرائب الفلسطيني';
  const systemSubtitle =
    branding?.systemSubtitle ||
    'دولة فلسطين • وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل';

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8 animate-in fade-in duration-300">
      {/* 1. HERO & FOUNDER PRESENTATION: صورة المؤسس ع الشمال واسمه ومعلومات عنه وعن الموقع وأزرار الدخول والتسجيل ع اليمين */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1f1a] via-[#102d24] to-[#081814] text-white border border-[#1b4337] shadow-xl p-6 sm:p-10 lg:p-12">
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-12">
          
          {/* الجانب الأيمن: اسم المؤسس، لقبه، معلومات عنه، معلومات عن الموقع، وأزرار تسجيل الدخول وإنشاء الحساب */}
          <div className="flex-1 text-right space-y-4">
            {/* National Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>دولة فلسطين • المنظومة الرقمية الأولى</span>
              <span className="bg-[#d4af37]/20 text-[#f5d77f] px-2 py-0.5 rounded-full text-[10px]">
                {lawsCount} تشريع وقانون معتمد
              </span>
            </div>

            {/* Founder Name on the Right */}
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#d4af37] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>مؤسس ومطوّر المنظومة</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {founderName}
              </h1>
            </div>

            {/* Founder Bio / معلومات عن المؤسس */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <p>{founderBio}</p>
            </div>

            {/* Site Overview / معلومات عن الموقع */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <Building2 className="w-4 h-4 text-[#d4af37]" />
                <span>عن المنظومة والموقع:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                {siteOverview}
              </p>
            </div>

            {/* Key Platform Highlights */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>حسابات دقيقة بالشيكل</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <FileCheck2 className="w-3 h-3 text-[#d4af37]" />
                <span>إسناد قانوني بأرقام المواد</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                <span>حماية وسرية تامة</span>
              </span>
            </div>

            {/* Status indicator if user is already logged in */}
            {currentUser && (
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-xs text-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>مرحباً بك: <strong className="text-white">{currentUser.fullName || currentUser.username}</strong></span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                  {currentUser.status === 'approved' ? 'حساب معتمد' : 'قيد التدقيق'}
                </span>
              </div>
            )}

            {/* REQUIRED BUTTONS: زرار تسجيل دخول وزرار انشاء حساب وزرار المشرفين والمواقع */}
            <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
              {/* زرار تسجيل الدخول */}
              <button
                id="landing-hero-login-btn"
                onClick={() => onNavigateToAuth('login')}
                className="px-6 py-3 bg-[#d4af37] hover:bg-[#e2bd40] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-black/30 hover:shadow-black/50 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-slate-950" />
                <span>تسجيل الدخول</span>
              </button>

              {/* زرار إنشاء حساب */}
              <button
                id="landing-hero-register-btn"
                onClick={() => onNavigateToAuth('register')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer border border-emerald-400/30"
              >
                <UserPlus className="w-4 h-4 text-[#f5d77f]" />
                <span>إنشاء حساب جديد</span>
              </button>

              {/* Navigation to Supervisors */}
              <button
                id="landing-hero-supervisors-btn"
                onClick={onNavigateToSupervisors}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/15 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#d4af37]" />
                <span>هيئة المشرفين</span>
              </button>

              {/* Navigation to Related Sites */}
              <button
                id="landing-hero-related-sites-btn"
                onClick={onNavigateToRelatedSites}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/15 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Globe className="w-4 h-4 text-[#d4af37]" />
                <span>مواقع ذات صلة</span>
              </button>

              {/* Navigation to About Platform Modal */}
              {onOpenAbout && (
                <button
                  id="landing-hero-about-btn"
                  onClick={onOpenAbout}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-[#d4af37]/40 hover:border-[#d4af37]/80 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="الرؤية"
                >
                  <Eye className="w-4 h-4 text-[#d4af37]" />
                  <span>الرؤية</span>
                </button>
              )}

              {/* Navigation to Contact Us View */}
              {onOpenContact && (
                <button
                  id="landing-hero-contact-btn"
                  onClick={onOpenContact}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-emerald-500/40 hover:border-emerald-500/80 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="اتصل بنا وتواصل مباشر عبر واتساب"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <span>اتصل بنا</span>
                </button>
              )}
            </div>
          </div>

          {/* الجانب الأيسر: صورة المؤسس ع الشمال مع إطار احترافي وشارات واقتباس المؤسس */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col items-center text-center space-y-4">
            <div className="relative group w-full max-w-[280px]">
              {/* Luxury Accent Glow Ring */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#12281e] via-[#d4af37] to-emerald-500 rounded-3xl blur-md opacity-60 group-hover:opacity-90 transition duration-500"></div>

              {/* Photo Frame Container */}
              <div className="relative w-full aspect-square sm:h-72 rounded-2xl overflow-hidden bg-[#091512] border-2 border-white/20 shadow-2xl">
                <img
                  src={founderPhotoUrl}
                  alt={founderName}
                  className="w-full h-full object-cover object-top transition duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                {/* Bottom Overlay inside Photo */}
                <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between text-[11px] text-white/95 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                    مؤسس المنظومة
                  </span>
                  <span className="text-emerald-400 font-bold">دولة فلسطين</span>
                </div>
              </div>
            </div>

            {/* Founder Quote Card */}
            {founderQuote && (
              <div className="w-full max-w-[280px] p-3.5 bg-white/5 rounded-2xl border border-white/10 relative text-right backdrop-blur-xs">
                <Quote className="w-5 h-5 text-[#d4af37]/40 absolute top-2 left-2.5 rotate-180" />
                <p className="text-[11px] sm:text-xs text-slate-300 font-medium italic leading-relaxed pr-1 pl-4">
                  {founderQuote}
                </p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* BOTTOM NAVIGATION TILES: LINK TO SUPERVISORS, RELATED SITES & PARTNERS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supervisors Tile */}
        <div
          onClick={onNavigateToSupervisors}
          className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-4"
        >
          <div className="space-y-2 text-right">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
              هيئة المشرفين والخبراء القانونيين
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              استعرض قائمة المشرفين والخبراء المعتمدين في التدقيق والمراجعة التشريعية وتخصصاتهم القانونية والضريبية.
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 group-hover:-translate-x-1 transition-all shrink-0 mt-2" />
        </div>

        {/* Related Sites Tile */}
        <div
          onClick={onNavigateToRelatedSites}
          className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-4"
        >
          <div className="space-y-2 text-right">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
              دليل المواقع والمنصات ذات الصلة
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              روابط وبوابات رسمية تابعة لوزارة المالية، ديوان الفتوى والتشريع، والدوائر الاقتصادية والجمركية في فلسطين.
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-700 group-hover:-translate-x-1 transition-all shrink-0 mt-2" />
        </div>

        {/* Partners Tile */}
        <div
          onClick={onNavigateToPartners}
          className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-amber-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-4"
        >
          <div className="space-y-2 text-right">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Handshake className="w-5 h-5 text-[#d4af37] group-hover:text-white" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
              شركاؤنا والمؤسسات الشريكة
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              استعرض شبكة الهيئات والجامعات والمؤسسات والشركات الشريكة في نشر الثقافة والوعي القانوني.
            </p>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-amber-700 group-hover:-translate-x-1 transition-all shrink-0 mt-2" />
        </div>
      </section>
    </div>
  );
};
