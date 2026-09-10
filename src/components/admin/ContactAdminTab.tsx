import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  FileText,
  Phone,
  Eye,
  Check,
  X
} from 'lucide-react';
import { ContactInfo, ContactWhatsappItem, ContactPhoneItem } from '../../types';

interface ContactAdminTabProps {
  onContactUpdated?: (contact: ContactInfo) => void;
}

const DEFAULT_CONTACT_DATA: ContactInfo = {
  whatsappNumbers: [
    {
      id: 'wa-1',
      name: 'الدعم الفني والاستفسارات العامة',
      number: '0599123456',
      description: 'متاح للرد على المشاكل التقنية واستفسارات المنظومة وحسابات المستخدمين',
    },
    {
      id: 'wa-2',
      name: 'خدمة المشتركين والمراجعات الجمركية',
      number: '0568987654',
      description: 'لتفعيل وتجديد الاشتراكات الدائمة والمتابعات التشريعية والضريبية',
    },
  ],
  email: 'support@pal-customs.ps',
  secondaryEmail: 'info@customs.pmof.ps',
  phoneNumbers: [
    {
      id: 'ph-1',
      name: 'هاتف الإدارة العامة (رام الله)',
      number: '+970 2 297 8888',
    },
  ],
  workHours: 'الأحد - الخميس: 8:00 صباحاً - 3:30 مساءً (الاستجابة عبر الواتساب على مدار الساعة)',
  address: 'دولة فلسطين • رام الله والبيرة • مجمع الوزارات • وزارة المالية - الإدارة العامة للجمارك وضريبة القيمة المضافة',
  notes: 'فريق العمل والمستشارون متاحون للتواصل الفوري عبر قنوات الواتساب المباشرة أو البريد الإلكتروني الرسمي.',
};

export const ContactAdminTab: React.FC<ContactAdminTabProps> = ({ onContactUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Contact Form State
  const [whatsappNumbers, setWhatsappNumbers] = useState<ContactWhatsappItem[]>([]);
  const [email, setEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<ContactPhoneItem[]>([]);
  const [workHours, setWorkHours] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  // WhatsApp item modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [editingWaId, setEditingWaId] = useState<string | null>(null);
  const [waName, setWaName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [waDescription, setWaDescription] = useState('');

  // Landline Phone modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [phoneName, setPhoneName] = useState('');
  const [phoneNum, setPhoneNum] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchContactData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/system/contact');
        if (res.ok) {
          const data = await res.json();
          const info: ContactInfo = data.contactInfo || DEFAULT_CONTACT_DATA;
          setWhatsappNumbers(info.whatsappNumbers || DEFAULT_CONTACT_DATA.whatsappNumbers);
          setEmail(info.email || DEFAULT_CONTACT_DATA.email);
          setSecondaryEmail(info.secondaryEmail || '');
          setPhoneNumbers(info.phoneNumbers || DEFAULT_CONTACT_DATA.phoneNumbers || []);
          setWorkHours(info.workHours || DEFAULT_CONTACT_DATA.workHours || '');
          setAddress(info.address || DEFAULT_CONTACT_DATA.address || '');
          setNotes(info.notes || DEFAULT_CONTACT_DATA.notes || '');
          setUpdatedAt(info.updatedAt);
        }
      } catch (err) {
        console.warn('Failed to load contact data in admin tab:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, []);

  const showFeedbackMessage = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // WhatsApp Item Operations
  const handleOpenAddWaModal = () => {
    setEditingWaId(null);
    setWaName('');
    setWaNumber('');
    setWaDescription('');
    setShowWaModal(true);
  };

  const handleOpenEditWaModal = (item: ContactWhatsappItem) => {
    setEditingWaId(item.id);
    setWaName(item.name);
    setWaNumber(item.number);
    setWaDescription(item.description || '');
    setShowWaModal(true);
  };

  const handleSaveWaItem = () => {
    if (!waName.trim() || !waNumber.trim()) {
      alert('يرجى كتابة اسم القسم/المسمى ورقم الواتساب');
      return;
    }

    if (editingWaId) {
      setWhatsappNumbers((prev) =>
        prev.map((item) =>
          item.id === editingWaId
            ? {
                ...item,
                name: waName.trim(),
                number: waNumber.trim(),
                description: waDescription.trim(),
              }
            : item
        )
      );
    } else {
      const newItem: ContactWhatsappItem = {
        id: `wa-${Date.now()}`,
        name: waName.trim(),
        number: waNumber.trim(),
        description: waDescription.trim(),
      };
      setWhatsappNumbers((prev) => [...prev, newItem]);
    }

    setShowWaModal(false);
    showFeedbackMessage('success', 'تم تحديث قائمة أرقام الواتساب محلياً. انقر على «حفظ التغييرات» لاعتمادها.');
  };

  const handleDeleteWaItem = (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا الرقم من قائمة التواصل؟')) {
      setWhatsappNumbers((prev) => prev.filter((item) => item.id !== id));
      showFeedbackMessage('success', 'تم حذف الرقم من القائمة. يرجى النقر على «حفظ التغييرات» للحفظ النهائي.');
    }
  };

  // Phone Operations
  const handleOpenAddPhoneModal = () => {
    setEditingPhoneId(null);
    setPhoneName('');
    setPhoneNum('');
    setShowPhoneModal(true);
  };

  const handleOpenEditPhoneModal = (item: ContactPhoneItem) => {
    setEditingPhoneId(item.id);
    setPhoneName(item.name);
    setPhoneNum(item.number);
    setShowPhoneModal(true);
  };

  const handleSavePhoneItem = () => {
    if (!phoneName.trim() || !phoneNum.trim()) {
      alert('يرجى كتابة المسمى ورقم الهاتف');
      return;
    }

    if (editingPhoneId) {
      setPhoneNumbers((prev) =>
        prev.map((item) =>
          item.id === editingPhoneId
            ? { ...item, name: phoneName.trim(), number: phoneNum.trim() }
            : item
        )
      );
    } else {
      const newItem: ContactPhoneItem = {
        id: `ph-${Date.now()}`,
        name: phoneName.trim(),
        number: phoneNum.trim(),
      };
      setPhoneNumbers((prev) => [...prev, newItem]);
    }

    setShowPhoneModal(false);
  };

  const handleDeletePhoneItem = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الهاتف؟')) {
      setPhoneNumbers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Save All to Server & Firestore
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setFeedback(null);

      const payload = {
        whatsappNumbers,
        email: email.trim(),
        secondaryEmail: secondaryEmail.trim(),
        phoneNumbers,
        workHours: workHours.trim(),
        address: address.trim(),
        notes: notes.trim(),
      };

      const res = await fetch('/api/admin/settings/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل حفظ بيانات التواصل');
      }

      const data = await res.json();
      setUpdatedAt(data.contactInfo?.updatedAt || new Date().toISOString());
      if (onContactUpdated && data.contactInfo) {
        onContactUpdated(data.contactInfo);
      }

      showFeedbackMessage(
        'success',
        'تم حفظ وتحديث بيانات التواصل وأرقام الواتساب والبريد بنجاح في قاعدة البيانات السحابية (Cloud Firestore)!'
      );
    } catch (err: any) {
      showFeedbackMessage('error', err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // Reset to Default
  const handleResetToDefault = async () => {
    if (!confirm('هل أنت متأكد من استعادة بيانات التواصل الافتراضية؟ سيتم استبدال الأرقام والبريد الحالي.')) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/admin/settings/contact/reset', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const info: ContactInfo = data.contactInfo || DEFAULT_CONTACT_DATA;
        setWhatsappNumbers(info.whatsappNumbers);
        setEmail(info.email);
        setSecondaryEmail(info.secondaryEmail || '');
        setPhoneNumbers(info.phoneNumbers || []);
        setWorkHours(info.workHours || '');
        setAddress(info.address || '');
        setNotes(info.notes || '');
        setUpdatedAt(info.updatedAt);

        if (onContactUpdated && data.contactInfo) {
          onContactUpdated(data.contactInfo);
        }

        showFeedbackMessage('success', 'تمت استعادة بيانات التواصل الافتراضية بنجاح.');
      }
    } catch (err: any) {
      showFeedbackMessage('error', 'فشلت الاستعادة: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-slate-500 shadow-sm border border-slate-200">
        <Clock className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">جاري تحميل بيانات التواصل وأرقام الواتساب...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0d1c15] text-white p-6 sm:p-8 rounded-2xl shadow-lg border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-400/30">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>إدارة قنوات التواصل المباشر (اتصل بنا)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            أرقام الواتساب والبريد الإلكتروني وقنوات الدعم
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            تحكّم في أرقام الواتساب المتاحة للمستخدمين، عناوين البريد الإلكتروني الرسمي، أوقات العمل، وعنوان المقر المعتمد. يتم الحفظ الفوري في قاعدة البيانات السحابية (Firestore).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="admin-contact-reset-btn"
            type="button"
            onClick={handleResetToDefault}
            disabled={resetting || saving}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="استعادة القيم الافتراضية"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            id="admin-contact-save-btn"
            type="button"
            onClick={handleSaveAll}
            disabled={saving || resetting}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-bounce' : ''}`} />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {/* Alert / Feedback message */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-red-50 text-red-900 border border-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: WHATSAPP NUMBERS MANAGEMENT */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                أرقام الواتساب للتواصل المباشر ({whatsappNumbers.length})
              </h3>
              <p className="text-xs text-slate-500">
                يمكنك إضافة عدة أرقام مخصصة (دعم فني، خدمة مشتركين، استشارات جمركية، إلخ)
              </p>
            </div>
          </div>

          <button
            id="admin-add-whatsapp-btn"
            type="button"
            onClick={handleOpenAddWaModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة رقم واتساب جديد</span>
          </button>
        </div>

        {whatsappNumbers.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
            لا توجد أرقام واتساب مضافة حالياً. انقر على «إضافة رقم واتساب جديد» لإضافة رقم التواصل الأول.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {whatsappNumbers.map((waItem, index) => (
              <div
                key={waItem.id || index}
                className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-emerald-700" />
                      {waItem.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      رقم #{index + 1}
                    </span>
                  </div>

                  <div className="font-mono text-base font-bold text-slate-900 mt-2" dir="ltr">
                    {waItem.number}
                  </div>

                  {waItem.description && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {waItem.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-xs">
                  <a
                    href={`https://wa.me/${waItem.number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <span>تجربة الرابط</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditWaModal(waItem)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWaItem(waItem.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition-all cursor-pointer"
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
      </div>

      {/* SECTION 2: OFFICIAL EMAIL ADDRESSES */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              البريد الإلكتروني الرسمي للتواصل
            </h3>
            <p className="text-xs text-slate-500">
              العناوين الرسمية التي يتواصل من خلالها المستخدمون والمكلفون
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني الأساسي (إجباري):
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="support@pal-customs.ps"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              البريد الإلكتروني الإضافي / البديل (اختياري):
            </label>
            <input
              type="email"
              value={secondaryEmail}
              onChange={(e) => setSecondaryEmail(e.target.value)}
              placeholder="info@customs.pmof.ps"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: DIRECT PHONE NUMBERS */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                أرقام الهواتف الأرضية والمباشرة (اختياري)
              </h3>
              <p className="text-xs text-slate-500">
                هواتف المقر العام والخطوط المباشرة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPhoneModal}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة رقم هاتف</span>
          </button>
        </div>

        {phoneNumbers.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            لا توجد أرقام هواتف أرضية مضافة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {phoneNumbers.map((ph, idx) => (
              <div key={ph.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">{ph.name}</div>
                  <div className="font-mono text-slate-600 text-xs mt-0.5" dir="ltr">{ph.number}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditPhoneModal(ph)}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePhoneItem(ph.id)}
                    className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: WORKING HOURS, ADDRESS, AND GENERAL NOTES */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              ساعات العمل، المقر الرسمي، والملاحظات
            </h3>
            <p className="text-xs text-slate-500">
              معلومات إضافية تظهر للزوار في صفحة اتصل بنا
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>أوقات العمل وساعات الدوام:</span>
            </label>
            <input
              type="text"
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
              placeholder="الأحد - الخميس: 8:00 صباحاً - 3:30 مساءً"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>المقر والعنوان الرسمي:</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="دولة فلسطين • رام الله والبيرة • مجمع الوزارات • وزارة المالية"
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>ملاحظات إرشادية وتأكيد السرية والخصوصية:</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات تظهر أسفل صفحة اتصل بنا..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Save Button Footer */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {updatedAt ? `آخر تحديث مسجل: ${new Date(updatedAt).toLocaleString('ar-EG')}` : 'لم يتم تسجيل أي تعديل بعد'}
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || resetting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ في Firestore...' : 'حفظ ونشر التعديلات الآن'}</span>
        </button>
      </div>

      {/* WhatsApp Modal */}
      {showWaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-l from-[#193225] to-[#12281e] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">
                  {editingWaId ? 'تعديل رقم واتساب' : 'إضافة رقم واتساب جديد'}
                </h4>
              </div>
              <button
                onClick={() => setShowWaModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم القسم أو المسمى:
                </label>
                <input
                  type="text"
                  value={waName}
                  onChange={(e) => setWaName(e.target.value)}
                  placeholder="مثال: الدعم الفني، خدمة المشتركين، الاستشارات الجمركية"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الواتساب:
                </label>
                <input
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="0599123456 أو +970599123456"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الوصف أو ساعات الرد (اختياري):
                </label>
                <input
                  type="text"
                  value={waDescription}
                  onChange={(e) => setWaDescription(e.target.value)}
                  placeholder="مثال: متاح طيلة أيام الأسبوع للرد السريع"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveWaItem}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد الرقم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWaModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-l from-[#193225] to-[#12281e] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">
                  {editingPhoneId ? 'تعديل رقم الهاتف' : 'إضافة رقم هاتف أرضي/مباشر'}
                </h4>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المسمى أو الإدارة:
                </label>
                <input
                  type="text"
                  value={phoneName}
                  onChange={(e) => setPhoneName(e.target.value)}
                  placeholder="مثال: بدالة الوزارة - رام الله"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف:
                </label>
                <input
                  type="text"
                  value={phoneNum}
                  onChange={(e) => setPhoneNum(e.target.value)}
                  placeholder="+970 2 297 8888"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSavePhoneItem}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد الهاتف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
