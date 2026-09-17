import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  UserPlus,
  PhoneCall,
  ExternalLink,
  Zap,
  ArrowLeft,
  Clock,
  FileCheck2,
  Building2,
  CreditCard,
} from 'lucide-react';
import { SubscriptionPlan, User, SystemBranding } from '../types';
import { useSync } from '../utils/sync';
import { directFetchSubscriptionPlansFromFirestore } from '../services/clientFirestore';

interface SubscriptionPlansSectionProps {
  initialPlans?: SubscriptionPlan[];
  currentUser: User | null;
  branding?: SystemBranding;
  onNavigateToAuth: (mode: 'login' | 'register') => void;
  onOpenContact?: () => void;
}

const DEFAULT_FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-trial',
    name: 'الخطة التجريبية (المجانية)',
    badge: 'تجربة مجانية',
    price: 0,
    currency: '₪',
    billingPeriod: 'لمدة 7 أيام',
    description: 'استكشف قوة الذكاء الاصطناعي التشريعي وسهولة الاستعلام عن القوانين الفلسطينية مجاناً دون أي التزام.',
    features: [
      'الوصول لجميع نصوص القوانين والتشريعات (52+ قانون وقرار بقانون)',
      'استشارات ذكية وفورية مع المستشار القانوني سَنَد 24/7',
      'تخريج أرقام المواد والفقرات القانونية مع كل إجابة',
      'دعم العمل المزدوج عبر الهواتف الذكية وأجهزة الكمبيوتر',
    ],
    notIncludedFeatures: [
      'تصدير المذكرات والاستشارات بصيغ رسمية قابلة للطباعة',
      'دعم واستشارات مخصصة لملفات التدقيق والمقاصة المعقدة',
    ],
    isPopular: false,
    buttonText: 'ابدأ تجربتك المجانية الآن',
    buttonActionType: 'register',
    order: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-pro',
    name: 'الباقة الاحترافية (المحاسبون والمحامون)',
    badge: 'الأكثر طلباً',
    price: 99,
    currency: '₪',
    billingPeriod: 'شهرياً',
    description: 'الخيار الموصى به للمحاسبين القانونيين، المحامين، المستشارين الضريبيين وأصحاب الأعمال.',
    features: [
      'استعلامات واستشارات غير محدودة على مدار الساعة',
      'تغطية شاملة لكافة قوانين الجمارك، ضريبة الدخل، وضريبة القيمة المضافة',
      'محاكاة حسابية فورية للضرائب والجمارك الفلسطينية بالشيكل',
      'تصدير وتوثيق المذكرات والاستشارات القانونية والضريبية',
      'إمكانية تقديم اقتراحات وإضافة قوانين ولوائح تنظيمية جديدة للمراجعة',
      'دعم فني واستشاري ذو أولوية مباشرة عبر واتساب',
    ],
    notIncludedFeatures: [],
    isPopular: true,
    buttonText: 'اشترك في الباقة الاحترافية',
    buttonActionType: 'whatsapp',
    whatsappCustomMessage: 'مرحباً، أود الاشتراك في الباقة الاحترافية (المحاسبون والمحامون) في منصة مساعد الجمارك والضرائب الفلسطينية',
    order: 2,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-enterprise',
    name: 'باقة الشركات والمؤسسات الكبرى',
    badge: 'للشركات والمصانع',
    price: 249,
    currency: '₪',
    billingPeriod: 'شهرياً',
    description: 'حلول تشريعية وضريبية وجمركية متقدمة للشركات الوطنية الكبرى، المصانع، والمكاتب الاستشارية متعددة الفروع.',
    features: [
      'كل مميزات الباقة الاحترافية مع صلاحيات وصول متعددة لفريق العمل',
      'استشارات متقدمة في التجارة الخارجية وملفات المقاصة والبيانات الجمركية',
      'أرشفة مركزية لتقارير واستفسارات الفريق مع سجل زمني كامل',
      'إسناد تشريعي لاتفاقيات التجارة الحرة والتعرفة الجمركية التفضيلية',
      'مدير حساب استشاري مخصص وجلسات تدريب وتأهيل لفريق المحاسبة',
    ],
    notIncludedFeatures: [],
    isPopular: false,
    buttonText: 'تواصل للاشتراك المؤسسي',
    buttonActionType: 'whatsapp',
    whatsappCustomMessage: 'مرحباً، نود الاستفسار والاشتراك في باقة الشركات والمؤسسات الكبرى في منصة مساعد الجمارك والضرائب الفلسطينية',
    order: 3,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const SubscriptionPlansSection: React.FC<SubscriptionPlansSectionProps> = ({
  initialPlans,
  currentUser,
  branding,
  onNavigateToAuth,
  onOpenContact,
}) => {
  const [currentBranding, setCurrentBranding] = useState<SystemBranding | undefined>(() => {
    if (branding) return branding;
    try {
      const cached = localStorage.getItem('sanad_custom_branding');
      if (cached) return JSON.parse(cached);
    } catch {}
    return undefined;
  });

  useEffect(() => {
    if (branding) {
      setCurrentBranding(branding);
    }
  }, [branding]);

  useEffect(() => {
    const handleBrandingUpdated = (e?: any) => {
      if (e?.detail) {
        setCurrentBranding((prev) => ({ ...prev, ...e.detail }));
      } else {
        try {
          const cached = localStorage.getItem('sanad_custom_branding');
          if (cached) setCurrentBranding(JSON.parse(cached));
        } catch {}
      }
    };

    window.addEventListener('sanad_branding_updated', handleBrandingUpdated);
    window.addEventListener('storage', handleBrandingUpdated);

    return () => {
      window.removeEventListener('sanad_branding_updated', handleBrandingUpdated);
      window.removeEventListener('storage', handleBrandingUpdated);
    };
  }, []);

  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => {
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('sanad_deleted_plan_ids') || '[]');
    } catch {}

    if (initialPlans && Array.isArray(initialPlans)) {
      return initialPlans.filter((p) => !deletedIds.includes(p.id));
    }

    try {
      const cached = localStorage.getItem('admin_cached_plans');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => !deletedIds.includes(p.id));
        }
      }
    } catch {}

    return DEFAULT_FALLBACK_PLANS.filter((p) => !deletedIds.includes(p.id));
  });

  const [isLoading, setIsLoading] = useState<boolean>(!initialPlans);
  const [whatsappPhone, setWhatsappPhone] = useState<string>('970599000000');

  // Load plans from API or Firestore
  useEffect(() => {
    let isMounted = true;

    async function loadPlans() {
      let deletedIds: string[] = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem('sanad_deleted_plan_ids') || '[]');
      } catch {}

      try {
        // Fetch plans from API
        const plansRes = await fetch('/api/subscription-plans');
        if (plansRes.ok) {
          const data = await plansRes.json();
          if (data && Array.isArray(data.plans)) {
            const filtered = data.plans.filter((p: SubscriptionPlan) => !deletedIds.includes(p.id));
            if (isMounted) {
              setPlans(filtered);
              setIsLoading(false);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch plans from API, checking fallback/firestore:', err);
      }

      // Check direct firestore
      try {
        const cloudPlans = await directFetchSubscriptionPlansFromFirestore();
        if (cloudPlans && Array.isArray(cloudPlans)) {
          const filtered = cloudPlans.filter((p) => p.isActive !== false && !deletedIds.includes(p.id));
          if (isMounted) {
            setPlans(filtered);
            setIsLoading(false);
          }
          return;
        }
      } catch {
        // Ignore fallback
      }

      if (isMounted) setIsLoading(false);
    }

    async function loadContact() {
      try {
        const contactRes = await fetch('/api/system/contact');
        if (contactRes.ok) {
          const cData = await contactRes.json();
          const list = cData.contactInfo?.whatsappList || [];
          if (list.length > 0 && list[0].number) {
            const cleanNum = list[0].number.replace(/[^0-9]/g, '');
            if (cleanNum && isMounted) setWhatsappPhone(cleanNum);
          }
        }
      } catch {
        // Ignore fallback
      }
    }

    loadPlans();
    loadContact();

    // Listen to real-time plan updates from admin tab
    const handlePlansUpdated = (event?: any) => {
      let deletedIds: string[] = [];
      try {
        deletedIds = JSON.parse(localStorage.getItem('sanad_deleted_plan_ids') || '[]');
      } catch {}

      if (event?.detail?.plans && Array.isArray(event.detail.plans)) {
        const filtered = event.detail.plans.filter((p: SubscriptionPlan) => !deletedIds.includes(p.id));
        setPlans(filtered);
      } else {
        loadPlans();
      }
    };

    window.addEventListener('sanad_plans_updated', handlePlansUpdated);
    window.addEventListener('storage', handlePlansUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('sanad_plans_updated', handlePlansUpdated);
      window.removeEventListener('storage', handlePlansUpdated);
    };
  }, []);

  useSync(['subscription_plans', 'contact_info', 'all'], async () => {
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('sanad_deleted_plan_ids') || '[]');
    } catch {}

    try {
      const plansRes = await fetch('/api/subscription-plans');
      if (plansRes.ok) {
        const data = await plansRes.json();
        if (data && Array.isArray(data.plans)) {
          const filtered = data.plans.filter((p: SubscriptionPlan) => !deletedIds.includes(p.id));
          setPlans(filtered);
          return;
        }
      }
    } catch {}

    try {
      const cloudPlans = await directFetchSubscriptionPlansFromFirestore();
      if (cloudPlans && Array.isArray(cloudPlans)) {
        const filtered = cloudPlans.filter((p) => p.isActive !== false && !deletedIds.includes(p.id));
        setPlans(filtered);
      }
    } catch {}
  });

  const handleAction = (plan: SubscriptionPlan) => {
    const action = plan.buttonActionType || 'register';

    if (action === 'whatsapp') {
      const defaultMsg = `مرحباً، أود الاستفسار والاشتراك في (${plan.name}) في منصة مساعد الجمارك والضرائب الفلسطينية.${
        currentUser ? `\nالمستخدم: ${currentUser.fullName || currentUser.username}` : ''
      }`;
      const message = plan.whatsappCustomMessage ? `${plan.whatsappCustomMessage}${currentUser ? ` (المستخدم: ${currentUser.fullName || currentUser.username})` : ''}` : defaultMsg;
      const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action === 'register') {
      onNavigateToAuth('register');
      return;
    }

    if (action === 'contact') {
      if (onOpenContact) {
        onOpenContact();
      } else {
        const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent('مرحباً، أود التواصل بخصوص خطط الاشتراك')}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (action === 'custom_url' && plan.buttonLink) {
      window.open(plan.buttonLink, '_blank', 'noopener,noreferrer');
      return;
    }

    // Default fallback
    onNavigateToAuth('register');
  };

  const activePlans = plans.filter((p) => p.isActive !== false);

  const sectionBadge = currentBranding?.plansSectionBadge || branding?.plansSectionBadge || 'خطط وباقات مرنة ومناسبة لكافة القطاعات';
  const sectionTitle = currentBranding?.plansSectionTitle || branding?.plansSectionTitle || 'خطط وباقات الاشتراك';
  const sectionSubtitle = currentBranding?.plansSectionSubtitle || branding?.plansSectionSubtitle || 'اختر الباقة المثالية لاحتياجاتك واستفد من مرجع ذكاء اصطناعي قانوني وضريبي فلسطيني متكامل يواكب التشريعات والقرارات والتعرفة الجمركية لحظة بلحظة.';
  const isSectionVisible = (currentBranding?.showPlansSectionInLanding ?? branding?.showPlansSectionInLanding) !== false;

  if (!isSectionVisible) {
    return null;
  }

  return (
    <section id="subscription-plans-section" className="w-full space-y-6 sm:space-y-8 my-2">
      {/* Header with Title and Badges */}
      <div className="text-center max-w-3xl mx-auto space-y-3 px-4">
        {sectionBadge && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{sectionBadge}</span>
          </div>
        )}

        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          {sectionTitle}
        </h3>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal whitespace-pre-line">
          {sectionSubtitle}
        </p>
      </div>

      {/* Plans Cards Grid or Empty State */}
      {activePlans.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <CreditCard className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-black text-slate-900">
            يتم تحديث باقات الاشتراك حالياً
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            يمكنك التواصل معنا مباشرة للاستفسار عن الباقات والعروض المخصصة.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن خطط وباقات الاشتراك المتاحة')}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-xs cursor-pointer transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>تواصل معنا عبر واتساب</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-6 lg:gap-8 items-stretch pt-2 ${
            activePlans.length === 1
              ? 'grid-cols-1 max-w-md mx-auto'
              : activePlans.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
              : 'grid-cols-1 md:grid-cols-3'
          }`}
        >
          {activePlans.map((plan) => {
            const isPopular = Boolean(plan.isPopular);
            const isFree = Number(plan.price) === 0 || plan.price === '0';

            return (
              <div
                key={plan.id}
                id={`plan-card-${plan.id}`}
                className={`relative flex flex-col justify-between rounded-3xl transition-all duration-300 ${
                  isPopular
                    ? 'bg-emerald-950 text-white border-2 border-emerald-500 shadow-xl shadow-emerald-950/20 md:-translate-y-2 lg:-translate-y-3'
                    : 'bg-white text-slate-900 border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-600'
                } p-6 sm:p-7`}
              >
                {/* Top Badge for Popular or Custom Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
                        isPopular
                          ? 'bg-emerald-500 text-white border border-emerald-400'
                          : 'bg-emerald-700 text-white border border-emerald-600'
                      }`}
                    >
                      {isPopular && <Sparkles className="w-3.5 h-3.5 text-white" />}
                      <span>{plan.badge}</span>
                    </span>
                  </div>
                )}

                {/* Card Header & Price */}
                <div className="space-y-4">
                  <div className="space-y-2 text-right">
                    <h4 className={`text-xl sm:text-2xl font-black ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </h4>
                    <p
                      className={`text-xs sm:text-sm leading-relaxed font-normal ${
                        isPopular ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Price Display */}
                  <div className={`pt-2 pb-4 border-b border-dashed ${isPopular ? 'border-emerald-800' : 'border-slate-200'}`}>
                    <div className="flex items-baseline gap-2 justify-start flex-wrap">
                      {isFree ? (
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl sm:text-4xl lg:text-5xl font-black ${isPopular ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            مجاناً
                          </span>
                          <span className={`text-xs sm:text-sm font-medium ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                            ({plan.billingPeriod || 'فترة تجريبية'})
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                            {plan.price}
                          </span>
                          <span className={`text-xl sm:text-2xl font-bold ${isPopular ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {plan.currency || '₪'}
                          </span>
                          <span className={`text-xs sm:text-sm font-medium mr-1 ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                            /{plan.billingPeriod || 'شهرياً'}
                          </span>
                        </>
                      )}
                    </div>
                    {isPopular && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                        <span>قيمة استثمارية موصى بها للمهنيين والشركات</span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 pt-1 text-right">
                    <span className={`text-xs sm:text-sm font-bold block ${isPopular ? 'text-emerald-400' : 'text-slate-900'}`}>
                      المميزات المضمنة:
                    </span>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isPopular
                                ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                          <span className={`leading-snug font-medium ${isPopular ? 'text-slate-200' : 'text-slate-800'}`}>
                            {feature}
                          </span>
                        </li>
                      ))}

                      {/* Not Included Features */}
                      {plan.notIncludedFeatures &&
                        plan.notIncludedFeatures.map((notFeat, idx) => (
                          <li key={`not-${idx}`} className="flex items-start gap-2.5 text-xs sm:text-sm">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 text-slate-400 border border-slate-200">
                              <X className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span className="line-through leading-snug font-normal text-slate-400">
                              {notFeat}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <div className={`pt-6 mt-6 border-t ${isPopular ? 'border-emerald-800/60' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    id={`plan-action-btn-${plan.id}`}
                    onClick={() => handleAction(plan)}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 ${
                      isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold hover:shadow-md'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-md'
                    }`}
                  >
                    {plan.buttonActionType === 'whatsapp' ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : plan.buttonActionType === 'contact' ? (
                      <PhoneCall className="w-4 h-4" />
                    ) : plan.buttonActionType === 'custom_url' ? (
                      <ExternalLink className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>{plan.buttonText || (isFree ? 'ابدأ التجربة المجانية' : 'اشترك الآن')}</span>
                    <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trust & Guarantee Banner */}
      <div className="bg-emerald-50/70 rounded-2xl p-4 sm:p-5 border-2 border-emerald-200/80 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center sm:text-right">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-950">تفعيل فوري وآمن</h5>
              <p className="text-xs text-slate-700 font-medium">تفعيل فوري للحساب والوصول الكامل</p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-950">إسناد تشريعي موثوق</h5>
              <p className="text-xs text-slate-700 font-medium">تخريج أرقام المواد والفقرات بدقة</p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-950">جاهزية 24/7</h5>
              <p className="text-xs text-slate-700 font-medium">استشارات ذكية وفورية دون انتظار</p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-950">ترقية أو إلغاء في أي وقت</h5>
              <p className="text-xs text-slate-700 font-medium">مرونة كاملة في إدارة اشتراكك</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
