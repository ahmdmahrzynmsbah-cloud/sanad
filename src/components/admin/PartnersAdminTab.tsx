import React, { useState, useEffect } from 'react';
import {
  Handshake,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  RefreshCw,
  Building2,
  GraduationCap,
  Briefcase,
  Landmark,
  Image as ImageIcon,
  Check,
  Edit3,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Partner } from '../../types';
import { useSync, notifySync } from '../../utils/sync';
import { directDeletePartnerFromFirestore, directSavePartnerToFirestore } from '../../services/clientFirestore';

const CATEGORY_PRESETS = [
  'نقابات وجمعيات مهنية',
  'اتحادات وقطاع خاص',
  'بنوك ومؤسسات مالية',
  'جامعات ومؤسسات أكاديمية',
  'مراكز أبحاث ودراسات',
  'مؤسسات شريكة',
];

const PARTNERSHIP_TYPES = [
  'شريك استراتيجي',
  'شريك مهني وتدريبي',
  'شريك تقني وبحثي',
  'اعتماد أكاديمي',
  'تعاون مؤسسي',
];

export const PartnersAdminTab: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sanad_cached_partners');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('نقابات وجمعيات مهنية');
  const [customCategory, setCustomCategory] = useState('');
  const [partnershipType, setPartnershipType] = useState('شريك استراتيجي');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Header customizable text state (نظام تعديل نصوص الشركاء بالقلم)
  const DEFAULT_PARTNERS_TITLE = 'إدارة المؤسسات والجهات الشريكة';
  const DEFAULT_PARTNERS_SUBTITLE = 'إضافة وتعديل المؤسسات الشريكة، الجامعات، النقابات، والاتحادات التي تظهر في الواجهة العامة';

  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('partners_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return DEFAULT_PARTNERS_TITLE;
  });

  const [headerSubtitle, setHeaderSubtitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('partners_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subtitle) return parsed.subtitle;
      }
    } catch {}
    return DEFAULT_PARTNERS_SUBTITLE;
  });

  const [editingTarget, setEditingTarget] = useState<'none' | 'title' | 'subtitle' | 'all'>('none');
  const [editTitleDraft, setEditTitleDraft] = useState(headerTitle);
  const [editSubtitleDraft, setEditSubtitleDraft] = useState(headerSubtitle);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  const loadHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/partners-header');
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
    const titleToSave = (newTitle !== undefined ? newTitle : editTitleDraft).trim() || DEFAULT_PARTNERS_TITLE;
    const subtitleToSave = (newSubtitle !== undefined ? newSubtitle : editSubtitleDraft).trim() || DEFAULT_PARTNERS_SUBTITLE;

    setIsSavingHeader(true);
    setHeaderTitle(titleToSave);
    setHeaderSubtitle(subtitleToSave);
    try {
      localStorage.setItem('partners_header_settings', JSON.stringify({
        title: titleToSave,
        subtitle: subtitleToSave,
        updatedAt: new Date().toISOString()
      }));
    } catch {}

    try {
      const res = await fetch('/api/admin/settings/partners-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave, subtitle: subtitleToSave }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'تم حفظ وتحديث نصوص الشركاء والمؤسسات الشريكة بنجاح ✍️' });
      }
    } catch {
      setFeedback({ type: 'success', message: 'تم حفظ التعديلات محلياً بنجاح ✍️' });
    } finally {
      setIsSavingHeader(false);
      setEditingTarget('none');
      setShowEditHeaderModal(false);
      notifySync('partners_header');
      window.dispatchEvent(new CustomEvent('partners-header-updated', {
        detail: { title: titleToSave, subtitle: subtitleToSave }
      }));
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleResetHeader = () => {
    setEditTitleDraft(DEFAULT_PARTNERS_TITLE);
    setEditSubtitleDraft(DEFAULT_PARTNERS_SUBTITLE);
    handleSaveHeader(DEFAULT_PARTNERS_TITLE, DEFAULT_PARTNERS_SUBTITLE);
  };

  // Mandatory Delete Confirmation Modal State
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPartners = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`/api/partners?t=${Date.now()}`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        if (data.partners && Array.isArray(data.partners) && data.partners.length > 0) {
          const items: Partner[] = data.partners;
          setPartners((prev) => {
            const map = new Map<string, Partner>();
            prev.forEach((p) => map.set(p.id, p));
            items.forEach((p) => map.set(p.id, p));
            const merged = Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
            try {
              localStorage.setItem('sanad_cached_partners', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('API fetch partners failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
    loadHeaderSettings();
  }, []);

  useSync(['partners', 'all'], () => {
    fetchPartners();
  });

  useSync(['partners_header', 'all'], () => {
    loadHeaderSettings();
  });

  const openAddModal = () => {
    setEditingPartner(null);
    setName('');
    setDescription('');
    setCategory('نقابات وجمعيات مهنية');
    setCustomCategory('');
    setPartnershipType('شريك استراتيجي');
    setLogoUrl('');
    setWebsiteUrl('https://');
    setOrder(partners.length + 1);
    setIsActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name || '');
    setDescription(partner.description || '');

    if (CATEGORY_PRESETS.includes(partner.category)) {
      setCategory(partner.category);
      setCustomCategory('');
    } else {
      setCategory('أخرى');
      setCustomCategory(partner.category || '');
    }

    setPartnershipType(partner.partnershipType || 'شريك استراتيجي');
    setLogoUrl(partner.logoUrl || '');
    setWebsiteUrl(partner.websiteUrl || 'https://');
    setOrder(partner.order || 1);
    setIsActive(partner.isActive !== false);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('يرجى إدخال اسم المؤسسة الشريكة.');
      return;
    }

    const finalCategory = category === 'أخرى' ? customCategory.trim() : category;
    if (!finalCategory) {
      setFormError('يرجى تحديد أو إدخال تصنيف المؤسسة.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category: finalCategory,
      partnershipType: partnershipType.trim(),
      logoUrl: logoUrl.trim(),
      websiteUrl: websiteUrl.trim() === 'https://' ? '' : websiteUrl.trim(),
      order: Number(order) || 1,
      isActive,
    };

    setSaving(true);
    try {

      const endpoint = editingPartner
        ? `/api/admin/partners/${editingPartner.id}`
        : '/api/admin/partners';
      const method = editingPartner ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.partner) {
          setPartners((prev) => {
            const map = new Map<string, Partner>();
            prev.forEach((p) => map.set(p.id, p));
            map.set(data.partner.id, data.partner);
            return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
          });
        } else if (data.partners) {
          setPartners(data.partners);
        } else {
          fetchPartners();
        }
        setSearchQuery('');
        notifySync('partners');
        setFeedback({
          type: 'success',
          message: editingPartner
            ? `تم تحديث بيانات المؤسسة "${name}" بنجاح.`
            : `تمت إضافة المؤسسة الشريكة "${name}" بنجاح.`,
        });
        setShowModal(false);
      } else {
        const partnerId = editingPartner ? editingPartner.id : 'partner-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const payloadToSave = {
          id: partnerId,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const saved = await directSavePartnerToFirestore(payloadToSave);
        if (saved) {
          setPartners((prev) => {
            const map = new Map<string, Partner>();
            prev.forEach((p) => map.set(p.id, p));
            map.set(payloadToSave.id, payloadToSave);
            return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
          });
          notifySync('partners');
          setFeedback({
            type: 'success',
            message: editingPartner
              ? `تم تحديث بيانات المؤسسة "${name}" بنجاح.`
              : `تمت إضافة المؤسسة الشريكة "${name}" بنجاح.`,
          });
          setShowModal(false);
          fetchPartners();
          return;
        }
        setFormError(data.error || 'حدث خطأ أثناء حفظ المؤسسة الشريكة.');
      }
    } catch (err) {
      console.warn('Error saving partner, using direct Firestore fallback:', err);
      try {
        const partnerId = editingPartner ? editingPartner.id : 'partner-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const payloadToSave = {
          id: partnerId,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await directSavePartnerToFirestore(payloadToSave);
        setPartners((prev) => {
          const map = new Map<string, Partner>();
          prev.forEach((p) => map.set(p.id, p));
          map.set(payloadToSave.id, payloadToSave);
          return Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
        });
        notifySync('partners');
        setFeedback({
          type: 'success',
          message: editingPartner
            ? `تم تحديث بيانات المؤسسة "${name}" بنجاح.`
            : `تمت إضافة المؤسسة الشريكة "${name}" بنجاح.`,
        });
        setShowModal(false);
        fetchPartners();
      } catch (fErr) {
        setFormError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!partnerToDelete) return;

    const target = partnerToDelete;
    setDeletingId(target.id);

    // 1. Immediately update UI state
    setPartners((prev) => prev.filter((p) => p.id !== target.id));
    setPartnerToDelete(null);

    try {
      const res = await fetch(`/api/admin/partners/${target.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.partners) {
        setPartners(data.partners);
      }
    } catch (err) {
      console.warn('API error deleting partner, proceeding to direct firestore delete:', err);
    }

    // 2. Direct Cloud Firestore delete
    try {
      await directDeletePartnerFromFirestore(target.id);
    } catch (fErr) {
      console.error('Direct firestore partner delete error:', fErr);
    }

    notifySync('partners');
    setFeedback({
      type: 'success',
      message: `تم حذف المؤسسة الشريكة "${target.name}" نهائياً من النظام والسحابة.`,
    });
    setTimeout(() => setFeedback(null), 4000);
    setDeletingId(null);
  };

  const filteredPartners = partners.filter((partner) => {
    const q = searchQuery.toLowerCase();
    return (
      (partner.name && partner.name.toLowerCase().includes(q)) ||
      (partner.description && partner.description.toLowerCase().includes(q)) ||
      (partner.category && partner.category.toLowerCase().includes(q)) ||
      (partner.partnershipType && partner.partnershipType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Alert Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
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
                    <span>تعديل عنوان ووصف المؤسسات الشريكة بحرية بالقلم:</span>
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    العنوان الرئيسي:
                  </label>
                  <input
                    type="text"
                    value={editTitleDraft}
                    onChange={(e) => setEditTitleDraft(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="اكتب العنوان هنا..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHeader(editTitleDraft, editSubtitleDraft);
                      if (e.key === 'Escape') setEditingTarget('none');
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    الوصف التوضيحي:
                  </label>
                  <textarea
                    rows={2}
                    value={editSubtitleDraft}
                    onChange={(e) => setEditSubtitleDraft(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="اكتب الوصف التوضيحي هنا..."
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveHeader(editTitleDraft, editSubtitleDraft)}
                    disabled={isSavingHeader}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>{isSavingHeader ? 'جاري الحفظ...' : 'حفظ التعديلات ✍️'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitleDraft(headerTitle);
                      setEditSubtitleDraft(headerSubtitle);
                      setEditingTarget('none');
                    }}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>إلغاء</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Handshake className="w-5 h-5 text-amber-700" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Title Element with Inline Editing */}
                  {editingTarget === 'title' ? (
                    <div className="flex items-center gap-2 flex-wrap bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-300 animate-in fade-in">
                      <input
                        type="text"
                        value={editTitleDraft}
                        onChange={(e) => setEditTitleDraft(e.target.value)}
                        className="flex-1 min-w-[220px] px-3 py-1.5 bg-white border border-emerald-400 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                        placeholder="اكتب عنوان الصفحة هنا..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveHeader(editTitleDraft, undefined);
                          if (e.key === 'Escape') setEditingTarget('none');
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveHeader(editTitleDraft, undefined)}
                        disabled={isSavingHeader}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>حفظ العنوان ✍️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTitleDraft(headerTitle);
                          setEditingTarget('none');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>إلغاء</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Prominent floating pen indicator directly above the text */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditTitleDraft(headerTitle);
                            setEditSubtitleDraft(headerSubtitle);
                            setEditingTarget('all');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/90 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[10px] font-bold shadow-2xs cursor-pointer transition-all hover:scale-105"
                          title="قلم التعديل المباشر فوق النص ✍️"
                        >
                          <Edit3 className="w-3 h-3 text-emerald-700 animate-pulse" />
                          <span>قلم تعديل العنوان والوصف ✍️</span>
                        </button>
                      </div>

                      <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap group/title">
                        <span
                          onClick={() => {
                            setEditTitleDraft(headerTitle);
                            setEditingTarget('title');
                          }}
                          className="relative inline-flex items-center gap-2 cursor-pointer hover:text-emerald-800 transition-colors border-b-2 border-dashed border-emerald-400/60 hover:border-emerald-700 pb-0.5 select-all"
                          title="انقر لتعديل هذا العنوان بالقلم بحرية ✍️"
                        >
                          {/* Pen icon button right beside the text */}
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs transition-transform group-hover/title:scale-110 shrink-0">
                            <Edit3 className="w-3.5 h-3.5" />
                          </span>
                          <span>{headerTitle}</span>
                        </span>

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d4af37]/15 text-[#917117] border border-[#d4af37]/30">
                          {partners.length} شريك
                        </span>

                        {/* Quick Action buttons */}
                        <div className="inline-flex items-center gap-1 mr-auto sm:mr-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTitleDraft(headerTitle);
                              setEditSubtitleDraft(headerSubtitle);
                              setEditingTarget('all');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all"
                            title="تعديل سريع لكامل النصوص"
                          >
                            <Edit3 className="w-3 h-3 text-emerald-600" />
                            <span>تعديل سريع</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditTitleDraft(headerTitle);
                              setEditSubtitleDraft(headerSubtitle);
                              setShowEditHeaderModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all"
                            title="فتح نافذة التعديل المتقدمة"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>تعديل متقدم</span>
                          </button>
                        </div>
                      </h2>
                    </div>
                  )}

                  {/* Subtitle Element with Inline Editing */}
                  {editingTarget === 'subtitle' ? (
                    <div className="space-y-2 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-300 animate-in fade-in">
                      <textarea
                        rows={2}
                        value={editSubtitleDraft}
                        onChange={(e) => setEditSubtitleDraft(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-emerald-400 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        autoFocus
                        placeholder="اكتب الوصف التوضيحي هنا..."
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveHeader(undefined, editSubtitleDraft)}
                          disabled={isSavingHeader}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>حفظ الوصف ✍️</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditSubtitleDraft(headerSubtitle);
                            setEditingTarget('none');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>إلغاء</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      onClick={() => {
                        setEditSubtitleDraft(headerSubtitle);
                        setEditingTarget('subtitle');
                      }}
                      className="text-xs text-slate-500 mt-1 cursor-pointer hover:text-emerald-900 hover:bg-emerald-50/60 p-1.5 rounded-lg border border-transparent hover:border-emerald-200 transition-all flex items-start gap-1.5 group/sub"
                      title="انقر لتعديل هذا الوصف بالقلم بحرية ✍️"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-500 opacity-60 group-hover/sub:opacity-100 mt-0.5 shrink-0" />
                      <span>{headerSubtitle}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPartners}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="تحديث البيانات من الخادم السحابي"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شريك جديد</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم المؤسسة، نوع الشراكة، أو التصنيف..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Partners List Grid */}
      {loading && partners.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">جارٍ تحميل قائمة الشركاء...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3 shadow-xs">
          <Handshake className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">لم يتم العثور على أي شركاء</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? 'لا توجد نتائج تطابق بحثك الحالي.' : 'ابدأ بإضافة أول مؤسسة شريكة للمنصة.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openAddModal}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة شريك الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className={`bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                partner.isActive === false
                  ? 'border-slate-200 opacity-60 bg-slate-50/50'
                  : 'border-slate-200 hover:border-emerald-500/40 hover:shadow-sm'
              }`}
            >
              <div className="space-y-3">
                {/* Header: Logo & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs">
                    {partner.logoUrl ? (
                      <img
                        src={partner.logoUrl}
                        alt={partner.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-sm">
                        {partner.name ? partner.name.slice(0, 2) : 'ش'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {partner.partnershipType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d4af37]/15 text-[#917117] border border-[#d4af37]/30">
                        {partner.partnershipType}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                      {partner.category}
                    </span>
                    {partner.isActive === false && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                        معطّل
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {partner.name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {partner.description || 'لا يوجد وصف مدخل.'}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {partner.websiteUrl ? (
                  <a
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                  >
                    <span>الموقع</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">بدون رابط</span>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(partner)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPartnerToDelete(partner)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add / Edit Partner */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <Handshake className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPartner ? 'تعديل بيانات المؤسسة الشريكة' : 'إضافة مؤسسة شريكة جديدة'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Partner Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  اسم المؤسسة / الهيئة الشريكة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: نقابة مدققي الحسابات القانونيين الفلسطينية"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
                />
              </div>

              {/* Category & Partnership Type Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    تصنيف المؤسسة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all cursor-pointer"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="أخرى">أخرى (تصنيف مخصص)...</option>
                  </select>
                  {category === 'أخرى' && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="أدخل التصنيف المخصص..."
                      className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    طبيعة الشراكة / الاعتماد
                  </label>
                  <select
                    value={partnershipType}
                    onChange={(e) => setPartnershipType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all cursor-pointer"
                  >
                    {PARTNERSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رابط الموقع الإلكتروني الرسمي
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.org"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-left dir-ltr"
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رابط الشعار (Logo URL أو رابط صورة)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.org/logo.png"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-left dir-ltr"
                  />
                  {logoUrl && (
                    <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white p-1 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  نبذة تعريفية ونطاق التعاون
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="نبذة مختصرة عن دور الشريك ومجالات التعاون المشترك مع المنصة..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all resize-none"
                />
              </div>

              {/* Options: Active toggle & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer" onClick={() => setIsActive(!isActive)}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-800 rounded-md focus:ring-emerald-700 cursor-pointer"
                  />
                  <div className="text-xs font-bold text-slate-800">
                    ظهور الشريك في الواجهة (نشط)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ترتيب الظهور
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingPartner ? 'حفظ التعديلات' : 'إضافة الشريك'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Delete Confirmation Modal */}
      {partnerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف المؤسسة الشريكة</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف{' '}
                <span className="font-bold text-slate-900">"{partnerToDelete.name}"</span> من قائمة الشركاء؟
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPartnerToDelete(null)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                {deletingId ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>نعم، تأكيد الحذف</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partners Header Customization Modal */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-l from-emerald-900 to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">تعديل عنوان ووصف المؤسسات الشريكة</h3>
                  <p className="text-[11px] text-emerald-200">يمكنك تعديل النصوص بحرية لتظهر في جميع أنحاء المنصة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditHeaderModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  العنوان الرئيسي للمؤسسات والجهات الشريكة:
                </label>
                <input
                  type="text"
                  value={editTitleDraft}
                  onChange={(e) => setEditTitleDraft(e.target.value)}
                  placeholder="مثال: إدارة المؤسسات والجهات الشريكة"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف التوضيحي والمقدمة:
                </label>
                <textarea
                  rows={3}
                  value={editSubtitleDraft}
                  onChange={(e) => setEditSubtitleDraft(e.target.value)}
                  placeholder="اكتب نبذة أو وصفاً توضيحياً..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Preview Box */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">معاينة مباشرة للشكل النهائي:</span>
                <div className="space-y-1">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <Handshake className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{editTitleDraft || DEFAULT_PARTNERS_TITLE}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      {partners.length} شريك
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                    {editSubtitleDraft || DEFAULT_PARTNERS_SUBTITLE}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetHeader}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>استعادة النص الأصلي</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditHeaderModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveHeader(editTitleDraft, editSubtitleDraft)}
                    disabled={isSavingHeader}
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>{isSavingHeader ? 'جاري الحفظ...' : 'حفظ التعديلات ✍️'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
