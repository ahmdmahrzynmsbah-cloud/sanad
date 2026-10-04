import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Check,
  RotateCcw,
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
import { useSync, notifySync } from '../../utils/sync';
import { directDeleteSupervisorFromFirestore } from '../../services/clientFirestore';
import { fetchSupervisors, getCachedSupervisors, syncSupervisorsToLocalStorage } from '../../services/supervisorsService';
import { SkeletonSupervisorCard } from '../common/Skeleton';

interface SupervisorsAdminTabProps {
  initialSupervisors?: Supervisor[];
  onSupervisorsUpdated?: (supervisors: Supervisor[]) => void;
}

export const SupervisorsAdminTab: React.FC<SupervisorsAdminTabProps> = ({
  initialSupervisors,
  onSupervisorsUpdated,
}) => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => {
    if (initialSupervisors && initialSupervisors.length > 0) return initialSupervisors;
    return getCachedSupervisors();
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery]);

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

  // Header customizable text state (نظام تعديل النصوص بالقلم)
  const DEFAULT_HEADER_TITLE = 'إدارة هيئة المشرفين والخبراء القانونيين';
  const DEFAULT_HEADER_SUBTITLE = 'يمكنك إضافة صورة المشرف واسمه ونبذة كاملة عن خبراته، ليتم عرضها في الصفحة العامة للمشرفين لكافة الزوار.';

  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('supervisors_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return DEFAULT_HEADER_TITLE;
  });

  const [headerSubtitle, setHeaderSubtitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('supervisors_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subtitle) return parsed.subtitle;
      }
    } catch {}
    return DEFAULT_HEADER_SUBTITLE;
  });

  const [editingTarget, setEditingTarget] = useState<'none' | 'title' | 'subtitle' | 'all'>('none');
  const isEditingHeader = editingTarget !== 'none';
  const setIsEditingHeader = (val: boolean) => setEditingTarget(val ? 'all' : 'none');
  const [editTitleDraft, setEditTitleDraft] = useState(headerTitle);
  const [editSubtitleDraft, setEditSubtitleDraft] = useState(headerSubtitle);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  const loadHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/supervisors-header');
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
    } catch (err) {
      console.warn('Load supervisors header settings failed:', err);
    }
  };

  useEffect(() => {
    loadHeaderSettings();
  }, []);

  useSync(['supervisors_header', 'all'], () => {
    loadHeaderSettings();
  });

  const handleSaveHeader = async (overrideTitle?: string, overrideSubtitle?: string) => {
    const finalTitle = (overrideTitle !== undefined ? overrideTitle : editTitleDraft).trim() || DEFAULT_HEADER_TITLE;
    const finalSubtitle = (overrideSubtitle !== undefined ? overrideSubtitle : editSubtitleDraft).trim() || DEFAULT_HEADER_SUBTITLE;

    setIsSavingHeader(true);
    setHeaderTitle(finalTitle);
    setHeaderSubtitle(finalSubtitle);
    setEditTitleDraft(finalTitle);
    setEditSubtitleDraft(finalSubtitle);

    try {
      localStorage.setItem('supervisors_header_settings', JSON.stringify({
        title: finalTitle,
        subtitle: finalSubtitle,
        updatedAt: Date.now(),
      }));
    } catch {}

    try {
      await fetch('/api/admin/settings/supervisors-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          subtitle: finalSubtitle,
        }),
      });
    } catch {}

    notifySync('supervisors_header');
    setIsSavingHeader(false);
    setIsEditingHeader(false);
    setShowEditHeaderModal(false);
    setFeedback({
      type: 'success',
      message: 'تم حفظ وتعديل عنوان ووصف هيئة المشرفين بنجاح ✍️',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleResetHeader = () => {
    handleSaveHeader(DEFAULT_HEADER_TITLE, DEFAULT_HEADER_SUBTITLE);
  };

  // Mandatory Delete Confirmation Modal State
  const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSupervisorsData = async () => {
    try {
      const items = await fetchSupervisors();
      setSupervisors(items);
      onSupervisorsUpdated?.(items);
    } catch (err) {
      console.warn('API fetch supervisors failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupervisorsData();
  }, []);

  useEffect(() => {
    if (initialSupervisors && initialSupervisors.length > 0) {
      setSupervisors(initialSupervisors);
    }
  }, [initialSupervisors]);

  useEffect(() => {
    onSupervisorsUpdated?.(supervisors);
  }, [supervisors]);

  useSync(['supervisors', 'all'], () => {
    loadSupervisorsData();
  });

  const generateSanadTaxEmail = (fullName: string): string => {
    if (!fullName || !fullName.trim()) return `sup_${Math.random().toString(36).substring(2, 6)}@sanadtax.com`;
    const cleanName = fullName
      .replace(/^(د\.|أ\.|دكتور|أستاذ|مهندس|المشرف|المستشار)\s+/g, '')
      .trim();
    const charMap: Record<string, string> = {
      'أ': 'a', 'إ': 'a', 'آ': 'a', 'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
      'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
      'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
      'ي': 'y', 'ى': 'y', 'ئ': 'y', 'ة': 'h'
    };
    let result = '';
    for (const char of cleanName.toLowerCase()) {
      if (charMap[char]) result += charMap[char];
      else if (/[a-z0-9]/.test(char)) result += char;
      else if (char === ' ' || char === '_') result += '.';
    }
    result = result.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '');
    if (!result) result = 'sup_' + Math.random().toString(36).substring(2, 6);
    return `${result}@sanadtax.com`;
  };

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

  // Handle local image file upload (converts to base64 Data URL with automatic client-side compression)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).');
      return;
    }

    try {
      const { compressImageClientSide } = await import('../../utils/imageCompressor');
      const compressed = await compressImageClientSide(file, 400, 400);
      setPhotoUrl(compressed);
      setFormError(null);
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPhotoUrl(result);
          setFormError(null);
        }
      };
      reader.readAsDataURL(file);
    }
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

    let finalEmail = email.trim().toLowerCase();
    if (finalEmail) {
      if (!finalEmail.includes('@')) {
        finalEmail = `${finalEmail}@sanadtax.com`;
      }
    } else {
      finalEmail = generateSanadTaxEmail(name.trim());
    }

    const supId = editingSupervisor ? editingSupervisor.id : 'sup-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const payloadToSave: Supervisor = {
      id: supId,
      name: name.trim(),
      title: title.trim(),
      bio: bio.trim(),
      photoUrl: photoUrl.trim(),
      department: department.trim(),
      email: finalEmail,
      phone: phone.trim(),
      order: Number(order) || 1,
      createdAt: editingSupervisor?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately store in local state and localStorage for zero-latency UI update
    setSupervisors((prev) => {
      const map = new Map<string, Supervisor>();
      prev.forEach((s) => map.set(s.id, s));
      map.set(payloadToSave.id, payloadToSave);
      const next = Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
      syncSupervisorsToLocalStorage(next);
      if (onSupervisorsUpdated) onSupervisorsUpdated(next);
      return next;
    });

    // 2. Background sync to Server API
    try {
      const url = editingSupervisor
        ? `/api/admin/supervisors/${editingSupervisor.id}`
        : '/api/admin/supervisors';
      const method = editingSupervisor ? 'PUT' : 'POST';

      fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSave),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.supervisor) {
            setSupervisors((prev) => {
              const map = new Map<string, Supervisor>();
              prev.forEach((s) => map.set(s.id, s));
              map.set(data.supervisor.id, data.supervisor);
              const next = Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
              syncSupervisorsToLocalStorage(next);
              if (onSupervisorsUpdated) onSupervisorsUpdated(next);
              return next;
            });
          }
        }
      }).catch(() => {});
    } catch {}

    // 3. Background sync to Cloud Firestore & sync matching supervisor user login
    try {
      const { directSaveSupervisorToFirestore, directRegisterUser } = await import('../../services/clientFirestore');
      directSaveSupervisorToFirestore(payloadToSave).catch(() => {});

      if (finalEmail.endsWith('@sanadtax.com')) {
        directRegisterUser({
          username: finalEmail,
          fullName: name.trim(),
          phone: phone.trim(),
          password: 'Sanad123456!',
          role: 'supervisor',
          recoveryCode: 'SANAD-SUPERVISOR',
        }).catch(() => {});
      }
    } catch {}

    // 4. Broadcast Realtime Sync & Feedback
    notifySync('supervisors');
    setSearchQuery('');
    setFeedback({
      type: 'success',
      message: editingSupervisor
        ? `تم تحديث بيانات المشرف "${name}" وحساب البريد (${finalEmail}) بنجاح.`
        : `تمت إضافة المشرف "${name}" وإنشاء البريد الرسمى (${finalEmail}) بنجاح.`,
    });
    setShowModal(false);
    setSaving(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Perform permanent deletion ONLY after explicit confirmation
  const handleConfirmDelete = async () => {
    if (!supervisorToDelete) return;

    const target = supervisorToDelete;
    setDeletingId(target.id);

    // 1. Immediately update UI state and LocalStorage
    setSupervisors((prev) => {
      const next = prev.filter((s) => s.id !== target.id);
      syncSupervisorsToLocalStorage(next);
      return next;
    });
    setSupervisorToDelete(null);

    try {
      const res = await fetch(`/api/admin/supervisors/${target.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.supervisors) {
        const next = [...data.supervisors].sort((a: Supervisor, b: Supervisor) => (a.order || 0) - (b.order || 0));
        setSupervisors(next);
        syncSupervisorsToLocalStorage(next);
      }
    } catch (err) {
      console.warn('API error deleting supervisor, proceeding to direct firestore delete:', err);
    }

    // 2. Direct Cloud Firestore delete
    try {
      await directDeleteSupervisorFromFirestore(target.id);
    } catch (fErr) {
      console.error('Direct firestore supervisor delete error:', fErr);
    }

    notifySync('supervisors');
    setFeedback({
      type: 'success',
      message: `تم حذف المشرف "${target.name}" نهائياً من النظام والسحابة.`,
    });
    setTimeout(() => setFeedback(null), 4000);
    setDeletingId(null);
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
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:max-w-2xl">
          {/* Top helper badge system */}
          <div className="flex items-center gap-2 mb-1.5">
            <button
              type="button"
              onClick={() => {
                setEditTitleDraft(headerTitle);
                setEditSubtitleDraft(headerSubtitle);
                setEditingTarget('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] sm:text-xs font-bold shadow-xs border border-emerald-500/70 transition-all cursor-pointer hover:scale-105 active:scale-95 group/pen"
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

          {/* Targeted Element: div:nth-of-type(2) with direct pen system */}
          <div className="relative pt-6 group/target rounded-xl transition-all">
            {/* Direct Pen Badge hovering directly over this selected element */}
            <div className="absolute top-0 right-0 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={() => {
                  setEditTitleDraft(headerTitle);
                  setEditSubtitleDraft(headerSubtitle);
                  setEditingTarget(editingTarget === 'all' ? 'none' : 'all');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] sm:text-[11px] font-bold shadow-sm border border-emerald-400/80 transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in"
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
                    <span>تعديل عنوان ووصف هيئة المشرفين بحرية بالقلم:</span>
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
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
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
              <div className="space-y-1.5">
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap group/title">
                    <Users className="w-5 h-5 text-emerald-700 shrink-0" />
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

                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {supervisors.length} مشرف معتمد
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
                )}

                {/* Subtitle / Description Element with Inline Editing */}
                {editingTarget === 'subtitle' ? (
                  <div className="space-y-2 bg-emerald-50/80 p-3 rounded-xl border border-emerald-300 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>تعديل الوصف التوضيحي بالقلم:</span>
                    </div>
                    <textarea
                      rows={2}
                      value={editSubtitleDraft}
                      onChange={(e) => setEditSubtitleDraft(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-400 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-2xs"
                      autoFocus
                      placeholder="اكتب الوصف التوضيحي هنا..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveHeader(undefined, editSubtitleDraft);
                        }
                        if (e.key === 'Escape') setEditingTarget('none');
                      }}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveHeader(undefined, editSubtitleDraft)}
                        disabled={isSavingHeader}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
                  <div className="group/desc">
                    <p
                      onClick={() => {
                        setEditSubtitleDraft(headerSubtitle);
                        setEditingTarget('subtitle');
                      }}
                      className="text-xs text-slate-500 mt-1 cursor-pointer hover:text-slate-900 hover:bg-emerald-50/60 rounded-xl p-2 transition-all border border-dashed border-transparent hover:border-emerald-300 inline-flex items-center gap-2 flex-wrap"
                      title="انقر لتعديل هذا الوصف بحرية ✍️"
                    >
                      <span className="leading-relaxed">{headerSubtitle}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSubtitleDraft(headerSubtitle);
                          setEditingTarget('subtitle');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                        title="تعديل هذا الوصف بالقلم"
                      >
                        <Edit3 className="w-2.5 h-2.5 text-emerald-700" />
                        <span>تعديل هذا الكلام ✍️</span>
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadSupervisorsData()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="admin-add-supervisor-btn"
            onClick={openAddModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
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
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Supervisors List Table & Cards */}
      {loading && supervisors.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonSupervisorCard key={idx} />
          ))}
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.slice(0, visibleCount).map((sup) => (
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
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    {sup.email && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] font-medium transition-colors ${
                          sup.email.endsWith('@sanadtax.com')
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/90'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate max-w-[180px]">{sup.email}</span>
                        {sup.email.endsWith('@sanadtax.com') && (
                          <span className="bg-emerald-700 text-white text-[9px] px-1.5 py-0.5 rounded-md font-sans font-bold shrink-0">
                            معتمد
                          </span>
                        )}
                      </span>
                    )}
                    {sup.phone && (
                      <span className="flex items-center gap-1 font-mono text-gray-500" dir="ltr">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {sup.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lazy Loading More Button */}
          {visibleCount < filtered.length && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-medium order-2 sm:order-1">
                معروض <strong className="text-gray-900">{Math.min(visibleCount, filtered.length)}</strong> من إجمالي{' '}
                <strong className="text-gray-900">{filtered.length}</strong> مشرف
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))}
                className="order-1 sm:order-2 px-5 py-2 bg-white hover:bg-gray-50 border border-gray-300 hover:border-emerald-600 text-gray-800 hover:text-emerald-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>تحميل وعرض المزيد (+{Math.min(PAGE_SIZE, filtered.length - visibleCount)})</span>
                <Users className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            </div>
          )}
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

              {/* Supervisor Official Email (@sanadtax.com) & Phone Section */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-700" />
                    <span>البريد الإلكتروني الرسمي للمشرف (@sanadtax.com):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEmail(generateSanadTaxEmail(name))}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    title="إنشاء عنوان بريد إلكتروني رسمي تلقائياً بـ @sanadtax.com من اسم المشرف"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>توليد تلقائي بـ @sanadtax.com</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="relative flex items-center" dir="ltr">
                      <input
                        type="text"
                        value={email.endsWith('@sanadtax.com') ? email.replace('@sanadtax.com', '') : email}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val.includes('@')) {
                            setEmail(val);
                          } else {
                            setEmail(val ? `${val}@sanadtax.com` : '');
                          }
                        }}
                        placeholder="اسم البريد (مثل: khalil)"
                        className="w-full pl-3 pr-28 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-mono shadow-2xs"
                      />
                      <span className="absolute right-2 px-2 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-mono font-bold rounded-md select-none border border-emerald-200 pointer-events-none">
                        @sanadtax.com
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800 mt-1 font-sans">
                      البريد النهائي للحساب: <strong className="font-mono text-emerald-950">{email || '(سيتم اعتماده تلقائياً بـ @sanadtax.com)'}</strong>
                    </p>
                  </div>

                  <div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="رقم الجوال / التواصل (اختياري)"
                      className="w-full px-3.5 py-2.5 bg-white border border-emerald-300/80 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 font-mono shadow-2xs"
                      dir="ltr"
                    />
                  </div>
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
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* Supervisors Header Customization Modal */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base">تعديل نصوص واجهة هيئة المشرفين</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditHeaderModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  العنوان الرئيسي
                </label>
                <input
                  type="text"
                  value={editTitleDraft}
                  onChange={(e) => setEditTitleDraft(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: إدارة هيئة المشرفين والخبراء القانونيين"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف التوضيحي
                </label>
                <textarea
                  rows={3}
                  value={editSubtitleDraft}
                  onChange={(e) => setEditSubtitleDraft(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="اكتب الوصف الذي سيظهر تحت العنوان..."
                />
              </div>

              {/* Live Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  معاينة حية للشكل النهائي:
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-slate-900 text-sm">{editTitleDraft || 'العنوان الرئيسي'}</span>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {supervisors.length} مشرف معتمد
                  </span>
                </div>
                <p className="text-xs text-slate-500 pr-6">
                  {editSubtitleDraft || 'الوصف التوضيحي...'}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetHeader}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة النص الأصلي</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditHeaderModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveHeader()}
                  disabled={isSavingHeader}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>{isSavingHeader ? 'جاري الحفظ...' : 'حفظ وتطبيق ✍️'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
