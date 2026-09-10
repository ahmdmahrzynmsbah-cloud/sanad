import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Mail,
  Phone,
  Building2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Link2
} from 'lucide-react';
import { Supervisor } from '../../types';

interface SupervisorsAdminTabProps {
  initialSupervisors?: Supervisor[];
}

export const SupervisorsAdminTab: React.FC<SupervisorsAdminTabProps> = ({
  initialSupervisors,
}) => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>(initialSupervisors || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mandatory Delete Confirmation Modal State
  const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSupervisors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supervisors');
      const data = await res.json();
      if (res.ok && data.supervisors) {
        setSupervisors(data.supervisors);
      }
    } catch (err) {
      console.warn('Failed to fetch supervisors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSupervisors || initialSupervisors.length === 0) {
      fetchSupervisors();
    }
  }, []);

  const openAddModal = () => {
    setEditingSupervisor(null);
    setName('');
    setTitle('');
    setBio('');
    setPhotoUrl('');
    setDepartment('الهيئة التشريعية والسياسات المالية');
    setEmail('');
    setPhone('');
    setOrder(supervisors.length + 1);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (sup: Supervisor) => {
    setEditingSupervisor(sup);
    setName(sup.name || '');
    setTitle(sup.title || '');
    setBio(sup.bio || '');
    setPhotoUrl(sup.photoUrl || '');
    setDepartment(sup.department || '');
    setEmail(sup.email || '');
    setPhone(sup.phone || '');
    setOrder(sup.order || 1);
    setFormError(null);
    setShowModal(true);
  };

  // Handle local image file upload (converts to base64 Data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('يرجى إدخال اسم المشرف.');
      return;
    }

    if (!title.trim()) {
      setFormError('يرجى إدخال الصفة الرسمية أو التخصص.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        title: title.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl.trim(),
        department: department.trim(),
        email: email.trim(),
        phone: phone.trim(),
        order: Number(order) || 1,
      };

      const url = editingSupervisor
        ? `/api/admin/supervisors/${editingSupervisor.id}`
        : '/api/admin/supervisors';
      const method = editingSupervisor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'فشلت عملية حفظ بيانات المشرف.');
        return;
      }

      if (data.supervisors) {
        setSupervisors(data.supervisors);
      } else {
        await fetchSupervisors();
      }

      setFeedback({
        type: 'success',
        message: editingSupervisor
          ? `تم تحديث بيانات المشرف "${name}" بنجاح.`
          : `تمت إضافة المشرف "${name}" بنجاح.`,
      });
      setShowModal(false);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFormError('تعذر الاتصال بالخادم.');
    } finally {
      setSaving(false);
    }
  };

  // Perform permanent deletion ONLY after explicit confirmation
  const handleConfirmDelete = async () => {
    if (!supervisorToDelete) return;

    setDeletingId(supervisorToDelete.id);
    try {
      const res = await fetch(`/api/admin/supervisors/${supervisorToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'فشلت عملية حذف المشرف.',
        });
        return;
      }

      if (data.supervisors) {
        setSupervisors(data.supervisors);
      } else {
        setSupervisors((prev) => prev.filter((s) => s.id !== supervisorToDelete.id));
      }

      setFeedback({
        type: 'success',
        message: `تم حذف المشرف "${supervisorToDelete.name}" نهائياً من النظام.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'حدث خطأ أثناء محاولة الحذف.',
      });
    } finally {
      setDeletingId(null);
      setSupervisorToDelete(null);
    }
  };

  const filtered = supervisors.filter((s) => {
    return (
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.bio && s.bio.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Feedback message banner */}
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
            <Users className="w-5 h-5 text-[#12281e]" />
            <span>إدارة هيئة المشرفين والخبراء القانونيين</span>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {supervisors.length} مشرف معتمد
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            يمكنك إضافة صورة المشرف واسمه ونبذة كاملة عن خبراته، ليتم عرضها في الصفحة العامة للمشرفين لكافة الزوار.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchSupervisors}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="admin-add-supervisor-btn"
            onClick={openAddModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#12281e] hover:bg-[#1b3d2d] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#d4af37]" />
            <span>إضافة مشرف جديد</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في أسماء وتخصصات ونبذات المشرفين..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] transition-all"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Supervisors List Table & Cards */}
      {loading && supervisors.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-xs">
          <div className="w-8 h-8 border-2 border-[#12281e] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          جارٍ تحميل المشرفين...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center space-y-3">
          <Users className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">لا يوجد مشرفين حالياً</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery ? 'لم تتطابق نتائج البحث مع أي مشرف.' : 'اضغط على زر "إضافة مشرف جديد" للبدء بإضافة المشرفين.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((sup) => (
            <div
              key={sup.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Supervisor Photo */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 shadow-xs">
                      {sup.photoUrl ? (
                        <img
                          src={sup.photoUrl}
                          alt={sup.name}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#12281e] text-[#d4af37] flex items-center justify-center font-bold text-sm">
                          {sup.name.slice(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-950 truncate">{sup.name}</h3>
                        {sup.order !== undefined && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-mono">
                            ترتيب: {sup.order}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-emerald-800 mt-0.5 truncate">{sup.title}</p>
                      {sup.department && (
                        <span className="text-[10px] text-gray-500 block mt-0.5 truncate">
                          {sup.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(sup)}
                      className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="تعديل بيانات المشرف"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSupervisorToDelete(sup)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف المشرف نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Supervisor Bio */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed line-clamp-3">
                  {sup.bio || 'لا توجد نبذة مسجلة.'}
                </div>
              </div>

              {/* Contact details */}
              {(sup.email || sup.phone) && (
                <div className="pt-2 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-500">
                  {sup.email && (
                    <span className="flex items-center gap-1 truncate font-mono">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {sup.email}
                    </span>
                  )}
                  {sup.phone && (
                    <span className="flex items-center gap-1 font-mono" dir="ltr">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {sup.phone}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT SUPERVISOR                             */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#12281e] to-[#1a3d2d] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingSupervisor ? 'تعديل بيانات المشرف' : 'إضافة مشرف جديد لهيئة الإشراف'}
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
            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-right flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo Upload & Preview Section */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <label className="block text-xs font-bold text-gray-900">
                  صورة المشرف:
                </label>
                
                <div className="flex items-center gap-4">
                  {/* Photo Preview Box */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0 shadow-inner">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover object-top"
                        onError={() => setPhotoUrl('')}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Image Upload Button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg border border-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-700" />
                        <span>رفع صورة من الجهاز</span>
                      </button>

                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          مسح الصورة
                        </button>
                      )}
                    </div>

                    {/* Or URL input */}
                    <input
                      type="url"
                      value={photoUrl.startsWith('data:') ? '' : photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="أو الصق رابط صورة خارجية (https://...)"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Basic Details (Name & Title) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    اسم المشرف الكامل: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: د. خليل إبراهيم شحادة"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    الصفة الرسمية / التخصص: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: رئيس هيئة الإشراف القانوني والضريبي"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e]"
                  />
                </div>
              </div>

              {/* Department & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    القسم / الدائرة:
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="مثال: الهيئة التشريعية والسياسات المالية"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    ترتيب الظهور:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e]"
                  />
                </div>
              </div>

              {/* Supervisor Bio */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  نبذة تعريفية شاملة عن المشرف وخبراته:
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة توضح مؤهلات المشرف، خبرته في التشريعات الجمركية أو الضريبية، والأبحاث واللجان التي شارك فيها..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] leading-relaxed"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    البريد الإلكتروني (اختياري):
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="advisor@pal-tax.ps"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    رقم الهاتف / الجوال (اختياري):
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+970 59..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] font-mono"
                    dir="ltr"
                  />
                </div>
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
                  className="px-5 py-2.5 bg-[#12281e] hover:bg-[#1b3d2d] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : editingSupervisor ? 'تحديث البيانات' : 'إضافة المشرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: MANDATORY CONFIRMATION BEFORE PERMANENT DELETE   */}
      {/* ======================================================== */}
      {supervisorToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!deletingId) setSupervisorToDelete(null);
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
                <h3 className="text-base font-bold text-gray-900">تأكيد الحذف النهائي للمشرف</h3>
                <p className="text-xs text-red-600 font-medium mt-0.5">تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-100 text-xs text-gray-700 leading-relaxed space-y-2">
              <p>
                هل أنت متأكد تماماً من رغبتك في حذف المشرف:
              </p>
              <div className="font-bold text-gray-900 text-sm bg-white p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600 shrink-0" />
                <span>{supervisorToDelete.name}</span>
              </div>
              <p className="text-gray-500 text-[11px]">
                سيتم حذف هذا المشرف من قاعدة البيانات السحابية Cloud Firestore وسيتوقف ظهوره للزوار فوراً.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setSupervisorToDelete(null)}
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
                <span>{deletingId ? 'جارٍ الحذف...' : 'نعم، حذف المشرف نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
