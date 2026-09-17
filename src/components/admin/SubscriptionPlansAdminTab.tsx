import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  RefreshCw,
  Sparkles,
  Zap,
  Check,
  ArrowUp,
  ArrowDown,
  Eye,
  MessageSquare,
  UserPlus,
  PhoneCall,
  ExternalLink,
  Copy,
  Layers,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Sliders
} from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import { useSync } from '../../utils/sync';
import {
  directFetchSubscriptionPlansFromFirestore,
  directSaveSubscriptionPlanToFirestore,
  directDeleteSubscriptionPlanFromFirestore,
} from '../../services/clientFirestore';

const BILLING_PERIOD_PRESETS = [
  'شهرياً',
  'سنوياً',
  'لمدة 7 أيام',
  'لمدة 14 يوماً',
  'لمدة 3 أشهر',
  'لمدة 6 أشهر',
  'لمرة واحدة',
  'مدى الحياة',
];

const CURRENCY_PRESETS = [
  { code: '₪', label: '₪ - شيكل إسرائيلي جديد (ILS)' },
  { code: 'JOD', label: 'JOD - دينار أردني (د.أ)' },
  { code: 'USD', label: 'USD - دولار أمريكي ($)' },
  { code: 'EUR', label: 'EUR - يورو (€)' },
  { code: 'SAR', label: 'SAR - ريال سعودي (ر.س)' },
  { code: 'AED', label: 'AED - درهم إماراتي (د.إ)' },
  { code: 'QAR', label: 'QAR - ريال قطري (ر.ق)' },
  { code: 'KWD', label: 'KWD - دينار كويتي (د.ك)' },
  { code: 'BHD', label: 'BHD - دينار بحريني (د.ب)' },
  { code: 'OMR', label: 'OMR - ريال عماني (ر.ع)' },
  { code: 'EGP', label: 'EGP - جنيه مصري (ج.م)' },
  { code: 'TRY', label: 'TRY - ليرة تركية (₺)' },
  { code: 'GBP', label: 'GBP - جنيه إسترليني (£)' },
  { code: 'CAD', label: 'CAD - دولار كندي (C$)' },
  { code: 'AUD', label: 'AUD - دولار أسترالي (A$)' },
  { code: 'CHF', label: 'CHF - فرنك سويسري' },
  { code: 'CNY', label: 'CNY - يوان صيني (¥)' },
  { code: 'JPY', label: 'JPY - ين ياباني (¥)' },
  { code: 'MAD', label: 'MAD - درهم مغربي' },
  { code: 'TND', label: 'TND - دينار تونسي' },
  { code: 'DZD', label: 'DZD - دينار جزائري' },
  { code: 'IQD', label: 'IQD - دينار عراقي' },
  { code: 'LBP', label: 'LBP - ليرة لبنانية' },
  { code: 'SYP', label: 'SYP - ليرة سورية' },
  { code: 'YER', label: 'YER - ريال يمني' },
  { code: 'SDG', label: 'SDG - جنيه سوداني' },
  { code: 'LYD', label: 'LYD - دينار ليبي' },
];

export const SubscriptionPlansAdminTab: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [price, setPrice] = useState<string>('99');
  const [currency, setCurrency] = useState('₪');
  const [customCurrency, setCustomCurrency] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('شهرياً');
  const [customBillingPeriod, setCustomBillingPeriod] = useState('');
  const [description, setDescription] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState<number>(1);
  const [buttonText, setButtonText] = useState('اشترك الآن');
  const [buttonActionType, setButtonActionType] = useState<'register' | 'contact' | 'whatsapp' | 'custom_url'>('whatsapp');
  const [buttonLink, setButtonLink] = useState('');
  const [whatsappCustomMessage, setWhatsappCustomMessage] = useState('');

  // Features list state
  const [featuresText, setFeaturesText] = useState('');
  const [notIncludedText, setNotIncludedText] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete Confirmation Modal State
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Section Header Customization State (تخصيص عنوان وفقرة قسم الباقات بالرئيسية)
  const [isSectionSettingsOpen, setIsSectionSettingsOpen] = useState(true);
  const [sectionBadge, setSectionBadge] = useState('خطط وباقات مرنة ومناسبة لكافة القطاعات');
  const [sectionTitle, setSectionTitle] = useState('خطط وباقات الاشتراك');
  const [sectionSubtitle, setSectionSubtitle] = useState(
    'اختر الباقة المثالية لاحتياجاتك واستفد من مرجع ذكاء اصطناعي قانوني وضريبي فلسطيني متكامل يواكب التشريعات والقرارات والتعرفة الجمركية لحظة بلحظة.'
  );
  const [showSectionInLanding, setShowSectionInLanding] = useState(true);
  const [savingSectionHeader, setSavingSectionHeader] = useState(false);
  const [sectionHeaderSuccess, setSectionHeaderSuccess] = useState(false);

  const fetchBrandingSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        const branding = data.branding || {};
        if (branding.plansSectionBadge !== undefined) setSectionBadge(branding.plansSectionBadge || '');
        if (branding.plansSectionTitle !== undefined) setSectionTitle(branding.plansSectionTitle || '');
        if (branding.plansSectionSubtitle !== undefined) setSectionSubtitle(branding.plansSectionSubtitle || '');
        if (branding.showPlansSectionInLanding !== undefined) setShowSectionInLanding(branding.showPlansSectionInLanding !== false);
        return;
      }
    } catch {}

    try {
      const cached = localStorage.getItem('sanad_custom_branding');
      if (cached) {
        const branding = JSON.parse(cached);
        if (branding.plansSectionBadge !== undefined) setSectionBadge(branding.plansSectionBadge || '');
        if (branding.plansSectionTitle !== undefined) setSectionTitle(branding.plansSectionTitle || '');
        if (branding.plansSectionSubtitle !== undefined) setSectionSubtitle(branding.plansSectionSubtitle || '');
        if (branding.showPlansSectionInLanding !== undefined) setShowSectionInLanding(branding.showPlansSectionInLanding !== false);
      }
    } catch {}
  };

  const handleSaveSectionHeader = async () => {
    setSavingSectionHeader(true);
    setSectionHeaderSuccess(false);
    try {
      // Get current branding from localStorage or API
      let currentBranding: any = {};
      try {
        const cached = localStorage.getItem('sanad_custom_branding');
        if (cached) currentBranding = JSON.parse(cached);
      } catch {}

      const updatedBranding = {
        ...currentBranding,
        plansSectionBadge: sectionBadge.trim(),
        plansSectionTitle: sectionTitle.trim(),
        plansSectionSubtitle: sectionSubtitle.trim(),
        showPlansSectionInLanding: showSectionInLanding,
      };

      const res = await fetch('/api/admin/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBranding),
      });

      if (res.ok) {
        const data = await res.json();
        const finalBranding = data.branding || updatedBranding;
        try {
          localStorage.setItem('sanad_custom_branding', JSON.stringify(finalBranding));
        } catch {}
        window.dispatchEvent(new CustomEvent('sanad_branding_updated', { detail: finalBranding }));
        setSectionHeaderSuccess(true);
        setTimeout(() => setSectionHeaderSuccess(false), 4000);
      } else {
        // Direct local dispatch fallback
        try {
          localStorage.setItem('sanad_custom_branding', JSON.stringify(updatedBranding));
        } catch {}
        window.dispatchEvent(new CustomEvent('sanad_branding_updated', { detail: updatedBranding }));
        setSectionHeaderSuccess(true);
        setTimeout(() => setSectionHeaderSuccess(false), 4000);
      }
    } catch (e) {
      console.warn('Error saving section header:', e);
    } finally {
      setSavingSectionHeader(false);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('sanad_deleted_plan_ids') || '[]');
    } catch {}

    try {
      // First try API
      const res = await fetch('/api/subscription-plans?all=true');
      if (res.ok) {
        const data = await res.json();
        if (data.plans && Array.isArray(data.plans)) {
          const filtered = data.plans.filter((p: SubscriptionPlan) => !deletedIds.includes(p.id));
          setPlans(filtered);
          localStorage.setItem('admin_cached_plans', JSON.stringify(filtered));
          setLoading(false);
          return;
        }
      }

      // Fallback to client Firestore
      const cloudPlans = await directFetchSubscriptionPlansFromFirestore();
      if (cloudPlans && Array.isArray(cloudPlans)) {
        const filtered = cloudPlans.filter((p: SubscriptionPlan) => !deletedIds.includes(p.id));
        setPlans(filtered);
        localStorage.setItem('admin_cached_plans', JSON.stringify(filtered));
        setLoading(false);
        return;
      }

      // Fallback to localStorage
      const cached = localStorage.getItem('admin_cached_plans');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((p: any) => !deletedIds.includes(p.id));
            setPlans(filtered);
          }
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      console.warn('Failed to fetch subscription plans:', err);
      try {
        const cloudPlans = await directFetchSubscriptionPlansFromFirestore();
        if (cloudPlans && Array.isArray(cloudPlans)) {
          const filtered = cloudPlans.filter((p: SubscriptionPlan) => !deletedIds.includes(p.id));
          setPlans(filtered);
        }
      } catch {
        // Ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchBrandingSettings();
  }, []);

  useSync(['subscription_plans', 'all'], () => {
    fetchPlans();
  });

  const openAddModal = () => {
    setEditingPlan(null);
    setName('');
    setBadge('');
    setPrice('99');
    setCurrency('₪');
    setCustomCurrency('');
    setBillingPeriod('شهرياً');
    setCustomBillingPeriod('');
    setDescription('');
    setIsPopular(false);
    setIsActive(true);
    setOrder(plans.length + 1);
    setButtonText('اشترك في الباقة');
    setButtonActionType('whatsapp');
    setButtonLink('');
    setWhatsappCustomMessage('');
    setFeaturesText(
      'الوصول الشامل لكافة القوانين والقرارات بقانون\nاستشارات ذكية وفورية مع المستشار سَنَد 24/7\nتخريج أرقام المواد والفقرات القانونية مع كل إجابة\nدعم فني واستشاري مباشر عبر واتساب'
    );
    setNotIncludedText('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name || '');
    setBadge(plan.badge || '');
    setPrice(String(plan.price ?? ''));
    
    const matchedPreset = CURRENCY_PRESETS.find((c) => c.code === plan.currency);
    if (matchedPreset || !plan.currency) {
      setCurrency(plan.currency || '₪');
      setCustomCurrency('');
    } else {
      setCurrency('CUSTOM');
      setCustomCurrency(plan.currency);
    }

    if (BILLING_PERIOD_PRESETS.includes(plan.billingPeriod)) {
      setBillingPeriod(plan.billingPeriod);
      setCustomBillingPeriod('');
    } else {
      setBillingPeriod('مخصص');
      setCustomBillingPeriod(plan.billingPeriod || '');
    }
    setDescription(plan.description || '');
    setIsPopular(Boolean(plan.isPopular));
    setIsActive(plan.isActive !== false);
    setOrder(plan.order || 1);
    setButtonText(plan.buttonText || 'اشترك الآن');
    setButtonActionType(plan.buttonActionType || 'whatsapp');
    setButtonLink(plan.buttonLink || '');
    setWhatsappCustomMessage(plan.whatsappCustomMessage || '');
    setFeaturesText((plan.features || []).join('\n'));
    setNotIncludedText((plan.notIncludedFeatures || []).join('\n'));
    setFormError(null);
    setShowModal(true);
  };

  const duplicatePlan = (plan: SubscriptionPlan) => {
    setEditingPlan(null);
    setName(`${plan.name} (نسخة جديدة)`);
    setBadge(plan.badge || '');
    setPrice(String(plan.price ?? ''));

    const matchedPreset = CURRENCY_PRESETS.find((c) => c.code === plan.currency);
    if (matchedPreset || !plan.currency) {
      setCurrency(plan.currency || '₪');
      setCustomCurrency('');
    } else {
      setCurrency('CUSTOM');
      setCustomCurrency(plan.currency);
    }

    if (BILLING_PERIOD_PRESETS.includes(plan.billingPeriod)) {
      setBillingPeriod(plan.billingPeriod);
      setCustomBillingPeriod('');
    } else {
      setBillingPeriod('مخصص');
      setCustomBillingPeriod(plan.billingPeriod || '');
    }
    setDescription(plan.description || '');
    setIsPopular(false);
    setIsActive(true);
    setOrder(plans.length + 1);
    setButtonText(plan.buttonText || 'اشترك الآن');
    setButtonActionType(plan.buttonActionType || 'whatsapp');
    setButtonLink(plan.buttonLink || '');
    setWhatsappCustomMessage(plan.whatsappCustomMessage || '');
    setFeaturesText((plan.features || []).join('\n'));
    setNotIncludedText((plan.notIncludedFeatures || []).join('\n'));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('اسم الخطة مطلوب');
      return;
    }

    const finalCurrency = currency === 'CUSTOM' ? customCurrency.trim() : currency;
    if (!finalCurrency) {
      setFormError('يرجى تحديد أو كتابة رمز العملة للخطة');
      return;
    }

    const finalBillingPeriod = billingPeriod === 'مخصص' ? customBillingPeriod.trim() : billingPeriod;
    if (!finalBillingPeriod) {
      setFormError('يرجى تحديد دورة الفوترة (شهرياً، سنوياً، إلخ)');
      return;
    }

    const featuresArray = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    if (featuresArray.length === 0) {
      setFormError('يرجى كتابة ميزة واحدة على الأقل في قائمة المميزات');
      return;
    }

    const notIncludedArray = notIncludedText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const parsedPrice = price.trim() === '' ? 0 : isNaN(Number(price)) ? price.trim() : Number(price);

    const planPayload: Partial<SubscriptionPlan> = {
      name: name.trim(),
      badge: badge.trim(),
      price: parsedPrice,
      currency: finalCurrency,
      billingPeriod: finalBillingPeriod,
      description: description.trim(),
      features: featuresArray,
      notIncludedFeatures: notIncludedArray,
      isPopular,
      isActive,
      order: Number(order) || 1,
      buttonText: buttonText.trim() || 'اشترك الآن',
      buttonActionType,
      buttonLink: buttonLink.trim(),
      whatsappCustomMessage: whatsappCustomMessage.trim(),
    };

    setSaving(true);
    try {
      let savedPlan: SubscriptionPlan | null = null;
      let nextPlans: SubscriptionPlan[] = [];

      if (editingPlan) {
        // UPDATE
        const res = await fetch(`/api/admin/subscription-plans/${editingPlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planPayload),
        });

        const directUpdated: SubscriptionPlan = {
          ...editingPlan,
          ...(planPayload as SubscriptionPlan),
          updatedAt: new Date().toISOString(),
        };

        if (res.ok) {
          const data = await res.json();
          savedPlan = data.plan;
          nextPlans = data.plans || plans.map((p) => (p.id === editingPlan.id ? directUpdated : p));
        } else {
          savedPlan = directUpdated;
          nextPlans = plans.map((p) => (p.id === editingPlan.id ? directUpdated : p));
        }
        await directSaveSubscriptionPlanToFirestore(directUpdated);
        setFeedback({ type: 'success', message: `تم تحديث خطة الاشتراك "${name}" بنجاح` });
      } else {
        // CREATE
        const newId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const directCreated: SubscriptionPlan = {
          id: newId,
          ...(planPayload as SubscriptionPlan),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const res = await fetch('/api/admin/subscription-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planPayload),
        });

        if (res.ok) {
          const data = await res.json();
          savedPlan = data.plan;
          nextPlans = data.plans || [...plans, directCreated];
        } else {
          savedPlan = directCreated;
          nextPlans = [...plans, directCreated];
        }
        await directSaveSubscriptionPlanToFirestore(savedPlan || directCreated);
        setFeedback({ type: 'success', message: `تمت إضافة خطة الاشتراك الجديدة "${name}" بنجاح` });
      }

      // Remove from deleted ids if previously deleted
      if (savedPlan) {
        try {
          const deletedIdsStr = localStorage.getItem('sanad_deleted_plan_ids') || '[]';
          const deletedIds: string[] = JSON.parse(deletedIdsStr);
          const filteredDeleted = deletedIds.filter((id) => id !== savedPlan!.id);
          localStorage.setItem('sanad_deleted_plan_ids', JSON.stringify(filteredDeleted));
        } catch {}
      }

      setPlans(nextPlans);
      localStorage.setItem('admin_cached_plans', JSON.stringify(nextPlans));
      window.dispatchEvent(new CustomEvent('sanad_plans_updated', { detail: { plans: nextPlans } }));

      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      try {
        const id = editingPlan ? editingPlan.id : `plan-${Date.now()}`;
        const fallbackPlan: SubscriptionPlan = {
          id,
          ...(planPayload as SubscriptionPlan),
          createdAt: editingPlan?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await directSaveSubscriptionPlanToFirestore(fallbackPlan);
        const nextPlans = editingPlan ? plans.map((p) => (p.id === id ? fallbackPlan : p)) : [...plans, fallbackPlan];
        setPlans(nextPlans);
        localStorage.setItem('admin_cached_plans', JSON.stringify(nextPlans));
        window.dispatchEvent(new CustomEvent('sanad_plans_updated', { detail: { plans: nextPlans } }));
        setFeedback({ type: 'success', message: `تم حفظ الخطة "${name}" في قاعدة البيانات السحابية بنجاح` });
        setShowModal(false);
      } catch (directErr: any) {
        setFormError(directErr?.message || 'حدث خطأ أثناء حفظ الخطة. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    const updatedStatus = !plan.isActive;
    const updated = { ...plan, isActive: updatedStatus, updatedAt: new Date().toISOString() };
    const nextPlans = plans.map((p) => (p.id === plan.id ? updated : p));
    setPlans(nextPlans);
    localStorage.setItem('admin_cached_plans', JSON.stringify(nextPlans));
    window.dispatchEvent(new CustomEvent('sanad_plans_updated', { detail: { plans: nextPlans } }));

    try {
      await directSaveSubscriptionPlanToFirestore(updated);
      const res = await fetch(`/api/admin/subscription-plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updatedStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
          localStorage.setItem('admin_cached_plans', JSON.stringify(data.plans));
          window.dispatchEvent(new CustomEvent('sanad_plans_updated', { detail: { plans: data.plans } }));
        }
      }
      setFeedback({
        type: 'success',
        message: `تم ${updatedStatus ? 'تفعيل' : 'تعطيل'} ظهور الخطة "${plan.name}" فوراً في الواجهة`,
      });
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const newPlans = [...plans];
    const [moved] = newPlans.splice(index, 1);
    newPlans.splice(targetIndex, 0, moved);

    // Update order numbers
    newPlans.forEach((p, idx) => {
      p.order = idx + 1;
    });

    setPlans(newPlans);
    localStorage.setItem('admin_cached_plans', JSON.stringify(newPlans));
    window.dispatchEvent(new CustomEvent('sanad_plans_updated', { detail: { plans: newPlans } }));

    try {
      const orderMap = newPlans.map((p) => p.id);
      await fetch('/api/admin/subscription-plans/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderMap }),
      });
      newPlans.forEach((p) => directSaveSubscriptionPlanToFirestore(p));
    } catch (err) {
      console.warn('Reorder API failed, saving to firestore directly:', err);
      newPlans.forEach((p) => directSaveSubscriptionPlanToFirestore(p));
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    const targetPlan = planToDelete;
    const targetId = targetPlan.id;
    setDeletingId(targetId);

    // 1. Immediately remove from local state
    const remainingPlans = plans.filter((p) => p.id !== targetId);
    setPlans(remainingPlans);

    // 2. Immediately persist to localStorage
    localStorage.setItem('admin_cached_plans', JSON.stringify(remainingPlans));

    // 3. Add to deleted IDs tombstone to prevent resurrection
    try {
      const deletedIdsStr = localStorage.getItem('sanad_deleted_plan_ids') || '[]';
      const deletedIds: string[] = JSON.parse(deletedIdsStr);
      if (!deletedIds.includes(targetId)) {
        deletedIds.push(targetId);
        localStorage.setItem('sanad_deleted_plan_ids', JSON.stringify(deletedIds));
      }
    } catch {}

    // 4. Dispatch global event for instant home page update
    window.dispatchEvent(
      new CustomEvent('sanad_plans_updated', {
        detail: { deletedId: targetId, plans: remainingPlans },
      })
    );

    // 5. Delete from client Firestore directly
    try {
      await directDeleteSubscriptionPlanFromFirestore(targetId);
    } catch (fErr) {
      console.warn('Direct client firestore delete error:', fErr);
    }

    // 6. Delete from backend API
    try {
      const res = await fetch(`/api/admin/subscription-plans/${targetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plans && Array.isArray(data.plans)) {
          const filtered = data.plans.filter((p: SubscriptionPlan) => p.id !== targetId);
          setPlans(filtered);
          localStorage.setItem('admin_cached_plans', JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.warn('Server API delete warning:', err);
    }

    setFeedback({
      type: 'success',
      message: `تم حذف خطة الاشتراك "${targetPlan.name}" نهائياً من النظام والصفحة الرئيسية بنجاح`,
    });
    setPlanToDelete(null);
    setDeletingId(null);
  };

  const handleResetDefaults = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('sanad_deleted_plan_ids');
      const res = await fetch('/api/admin/subscription-plans/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
          localStorage.setItem('admin_cached_plans', JSON.stringify(data.plans));
          window.dispatchEvent(new CustomEvent('sanad_plans_updated', { detail: { plans: data.plans } }));
        }
        setFeedback({ type: 'success', message: 'تمت استعادة خطط الاشتراك الافتراضية بنجاح' });
      }
      setShowResetConfirm(false);
      fetchPlans();
    } catch (err) {
      console.error('Reset defaults error:', err);
      setFeedback({ type: 'error', message: 'فشل استعادة الخطط الافتراضية' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q)) ||
      (p.features && p.features.some((f) => f.toLowerCase().includes(q)))
    );
  });

  const activeCount = plans.filter((p) => p.isActive !== false).length;
  const popularCount = plans.filter((p) => p.isPopular).length;

  return (
    <div className="space-y-6 bg-[#F8FAFC] -m-3 sm:-m-6 p-4 sm:p-6 rounded-2xl" dir="rtl">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 text-right">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              إدارة خطط وباقات الاشتراك
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            تحكم بالأسعار، التفاصيل، المميزات، الخطة المميزة (الأكثر طلباً)، وطرق الاشتراك في الواجهة الرئيسية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={openAddModal}
            className="flex-1 md:flex-none bg-[#064E3B] hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خطة جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="استعادة الباقات الافتراضية"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">الافتراضية</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold">إجمالي الخطط</span>
            <h4 className="text-slate-900 text-2xl font-black mt-1">{plans.length}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold">الخطط المفعلة (المنشورة)</span>
            <h4 className="text-slate-900 text-2xl font-black mt-1">{activeCount}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-semibold">الخطط المميزة (الأكثر طلباً)</span>
            <h4 className="text-slate-900 text-2xl font-black mt-1">{popularCount}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Subscription Plans Landing Section Texts & Settings Customizer */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsSectionSettingsOpen(!isSectionSettingsOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:bg-slate-100/60 transition-colors cursor-pointer text-right border-b border-slate-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                تخصيص نصوص وعناوين قسم الباقات (الصفحة الرئيسية)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تعديل الشارة، العنوان الرئيسي، والفقرة الوصفية المكتوبة في الواجهة الرئيسية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${showSectionInLanding ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {showSectionInLanding ? 'القسم ظاهر' : 'القسم مخفي'}
            </span>
            {isSectionSettingsOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {isSectionSettingsOpen && (
          <div className="p-4 sm:p-6 space-y-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">حالة ظهور قسم الباقات في الصفحة الرئيسية:</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSectionInLanding}
                  onChange={(e) => setShowSectionInLanding(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">
                  {showSectionInLanding ? 'مفعّل وظاهر لجميع الزوار' : 'مخفي مؤقتاً من الصفحة الرئيسية'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  الشارة العلوية للقسم (Badge)
                </label>
                <input
                  type="text"
                  value={sectionBadge}
                  onChange={(e) => setSectionBadge(e.target.value)}
                  placeholder="خطط وباقات مرنة ومناسبة لكافة القطاعات"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  عنوان القسم الرئيسي (Title)
                </label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="خطط وباقات الاشتراك"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                الفقرة والنص التوضيحي (Description / Subtitle)
              </label>
              <textarea
                rows={3}
                value={sectionSubtitle}
                onChange={(e) => setSectionSubtitle(e.target.value)}
                placeholder="اختر الباقة المثالية لاحتياجاتك واستفد من مرجع ذكاء اصطناعي قانوني وضريبي فلسطيني متكامل يواكب التشريعات والقرارات والتعرفة الجمركية لحظة بلحظة."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                * يمكنك تعديل هذا الكلام في أي وقت ليظهر فورياً لزوار الصفحة الرئيسية دون الحاجة لإعادة تحميل الصفحة.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {sectionHeaderSuccess ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ نصوص وعناوين القسم وتطبيقها فورياً على الصفحة الرئيسية!</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">التعديلات تنعكس فورياً في الواجهة الرئيسية بعد الحفظ</span>
              )}

              <button
                type="button"
                onClick={handleSaveSectionHeader}
                disabled={savingSectionHeader}
                className="px-5 py-2 text-xs font-bold bg-[#12281e] hover:bg-[#1a3a2d] text-white rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingSectionHeader ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>حفظ وتطبيق نصوص القسم</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في خطط الاشتراك، المميزات، أو الفئات..."
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-2xs"
        />
      </div>

      {/* Plans List Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold">جاري تحميل خطط الاشتراك...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm space-y-3">
          <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">لا توجد خطط اشتراك مسجلة</h4>
          <p className="text-xs text-slate-500">قم بإضافة خطة جديدة أو استعادة الباقات الافتراضية لبدء العرض.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-2 px-4 py-2 bg-[#064E3B] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول خطة</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan, index) => {
            const isFree = Number(plan.price) === 0 || plan.price === '0';
            return (
              <div
                key={plan.id}
                className={`p-5 sm:p-6 bg-white rounded-2xl border transition-all ${
                  plan.isPopular
                    ? 'border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                    : 'border-slate-200/90 shadow-sm hover:border-slate-300'
                } flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5`}
              >
                {/* Left/Main Plan Details */}
                <div className="space-y-2.5 flex-1 text-right">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Order Controls */}
                    <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 p-0.5 rounded-lg">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, 'up')}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === plans.length - 1}
                        onClick={() => handleMoveOrder(index, 'down')}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-slate-400">#{plan.order || index + 1}</span>

                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {plan.name}
                    </h4>

                    {plan.badge && (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>{plan.badge}</span>
                      </span>
                    )}

                    {plan.isPopular && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                        الأكثر طلباً ★
                      </span>
                    )}

                    <span
                      className={`font-bold text-[11px] px-2.5 py-0.5 rounded-md ${
                        plan.isActive !== false
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {plan.isActive !== false ? 'منشور في الصفحة الرئيسية' : 'مخفي (معطل)'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl font-normal">
                    {plan.description || 'لا يوجد وصف مختصر للخطة.'}
                  </p>

                  {/* Features badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500">
                      المميزات ({plan.features?.length || 0}):
                    </span>
                    {(plan.features || []).slice(0, 3).map((feat, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                    {(plan.features?.length || 0) > 3 && (
                      <span className="text-[11px] text-emerald-700 font-bold">
                        +{plan.features.length - 3} مميزات إضافية
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Action Section */}
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                  {/* Price Tag */}
                  <div className="text-right lg:text-left">
                    <div className="flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-xl sm:text-2xl font-black text-slate-900">مجاناً</span>
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl font-black text-slate-900">
                            {plan.price}
                          </span>
                          <span className="text-sm font-bold text-emerald-700">
                            {plan.currency || '₪'}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-slate-500 font-medium">/{plan.billingPeriod || 'شهرياً'}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
                      زر الإجراء: {plan.buttonText || 'اشترك الآن'}
                    </span>
                  </div>

                  {/* Operational Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(plan)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                        plan.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={plan.isActive !== false ? 'تعطيل إخفاء الخطة' : 'تفعيل إظهار الخطة'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {plan.isActive !== false ? 'مفعل' : 'معطل'}
                      </span>
                    </button>

                    {/* Clone / Duplicate */}
                    <button
                      type="button"
                      onClick={() => duplicatePlan(plan)}
                      className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                      title="نسخ ومضاعفة الخطة"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      className="p-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                      title="تعديل تفاصيل الخطة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setPlanToDelete(plan)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition-all cursor-pointer"
                      title="حذف الخطة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingPlan ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    أدخل السعر، التفاصيل، المميزات وزر الإجراء المناسب للخطة.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Name and Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-800">
                    اسم الخطة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: الباقة الاحترافية (المحاسبون والمحامون)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-800">
                    شارة التمييز / البادج (اختياري)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="مثال: الأكثر طلباً، تجربة مجانية، للشركات"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Price, Currency, Billing Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-800">
                    السعر <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="مثال: 99 أو 0 أو مجاناً"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-500">ضع 0 للخطة المجانية أو التجريبية</span>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-800">
                    العملة <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all font-medium shadow-2xs"
                    >
                      <optgroup label="العملات الشائعة">
                        <option value="₪">₪ - شيكل إسرائيلي جديد (ILS)</option>
                        <option value="JOD">JOD - دينار أردني (د.أ)</option>
                        <option value="USD">USD - دولار أمريكي ($)</option>
                        <option value="EUR">EUR - يورو (€)</option>
                        <option value="SAR">SAR - ريال سعودي (ر.س)</option>
                        <option value="AED">AED - درهم إماراتي (د.إ)</option>
                      </optgroup>
                      <optgroup label="باقي العملات العربية والدولية">
                        {CURRENCY_PRESETS.filter(
                          (c) => !['₪', 'JOD', 'USD', 'EUR', 'SAR', 'AED'].includes(c.code)
                        ).map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.label}
                          </option>
                        ))}
                      </optgroup>
                      <option value="CUSTOM">➕ عملة مخصصة أخرى (اكتبها بنفسك)...</option>
                    </select>

                    {currency === 'CUSTOM' && (
                      <input
                        type="text"
                        value={customCurrency}
                        onChange={(e) => setCustomCurrency(e.target.value)}
                        placeholder="اكتب رمز أو اسم العملة (مثال: د.ت أو KWD أو ¥)"
                        className="w-full px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all shadow-2xs"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-800">
                    دورة الفوترة
                  </label>
                  <select
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-2xs"
                  >
                    {BILLING_PERIOD_PRESETS.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                    <option value="مخصص">دورة مخصصة أخرى...</option>
                  </select>
                </div>
              </div>

              {billingPeriod === 'مخصص' && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-800">
                    اكتب دورة الفوترة المخصصة
                  </label>
                  <input
                    type="text"
                    value={customBillingPeriod}
                    onChange={(e) => setCustomBillingPeriod(e.target.value)}
                    placeholder="مثال: لكل مشروع، أو لمدة 30 يوماً"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-800">
                  الوصف الموجز والهدف من الخطة
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر يوضح الفئة المستهدفة من هذه الباقة..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-2xs"
                />
              </div>

              {/* Features List Textarea */}
              <div className="space-y-1.5 text-right">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    قائمة المميزات المضمنة (اكتب كل ميزة في سطر منفصل) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {featuresText.split('\n').filter((l) => Boolean(l.trim())).length} ميزات
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="الوصول لكافة القوانين والتشريعات الفلسطينية&#10;استشارات ذكية وفورية 24/7 مع سَنَد&#10;تخريج أرقام المواد والفقرات بدقة..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono leading-relaxed shadow-2xs"
                />
                <span className="text-[10px] text-slate-500">كل سطر يمثل نقطة ميزة بعلامة الصح الخضراء.</span>
              </div>

              {/* Not Included Features (Optional) */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-800">
                  مميزات غير مشمولة في هذه الخطة (اختياري - تظهر مشطوبة بعلامة ✕)
                </label>
                <textarea
                  rows={2}
                  value={notIncludedText}
                  onChange={(e) => setNotIncludedText(e.target.value)}
                  placeholder="تصدير المذكرات الرسمية بصيغ قابلة للطباعة&#10;دعم استشاري مخصص للشركات الكبرى..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono leading-relaxed shadow-2xs"
                />
              </div>

              {/* Action Button Configuration */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h5 className="text-xs font-bold text-slate-800">
                  إعدادات زر الاشتراك في الكارت
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-semibold text-slate-700">
                      نص الزر
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="مثال: اشترك في الباقة، ابدأ الآن"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[11px] font-semibold text-slate-700">
                      نوع الإجراء عند النقر
                    </label>
                    <select
                      value={buttonActionType}
                      onChange={(e: any) => setButtonActionType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    >
                      <option value="whatsapp">محادثة واتساب مباشرة (مع نص مخصص)</option>
                      <option value="register">فتح نموذج إنشاء حساب جديد</option>
                      <option value="contact">فتح صفحة اتصل بنا</option>
                      <option value="custom_url">فتح رابط خارجي مخصص</option>
                    </select>
                  </div>
                </div>

                {buttonActionType === 'whatsapp' && (
                  <div className="space-y-1 text-right pt-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      رسالة واتساب التلقائية (اختياري)
                    </label>
                    <input
                      type="text"
                      value={whatsappCustomMessage}
                      onChange={(e) => setWhatsappCustomMessage(e.target.value)}
                      placeholder="مثال: مرحباً، أرغب بالاشتراك في باقة المحاسبين..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>
                )}

                {buttonActionType === 'custom_url' && (
                  <div className="space-y-1 text-right pt-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      الرابط الخارجي (URL)
                    </label>
                    <input
                      type="url"
                      value={buttonLink}
                      onChange={(e) => setButtonLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Toggles: Popular, Active & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">
                      خطة مميزة (الأكثر طلباً)
                    </span>
                    <span className="text-[10px] text-slate-500">تظهر بإطار ذهبي وتنسيق بارز</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">
                      نشر في الصفحة الرئيسية
                    </span>
                    <span className="text-[10px] text-slate-500">ظهور فوري للزوار والمستخدمين</span>
                  </div>
                </label>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-right space-y-1">
                  <label className="text-xs font-bold text-slate-800 block">
                    الترتيب الرقمي
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-all shadow-2xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#064E3B] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingPlan ? 'حفظ التعديلات' : 'إضافة الخطة الآن'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-2xl text-right space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                تأكيد حذف خطة الاشتراك
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الخطة <span className="font-bold text-slate-800">"{planToDelete.name}"</span>؟
                سيتم إزالتها نهائياً من قاعدة البيانات والصفحة الرئيسية.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {deletingId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-2xl text-right space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                استعادة خطط الاشتراك الافتراضية
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل ترغب في استعادة الباقات الثلاث الافتراضية (التجريبية المجانية، الاحترافية للمحاسبين والمحامين، وباقة الشركات والمؤسسات)؟
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResetDefaults}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الاستعادة...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تأكيد الاستعادة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
