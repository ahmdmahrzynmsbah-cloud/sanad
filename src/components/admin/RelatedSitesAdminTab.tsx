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
  Link2,
  Building2,
  FileText
} from 'lucide-react';
import { RelatedSite } from '../../types';

interface RelatedSitesAdminTabProps {
  initialSites?: RelatedSite[];
}

export const RelatedSitesAdminTab: React.FC<RelatedSitesAdminTabProps> = ({
  initialSites,
}) => {
  const [sites, setSites] = useState<RelatedSite[]>(initialSites || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<RelatedSite | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('خدمات حكومية');
  const [isOfficial, setIsOfficial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mandatory Delete Confirmation Modal State
  const [siteToDelete, setSiteToDelete] = useState<RelatedSite | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/related-sites');
      const data = await res.json();
      if (res.ok && data.relatedSites) {
        setSites(data.relatedSites);
      }
    } catch (err) {
      console.warn('Failed to fetch related sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSites || initialSites.length === 0) {
      fetchSites();
    }
  }, []);

  const openAddModal = () => {
    setEditingSite(null);
    setTitle('');
    setUrl('https://');
    setDescription('');
    setCategory('خدمات حكومية');
    setIsOfficial(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (site: RelatedSite) => {
    setEditingSite(site);
    setTitle(site.title || '');
    setUrl(site.url || 'https://');
    setDescription(site.description || '');
    setCategory(site.category || 'خدمات حكومية');
    setIsOfficial(site.isOfficial !== false);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('يرجى إدخال اسم الموقع.');
      return;
    }

    if (!url.trim() || url === 'https://') {
      setFormError('يرجى إدخال رابط الموقع (URL).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        category: category.trim(),
        isOfficial,
      };

      const endpoint = editingSite
        ? `/api/admin/related-sites/${editingSite.id}`
        : '/api/admin/related-sites';
      const method = editingSite ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشلت عملية حفظ بيانات الموقع.');
        return;
      }

      if (data.relatedSites) {
        setSites(data.relatedSites);
      } else {
        await fetchSites();
      }

      setFeedback({
        type: 'success',
        message: editingSite
          ? `تم تحديث بيانات الموقع "${title}" بنجاح.`
          : `تمت إضافة الموقع "${title}" بنجاح.`,
      });
      setShowModal(false);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFormError('تعذر الاتصال بالخادم.');
    } finally {
      setSaving(false);
    }
  };

  // Mandatory Delete with Confirmation
  const handleConfirmDelete = async () => {
    if (!siteToDelete) return;

    setDeletingId(siteToDelete.id);
    try {
      const res = await fetch(`/api/admin/related-sites/${siteToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'فشلت عملية حذف الموقع.',
        });
        return;
      }

      if (data.relatedSites) {
        setSites(data.relatedSites);
      } else {
        setSites((prev) => prev.filter((s) => s.id !== siteToDelete.id));
      }

      setFeedback({
        type: 'success',
        message: `تم حذف الموقع "${siteToDelete.title}" نهائياً.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'حدث خطأ أثناء محاولة الحذف.',
      });
    } finally {
      setDeletingId(null);
      setSiteToDelete(null);
    }
  };

  const filtered = sites.filter((site) => {
    return (
      (site.title && site.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.url && site.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.category && site.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
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
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-800" />
            <span>إدارة دليل المواقع ذات الصلة</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {sites.length} موقع
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            أضف المواقع الرسمية والتشريعية والجمركية مع نبذة عنها ورابط مباشر، لتمكين المكلفين والزوار من زيارتها بسهولة.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchSites}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في أسماء، روابط، وتفاصيل المواقع ذات الصلة..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          <h3 className="text-sm font-bold text-gray-800">لا توجد مواقع حالياً</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery ? 'لم تتطابق نتائج البحث مع أي موقع.' : 'اضغط على زر "إضافة موقع جديد" للبدء بإضافة المواقع.'}
          </p>
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
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                        {site.category || 'عام'}
                      </span>
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
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 text-right">
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

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  تصنيف الموقع:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                >
                  <option value="خدمات حكومية">خدمات حكومية</option>
                  <option value="تشريعات وقوانين">تشريعات وقوانين</option>
                  <option value="مؤسسات وهيئات اقتصادية">مؤسسات وهيئات اقتصادية</option>
                  <option value="تخليص جمركي وموانئ">تخليص جمركي وموانئ</option>
                  <option value="أخرى">أخرى</option>
                </select>
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
      {/* DIALOG: MANDATORY CONFIRMATION BEFORE PERMANENT DELETE   */}
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
              <p>
                هل أنت متأكد تماماً من رغبتك في حذف الموقع ذي الصلة:
              </p>
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
    </div>
  );
};
