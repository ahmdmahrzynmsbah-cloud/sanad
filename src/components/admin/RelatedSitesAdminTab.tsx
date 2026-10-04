import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Tag,
  FolderPlus,
  Check,
  Layers,
  ArrowUpDown,
  Filter,
  Edit3,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';
import { RelatedSite } from '../../types';
import { useSync, notifySync } from '../../utils/sync';
import {
  directSaveRelatedSiteToFirestore,
  directFetchRelatedSitesFromFirestore,
  directDeleteRelatedSiteFromFirestore,
} from '../../services/clientFirestore';

interface RelatedSitesAdminTabProps {
  initialSites?: RelatedSite[];
}

interface SiteCategoryItem {
  name: string;
  count: number;
}

export const RelatedSitesAdminTab: React.FC<RelatedSitesAdminTabProps> = ({
  initialSites,
}) => {
  const [sites, setSites] = useState<RelatedSite[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sanad_cached_related_sites');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return initialSites || [];
  });
  const [categories, setCategories] = useState<SiteCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: Add / Edit Site Form
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<RelatedSite | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('خدمات حكومية');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isOfficial, setIsOfficial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Header customizable text state (نظام تعديل نصوص دليل المواقع ذات الصلة بالقلم)
  const DEFAULT_SITES_TITLE = 'إدارة دليل المواقع ذات الصلة';
  const DEFAULT_SITES_SUBTITLE = 'أضف المواقع الرسمية والتشريعية وصنفها بدقة مع إمكانية عرض وفلترة وإدارة التصنيفات بسهولة.';
  const DEFAULT_SITES_EXPLANATION = 'دليل إرشادي شامل للمواقع والمنصات الحكومية والرسمية ذات الصلة بالجمارك والضرائب والتشريعات المالية والتنمية الاقتصادية في دولة فلسطين. توفر هذه الخانة الوصول السريع والمباشر للخدمات والنشرات الرسمية المعتمدة.';

  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('related_sites_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return DEFAULT_SITES_TITLE;
  });

  const [headerSubtitle, setHeaderSubtitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('related_sites_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subtitle) return parsed.subtitle;
      }
    } catch {}
    return DEFAULT_SITES_SUBTITLE;
  });

  const [headerExplanation, setHeaderExplanation] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('related_sites_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.explanationText) return parsed.explanationText;
      }
    } catch {}
    return DEFAULT_SITES_EXPLANATION;
  });

  const [editingTarget, setEditingTarget] = useState<'none' | 'title' | 'subtitle' | 'all'>('none');
  const [isEditingBoxExplanation, setIsEditingBoxExplanation] = useState(false);
  const [editTitleDraft, setEditTitleDraft] = useState(headerTitle);
  const [editSubtitleDraft, setEditSubtitleDraft] = useState(headerSubtitle);
  const [editExplanationDraft, setEditExplanationDraft] = useState(headerExplanation);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  const loadHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/related-sites-header');
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
        if (data.explanationText) {
          setHeaderExplanation(data.explanationText);
          setEditExplanationDraft(data.explanationText);
        }
      }
    } catch {}
  };

  const handleSaveHeader = async (newTitle?: string, newSubtitle?: string, newExplanation?: string) => {
    const titleToSave = (newTitle !== undefined ? newTitle : editTitleDraft).trim() || DEFAULT_SITES_TITLE;
    const subtitleToSave = (newSubtitle !== undefined ? newSubtitle : editSubtitleDraft).trim() || DEFAULT_SITES_SUBTITLE;
    const explanationToSave = (newExplanation !== undefined ? newExplanation : editExplanationDraft).trim() || DEFAULT_SITES_EXPLANATION;

    setIsSavingHeader(true);
    setHeaderTitle(titleToSave);
    setHeaderSubtitle(subtitleToSave);
    setHeaderExplanation(explanationToSave);
    try {
      localStorage.setItem('related_sites_header_settings', JSON.stringify({
        title: titleToSave,
        subtitle: subtitleToSave,
        explanationText: explanationToSave,
        updatedAt: new Date().toISOString()
      }));
    } catch {}

    try {
      const res = await fetch('/api/admin/settings/related-sites-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave, subtitle: subtitleToSave, explanationText: explanationToSave }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'تم حفظ وتحديث نصوص ودليل الشرح لدليل المواقع ذات الصلة بنجاح ✍️' });
      }
    } catch {
      setFeedback({ type: 'success', message: 'تم حفظ التعديلات محلياً بنجاح ✍️' });
    } finally {
      setIsSavingHeader(false);
      setEditingTarget('none');
      setIsEditingBoxExplanation(false);
      setShowEditHeaderModal(false);
      notifySync('related_sites_header');
      window.dispatchEvent(new CustomEvent('related-sites-header-updated', {
        detail: { title: titleToSave, subtitle: subtitleToSave }
      }));
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleResetHeader = () => {
    setEditTitleDraft(DEFAULT_SITES_TITLE);
    setEditSubtitleDraft(DEFAULT_SITES_SUBTITLE);
    handleSaveHeader(DEFAULT_SITES_TITLE, DEFAULT_SITES_SUBTITLE);
  };

  // Modal: Category Management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);
  const [savingCategoryRename, setSavingCategoryRename] = useState(false);

  // Mandatory Delete Confirmation Modal State
  const [siteToDelete, setSiteToDelete] = useState<RelatedSite | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Category to delete state
  const [categoryToDelete, setCategoryToDelete] = useState<SiteCategoryItem | null>(null);
  const [deletingCategoryName, setDeletingCategoryName] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/related-sites/categories');
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
    }
  };

  const fetchSites = async () => {
    setLoading(true);
    const map = new Map<string, RelatedSite>();

    // 1. Local cache
    try {
      const cached = localStorage.getItem('sanad_cached_related_sites');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => { if (s && s.id && s.title) map.set(s.id, s); });
        }
      }
    } catch {}

    // 2. Fetch from API
    try {
      const res = await fetch(`/api/related-sites?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.relatedSites && Array.isArray(data.relatedSites)) {
          data.relatedSites.forEach((s: any) => { if (s && s.id && s.title) map.set(s.id, s); });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch related sites from API:', err);
    }

    // 3. Direct Firestore Fallback
    try {
      const fsSites = await directFetchRelatedSitesFromFirestore();
      if (fsSites && Array.isArray(fsSites)) {
        fsSites.forEach((s: any) => { if (s && s.id && s.title) map.set(s.id, s); });
      }
    } catch (fsErr) {
      console.warn('Firestore direct fetch notice:', fsErr);
    }

    const merged = Array.from(map.values());
    if (merged.length > 0) {
      setSites(merged);
      try {
        localStorage.setItem('sanad_cached_related_sites', JSON.stringify(merged));
      } catch {}
    }
    setLoading(false);
    fetchCategories();
  };

  useEffect(() => {
    fetchSites();
    loadHeaderSettings();
  }, []);

  useSync(['related_sites', 'all'], () => {
    fetchSites();
  });

  useSync(['related_sites_header', 'all'], () => {
    loadHeaderSettings();
  });

  // Compute live counts if categories list is empty or to keep them reactive
  useEffect(() => {
    if (sites.length > 0) {
      const counts: Record<string, number> = {};
      sites.forEach((s) => {
        const cat = s.category?.trim() || 'خدمات حكومية';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      const generated = Object.keys(counts).map((name) => ({
        name,
        count: counts[name],
      }));
      setCategories((prev) => {
        const names = new Set(generated.map((g) => g.name));
        const extra = prev.filter((p) => !names.has(p.name));
        return [...generated, ...extra];
      });
    }
  }, [sites]);

  const openAddModal = () => {
    setEditingSite(null);
    setTitle('');
    setUrl('https://');
    setDescription('');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    const defaultCat = categories.length > 0 ? categories[0].name : 'خدمات حكومية';
    setCategory(defaultCat);
    setIsOfficial(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (site: RelatedSite) => {
    setEditingSite(site);
    setTitle(site.title || '');
    setUrl(site.url || 'https://');
    setDescription(site.description || '');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setCategory(site.category || 'خدمات حكومية');
    setIsOfficial(site.isOfficial !== false);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const safeTitle = title.trim();
    if (!safeTitle) {
      setFormError('يرجى إدخال اسم الموقع.');
      return;
    }

    const safeUrl = url.trim();
    if (!safeUrl || safeUrl === 'https://') {
      setFormError('يرجى إدخال رابط الموقع (URL).');
      return;
    }

    const assignedCategory = isCustomCategory
      ? customCategoryInput.trim()
      : category.trim();

    if (!assignedCategory) {
      setFormError('يرجى تحديد أو كتابة تصنيف للموقع.');
      return;
    }

    setSaving(true);
    const siteId = editingSite?.id || `site-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const siteToSave: RelatedSite = {
      id: siteId,
      title: safeTitle,
      url: safeUrl,
      description: description.trim(),
      category: assignedCategory,
      iconType: 'globe',
      isOfficial,
      createdAt: editingSite?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediate UI update & Local persistence
    setSites((prev) => {
      const exists = prev.some((s) => s.id === siteId);
      const next = exists
        ? prev.map((s) => (s.id === siteId ? siteToSave : s))
        : [siteToSave, ...prev];
      try {
        localStorage.setItem('sanad_cached_related_sites', JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Direct Cloud Firestore Save
    try {
      await directSaveRelatedSiteToFirestore(siteToSave);
    } catch (fsErr) {
      console.warn('Direct Firestore save notice:', fsErr);
    }

    // 3. API Save
    try {
      const endpoint = editingSite
        ? `/api/admin/related-sites/${editingSite.id}`
        : '/api/admin/related-sites';
      const method = editingSite ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteToSave),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.relatedSites && Array.isArray(data.relatedSites)) {
          setSites(data.relatedSites);
          try {
            localStorage.setItem('sanad_cached_related_sites', JSON.stringify(data.relatedSites));
          } catch {}
        }
      }
    } catch (apiErr) {
      console.warn('API save notice:', apiErr);
    }

    notifySync('related_sites');
    notifySync('all');
    try {
      window.dispatchEvent(new CustomEvent('sanad_related_sites_updated', { detail: siteToSave }));
    } catch {}

    setFeedback({
      type: 'success',
      message: editingSite
        ? `تم تحديث بيانات الموقع "${safeTitle}" بنجاح في تصنيف "${assignedCategory}".`
        : `تمت إضافة الموقع "${safeTitle}" بنجاح في تصنيف "${assignedCategory}".`,
    });
    setShowModal(false);
    setSaving(false);
    setTimeout(() => setFeedback(null), 4000);
    fetchCategories();
  };

  // Mandatory Delete with Confirmation
  const handleConfirmDelete = async () => {
    if (!siteToDelete) return;

    const target = siteToDelete;
    setDeletingId(target.id);

    // 1. Immediately update UI state
    setSites((prev) => prev.filter((s) => s.id !== target.id));
    setSiteToDelete(null);

    try {
      const res = await fetch(`/api/admin/related-sites/${target.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.relatedSites) {
        setSites(data.relatedSites);
      }
    } catch (err) {
      console.warn('API error deleting related site, proceeding to direct firestore delete:', err);
    }

    // 2. Direct Cloud Firestore delete
    try {
      await directDeleteRelatedSiteFromFirestore(target.id);
    } catch (fErr) {
      console.error('Direct firestore related site delete error:', fErr);
    }

    notifySync('related_sites');
    await fetchCategories();

    setFeedback({
      type: 'success',
      message: `تم حذف الموقع "${target.title}" نهائياً من النظام والسحابة.`,
    });
    setTimeout(() => setFeedback(null), 4000);
    setDeletingId(null);
  };

  // Add new category in Category Manager
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeCatName = newCategoryName.trim();
    if (!safeCatName) {
      setCategoryFeedback({ type: 'error', message: 'يرجى كتابة اسم التصنيف.' });
      return;
    }

    setAddingCategory(true);
    setCategoryFeedback(null);

    // 1. Immediate local update
    setCategories((prev) => {
      if (prev.some((c) => c.name === safeCatName)) return prev;
      return [...prev, { name: safeCatName, count: 0 }];
    });

    try {
      const res = await fetch('/api/admin/related-sites/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: safeCatName }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.warn('API add category notice:', err);
    }

    setNewCategoryName('');
    notifySync('related_sites');
    setCategoryFeedback({
      type: 'success',
      message: `تمت إضافة تصنيف "${safeCatName}" بنجاح.`,
    });
    setTimeout(() => setCategoryFeedback(null), 3000);
    setAddingCategory(false);
  };

  // Rename category in Category Manager
  const handleRenameCategory = async () => {
    if (!editingCategory || !editingCategory.newName.trim()) return;

    const oldName = editingCategory.oldName;
    const newName = editingCategory.newName.trim();

    if (oldName === newName) {
      setEditingCategory(null);
      return;
    }

    setSavingCategoryRename(true);
    setCategoryFeedback(null);

    // 1. Immediate local state update for categories & sites
    setCategories((prev) =>
      prev.map((c) => (c.name === oldName ? { ...c, name: newName } : c))
    );
    setSites((prev) =>
      prev.map((s) => (s.category === oldName ? { ...s, category: newName } : s))
    );
    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }

    try {
      const res = await fetch('/api/admin/related-sites/categories/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName,
          newName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.relatedSites && Array.isArray(data.relatedSites)) {
        setSites(data.relatedSites);
        try {
          localStorage.setItem('sanad_cached_related_sites', JSON.stringify(data.relatedSites));
        } catch {}
      }
    } catch (err) {
      console.warn('API rename category notice:', err);
    }

    notifySync('related_sites');
    setEditingCategory(null);
    setCategoryFeedback({
      type: 'success',
      message: `تم تحديث اسم التصنيف إلى "${newName}" بنجاح.`,
    });
    setTimeout(() => setCategoryFeedback(null), 3500);
    setSavingCategoryRename(false);
  };

  // Delete category in Category Manager
  const handleDeleteCategory = async (cat: SiteCategoryItem) => {
    setDeletingCategoryName(cat.name);
    setCategoryFeedback(null);
    try {
      const res = await fetch(`/api/admin/related-sites/categories/${encodeURIComponent(cat.name)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setCategoryFeedback({ type: 'error', message: data.error || 'فشل حذف التصنيف.' });
        return;
      }

      if (selectedCategory === cat.name) {
        setSelectedCategory('all');
      }

      notifySync('related_sites');
      await fetchCategories();
      setCategoryToDelete(null);
      setCategoryFeedback({
        type: 'success',
        message: `تم حذف التصنيف "${cat.name}" بنجاح.`,
      });
      setTimeout(() => setCategoryFeedback(null), 3000);
    } catch (err) {
      setCategoryFeedback({ type: 'error', message: 'تعذر حذف التصنيف.' });
    } finally {
      setDeletingCategoryName(null);
    }
  };

  // Filter sites by search AND selected category
  const filtered = sites.filter((site) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (site.title && site.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.url && site.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.category && site.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || site.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-red-50 text-red-900 border border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:max-w-2xl">
          {/* Top helper badge system */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditTitleDraft(headerTitle);
                setEditSubtitleDraft(headerSubtitle);
                setEditingTarget('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-[11px] sm:text-xs font-bold shadow-xs border border-blue-500/70 transition-all cursor-pointer hover:scale-105 active:scale-95 group/pen"
              title="نظام القلم: انقر لتعديل هذا العنوان والوصف بحرية ✍️"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-200 group-hover/pen:rotate-12 transition-transform" />
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
              <Sparkles className="w-3 h-3 text-blue-700" />
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
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-[10px] sm:text-[11px] font-bold shadow-sm border border-blue-400/80 transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in"
                title="تعديل هذا الكلام بالقلم ✍️"
              >
                <Edit3 className="w-3 h-3 text-blue-200 animate-pulse" />
                <span>تعديل هذا الكلام ✍️</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditTitleDraft(headerTitle);
                  setEditSubtitleDraft(headerSubtitle);
                  setShowEditHeaderModal(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 text-[10px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="تعديل في نافذة مخصصة"
              >
                <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                <span>تعديل متقدم</span>
              </button>
            </div>

            {editingTarget === 'all' ? (
              /* Inline Direct Edit Mode for both Title and Subtitle */
              <div className="bg-blue-50/80 border-2 border-blue-400/90 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-blue-200 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                    <Edit3 className="w-4 h-4 text-blue-700" />
                    <span>تعديل عنوان ووصف دليل المواقع ذات الصلة بحرية بالقلم:</span>
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
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="اكتب الوصف التوضيحي هنا..."
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveHeader(editTitleDraft, editSubtitleDraft)}
                    disabled={isSavingHeader}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-blue-200" />
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="w-5 h-5 text-blue-800" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Title Element with Inline Editing */}
                  {editingTarget === 'title' ? (
                    <div className="flex items-center gap-2 flex-wrap bg-blue-50/80 p-2.5 rounded-xl border border-blue-300 animate-in fade-in">
                      <input
                        type="text"
                        value={editTitleDraft}
                        onChange={(e) => setEditTitleDraft(e.target.value)}
                        className="flex-1 min-w-[220px] px-3 py-1.5 bg-white border border-blue-400 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/90 hover:bg-blue-200 text-blue-900 border border-blue-300 text-[10px] font-bold shadow-2xs cursor-pointer transition-all hover:scale-105"
                          title="قلم التعديل المباشر فوق النص ✍️"
                        >
                          <Edit3 className="w-3 h-3 text-blue-700 animate-pulse" />
                          <span>قلم تعديل العنوان والوصف ✍️</span>
                        </button>
                      </div>

                      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 flex-wrap group/title">
                        <span
                          onClick={() => {
                            setEditTitleDraft(headerTitle);
                            setEditingTarget('title');
                          }}
                          className="relative inline-flex items-center gap-2 cursor-pointer hover:text-blue-800 transition-colors border-b-2 border-dashed border-blue-400/60 hover:border-blue-700 pb-0.5 select-all"
                          title="انقر لتعديل هذا العنوان بالقلم بحرية ✍️"
                        >
                          {/* Pen icon button right beside the text */}
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 shadow-2xs transition-transform group-hover/title:scale-110 shrink-0">
                            <Edit3 className="w-3.5 h-3.5" />
                          </span>
                          <span>{headerTitle}</span>
                        </span>

                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {sites.length} موقع
                        </span>
                        <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {categories.length} تصنيف
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all"
                            title="تعديل سريع لكامل النصوص"
                          >
                            <Edit3 className="w-3 h-3 text-blue-600" />
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
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>تعديل متقدم</span>
                          </button>
                        </div>
                      </h2>
                    </div>
                  )}

                  {/* Subtitle Element with Inline Editing */}
                  {editingTarget === 'subtitle' ? (
                    <div className="space-y-2 bg-blue-50/80 p-2.5 rounded-xl border border-blue-300 animate-in fade-in">
                      <textarea
                        rows={2}
                        value={editSubtitleDraft}
                        onChange={(e) => setEditSubtitleDraft(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-blue-400 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        autoFocus
                        placeholder="اكتب الوصف التوضيحي هنا..."
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveHeader(undefined, editSubtitleDraft)}
                          disabled={isSavingHeader}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
                      className="text-xs text-gray-500 mt-1 cursor-pointer hover:text-blue-900 hover:bg-blue-50/60 p-1.5 rounded-lg border border-transparent hover:border-blue-200 transition-all flex items-start gap-1.5 group/sub"
                      title="انقر لتعديل هذا الوصف بالقلم بحرية ✍️"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover/sub:opacity-100 mt-0.5 shrink-0" />
                      <span>{headerSubtitle}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Refresh */}
          <button
            onClick={fetchSites}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Manage Categories Button */}
          <button
            id="admin-manage-site-categories-btn"
            onClick={() => {
              setCategoryFeedback(null);
              setShowCategoryModal(true);
            }}
            className="px-3.5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-emerald-500 text-gray-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            title="عرض وإدارة تصنيفات المواقع ذات الصلة"
          >
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>عرض وإدارة التصنيفات</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {categories.length}
            </span>
          </button>

          {/* Add New Site Button */}
          <button
            id="admin-add-site-btn"
            onClick={openAddModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#d4af37]" />
            <span>إضافة موقع جديد</span>
          </button>
        </div>
      </div>

      {/* Green Explanation Rectangle (مستطيل أخضر توضيحي وإرشادي للقسم) */}
      <div className="bg-gradient-to-br from-[#0d2116] via-[#143224] to-[#0a1c11] border-2 border-emerald-500/70 rounded-2xl p-4 sm:p-5 shadow-md text-white relative overflow-hidden group/greenbox">
        {/* Background ambient light */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 flex-1 w-full">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="space-y-1.5 flex-1 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide text-emerald-300 uppercase bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  شرح إرشادي وخريطة الدليل
                </span>
                <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                  <span>لوحة الإشراف</span>
                  <span>•</span>
                  <span>دولة فلسطين</span>
                </span>
              </div>

              {isEditingBoxExplanation ? (
                <div className="space-y-2 mt-2 w-full">
                  <textarea
                    rows={3}
                    value={editExplanationDraft}
                    onChange={(e) => setEditExplanationDraft(e.target.value)}
                    placeholder="اكتب الشرح التوضيحي والإرشادي لخانة دليل المواقع ذات الصلة هنا..."
                    className="w-full text-xs sm:text-sm bg-emerald-950/90 border-2 border-emerald-400/80 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none font-sans"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditExplanationDraft(headerExplanation);
                        setIsEditingBoxExplanation(false);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-emerald-700 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveHeader(undefined, undefined, editExplanationDraft)}
                      disabled={isSavingHeader}
                      className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingHeader ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-950" />
                      )}
                      <span>حفظ الشرح والتوضيح ✍️</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-emerald-100/95 leading-relaxed font-normal">
                  {headerExplanation}
                </p>
              )}
            </div>
          </div>

          {/* Admin Pen Action inside the Green Box */}
          {!isEditingBoxExplanation && (
            <button
              type="button"
              onClick={() => {
                setEditExplanationDraft(headerExplanation);
                setIsEditingBoxExplanation(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-amber-100 border border-amber-400/40 text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-105 shrink-0 self-end md:self-center"
              title="تعديل هذا الشرح بالقلم ✍️"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>تعديل الشرح بالقلم ✍️</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3.5">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في أسماء المواقع، الروابط، التصنيفات، والتفاصيل..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category Chips Bar (عرض وفرز التصنيفات) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-700" />
              <span>تصفية وعرض حسب التصنيف:</span>
            </span>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-[11px] text-red-600 hover:text-red-700 font-bold cursor-pointer"
              >
                إلغاء التصفية (عرض الكل)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none text-xs">
            {/* All Sites Chip */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <span>جميع المواقع</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === 'all'
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {sites.length}
              </span>
            </button>

            {/* Individual Category Chips */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                >
                  <Tag className={`w-3 h-3 ${isSelected ? 'text-[#d4af37]' : 'text-gray-400'}`} />
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected
                        ? 'bg-blue-700 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}

            {/* Quick Add / Manage Category Button */}
            <button
              type="button"
              onClick={() => {
                setCategoryFeedback(null);
                setShowCategoryModal(true);
              }}
              className="px-2.5 py-1.5 rounded-xl text-blue-800 hover:bg-blue-50 border border-dashed border-blue-300 font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="إدارة وتعديل التصنيفات"
            >
              <Plus className="w-3.5 h-3.5 text-blue-700" />
              <span>إدارة التصنيفات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sites Grid */}
      {loading && sites.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-xs">
          <div className="w-8 h-8 border-2 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          جارٍ تحميل المواقع...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center space-y-3">
          <Globe className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">لا توجد مواقع مطابقة</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? 'لم تتطابق نتائج البحث مع هذا التصنيف. يمكنك إلغاء التصفية أو تغيير معايير البحث.'
              : 'اضغط على زر "إضافة موقع جديد" للبدء بإضافة المواقع.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              عرض جميع المواقع
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {/* Interactive Category Badge */}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(site.category || 'عام')}
                        className="text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title={`تصفية لعرض تصنيف: ${site.category || 'عام'}`}
                      >
                        <Tag className="w-2.5 h-2.5 text-blue-600" />
                        <span>{site.category || 'عام'}</span>
                      </button>

                      {site.isOfficial !== false && (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          جهة رسمية
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-950">{site.title}</h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(site)}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="تعديل بيانات الموقع"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSiteToDelete(site)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف الموقع نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                  {site.description || 'لا توجد معلومات إضافية.'}
                </p>
              </div>

              {/* Link Bar */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-400 font-mono truncate max-w-[200px]" dir="ltr">
                  {site.url}
                </span>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-blue-800 hover:text-blue-950 font-bold flex items-center gap-1 transition-colors"
                >
                  <span>فتح الرابط</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT RELATED SITE                           */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-[#12281e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingSite ? 'تعديل بيانات الموقع ذي الصلة' : 'إضافة موقع ذو صلة جديد'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 text-right max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  اسم الموقع / المنصة: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: وزارة المالية الفلسطينية"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  رابط الموقع (URL): <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.pmof.ps"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 font-mono"
                  dir="ltr"
                />
              </div>

              {/* Category (Dynamic Selector with Custom Option) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    تصنيف الموقع: <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (!isCustomCategory) {
                        setCustomCategoryInput('');
                      }
                    }}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isCustomCategory ? (
                      '← اختيار من القائمة الحالية'
                    ) : (
                      <>
                        <Plus className="w-3 h-3 text-blue-700" />
                        <span>إدخال تصنيف جديد</span>
                      </>
                    )}
                  </button>
                </div>

                {isCustomCategory ? (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      required
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="اكتب اسم التصنيف الجديد (مثال: محاكم واستئناف جمركي)..."
                      className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                    <p className="text-[11px] text-emerald-700 font-medium">
                      سيتم حفظ هذا التصنيف وربطه بالموقع وإضافته تلقائياً إلى دليل التصنيفات.
                    </p>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsCustomCategory(true);
                        setCustomCategoryInput('');
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  >
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count} موقع)
                      </option>
                    ))}
                    {categories.length === 0 && (
                      <>
                        <option value="خدمات حكومية">خدمات حكومية</option>
                        <option value="تشريعات وقوانين">تشريعات وقوانين</option>
                        <option value="جمارك واستيراد">جمارك واستيراد</option>
                        <option value="قضاء وعدالة">قضاء وعدالة</option>
                        <option value="خدمات مالية ومصرفية">خدمات مالية ومصرفية</option>
                        <option value="مؤسسات وهيئات اقتصادية">مؤسسات وهيئات اقتصادية</option>
                        <option value="أخرى">أخرى</option>
                      </>
                    )}
                    <option value="__new__">➕ إضافة تصنيف جديد مخصص...</option>
                  </select>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  نبذة ومعلومات عن الموقع وما يقدمه للمكلفين:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب نبذة عن الموقع، الخدمات التي يوفرها، وأهميته للمكلفين أو التجار..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 leading-relaxed"
                />
              </div>

              {/* Official Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="site-is-official"
                  checked={isOfficial}
                  onChange={(e) => setIsOfficial(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="site-is-official" className="text-xs text-gray-700 select-none cursor-pointer">
                  اعتماد الموقع كجهة رسمية معتمدة (يظهر شارة جهة رسمية خضراء)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : editingSite ? 'تحديث البيانات' : 'إضافة الموقع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CATEGORY MANAGEMENT (عرض وإدارة التصنيفات)          */}
      {/* ======================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 to-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#d4af37]" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    دليل وإدارة تصنيفات المواقع ذات الصلة
                  </h3>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    استعراض التصنيفات، معرفة عدد المواقع في كل تصنيف، تعديل الأسماء أو إضافة تصنيف جديد
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Category Feedback Alert */}
              {categoryFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
                    categoryFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-red-50 text-red-900 border border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {categoryFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{categoryFeedback.message}</span>
                  </div>
                  <button onClick={() => setCategoryFeedback(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-800">
                  إضافة تصنيف جديد للمواقع:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="مثال: غرف تجارية وصناعية، نقابات مهنية..."
                    className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    disabled={addingCategory}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{addingCategory ? 'جارٍ الإضافة...' : 'إضافة التصنيف'}</span>
                  </button>
                </div>
              </form>

              {/* Categories List (عرض التصنيفات) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-800" />
                    <span>التصنيفات الحالية ({categories.length}):</span>
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    إجمالي المواقع: {sites.length}
                  </span>
                </div>

                {categories.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                    لا توجد تصنيفات حالياً. يمكنك إضافة تصنيف جديد بالأعلى.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((cat) => {
                      const isEditingThis = editingCategory?.oldName === cat.name;

                      return (
                        <div
                          key={cat.name}
                          className="p-3.5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                        >
                          {/* Name & Count */}
                          <div className="flex-1">
                            {isEditingThis ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingCategory.newName}
                                  onChange={(e) =>
                                    setEditingCategory({
                                      ...editingCategory,
                                      newName: e.target.value,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-gray-50 border border-blue-400 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 w-full max-w-xs"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={savingCategoryRename}
                                  onClick={handleRenameCategory}
                                  className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>حفظ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategory(null)}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-xs font-bold text-gray-900">{cat.name}</span>
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                                  {cat.count} {cat.count === 1 ? 'موقع' : cat.count === 2 ? 'موقعان' : 'مواقع'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Category Actions */}
                          {!isEditingThis && (
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              {/* Filter to this Category */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(cat.name);
                                  setShowCategoryModal(false);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="عرض مواقع هذا التصنيف"
                              >
                                <Filter className="w-3 h-3" />
                                <span>عرض المواقع</span>
                              </button>

                              {/* Rename Category */}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingCategory({ oldName: cat.name, newName: cat.name })
                                }
                                className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="تعديل اسم التصنيف"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Category */}
                              <button
                                type="button"
                                onClick={() => setCategoryToDelete(cat)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف التصنيف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setShowCategoryModal(false);
                  }}
                  className="text-xs font-bold text-blue-800 hover:underline cursor-pointer"
                >
                  عرض جميع المواقع والتصنيفات
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: CONFIRM DELETE SITE                              */}
      {/* ======================================================== */}
      {siteToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!deletingId) setSiteToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 p-5 sm:p-6 text-right space-y-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">تأكيد الحذف النهائي للموقع</h3>
                <p className="text-xs text-red-600 font-medium mt-0.5">تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-100 text-xs text-gray-700 leading-relaxed space-y-2">
              <p>هل أنت متأكد تماماً من رغبتك في حذف الموقع ذي الصلة:</p>
              <div className="font-bold text-gray-900 text-sm bg-white p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-red-600 shrink-0" />
                <span>{siteToDelete.title}</span>
              </div>
              <p className="text-gray-500 text-[11px]">
                سيتم حذف هذا الموقع ورابطه من قاعدة البيانات السحابية Cloud Firestore نهائياً.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setSiteToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingId ? 'جارٍ الحذف...' : 'نعم، حذف الموقع نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: CONFIRM DELETE CATEGORY                          */}
      {/* ======================================================== */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!deletingCategoryName) setCategoryToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 p-5 sm:p-6 text-right space-y-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">تأكيد حذف التصنيف</h3>
                <p className="text-xs text-red-600 font-medium mt-0.5">حذف التصنيف من قائمة تصنيفات المواقع</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-100 text-xs text-gray-700 leading-relaxed space-y-2">
              <p>هل أنت متأكد من رغبتك في حذف التصنيف:</p>
              <div className="font-bold text-gray-900 text-sm bg-white p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                <Tag className="w-4 h-4 text-red-600 shrink-0" />
                <span>{categoryToDelete.name}</span>
                <span className="text-xs text-gray-500 font-normal">
                  ({categoryToDelete.count} موقع مرتبط)
                </span>
              </div>
              {categoryToDelete.count > 0 && (
                <p className="text-amber-800 text-[11px] bg-amber-50 p-2 rounded-lg border border-amber-200">
                  تنبيه: يوجد {categoryToDelete.count} موقع مسجل تحت هذا التصنيف. يمكنك تعديل اسمه بدلاً من حذفه إذا كنت ترغب في الاحتفاظ بربط المواقع.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={Boolean(deletingCategoryName)}
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={Boolean(deletingCategoryName)}
                onClick={() => handleDeleteCategory(categoryToDelete)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingCategoryName ? 'جارٍ الحذف...' : 'تأكيد حذف التصنيف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Related Sites Header Customization Modal */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-l from-blue-900 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-blue-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">تعديل عنوان ووصف دليل المواقع ذات الصلة</h3>
                  <p className="text-[11px] text-blue-200">يمكنك تعديل النصوص بحرية لتظهر في جميع أنحاء المنصة</p>
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
                  العنوان الرئيسي لدليل المواقع ذات الصلة:
                </label>
                <input
                  type="text"
                  value={editTitleDraft}
                  onChange={(e) => setEditTitleDraft(e.target.value)}
                  placeholder="مثال: إدارة دليل المواقع ذات الصلة"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Preview Box */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">معاينة مباشرة للشكل النهائي:</span>
                <div className="space-y-1">
                  <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>{editTitleDraft || DEFAULT_SITES_TITLE}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      {sites.length} موقع
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                    {editSubtitleDraft || DEFAULT_SITES_SUBTITLE}
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
                    className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-700/20 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-blue-200" />
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
