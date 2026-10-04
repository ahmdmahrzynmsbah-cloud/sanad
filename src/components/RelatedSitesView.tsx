import React, { useState, useEffect } from 'react';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  Search,
  ArrowRight,
  Landmark,
  FileText,
  Building2,
  BookOpen,
  Sparkles,
  Link2,
  Tag,
  Briefcase,
  Users,
  Plus,
  X,
  CheckCircle2,
  Loader2,
  Upload,
  AlertCircle,
  UserCheck,
  Edit3
} from 'lucide-react';
import { RelatedSite, ProfessionalType, PALESTINIAN_GOVERNORATES } from '../types';
import { useSync, notifySync } from '../utils/sync';
import { compressImageClientSide } from '../utils/imageCompressor';
import { getCachedProfessionalServices, fetchProfessionalServices } from '../services/professionalTypesService';

interface RelatedSitesViewProps {
  onBackToHome: () => void;
  onGoToAdminPortal?: () => void;
  onGoToProfessionalsDirectory?: () => void;
  isAdmin?: boolean;
}

export const RelatedSitesView: React.FC<RelatedSitesViewProps> = ({
  onBackToHome,
  onGoToAdminPortal,
  onGoToProfessionalsDirectory,
  isAdmin,
}) => {
  const [sites, setSites] = useState<RelatedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Dynamic header customization
  const [customTitle, setCustomTitle] = useState(() => {
    try {
      const saved = localStorage.getItem('related_sites_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return 'دليل المواقع والمنصات ذات الصلة';
  });

  const [customSubtitle, setCustomSubtitle] = useState(() => {
    try {
      const saved = localStorage.getItem('related_sites_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subtitle) return parsed.subtitle;
      }
    } catch {}
    return 'بوابات حكومية، تشريعية، واقتصادية فلسطينية معتمدة تخدم المكلفين والتجار والمستوردين';
  });

  const loadHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/related-sites-header');
      if (res.ok) {
        const data = await res.json();
        if (data.title) setCustomTitle(data.title);
        if (data.subtitle) setCustomSubtitle(data.subtitle);
      }
    } catch {}
  };

  useEffect(() => {
    loadHeaderSettings();
  }, []);

  useSync(['related_sites_header', 'all'], () => {
    loadHeaderSettings();
  });

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formType, setFormType] = useState<ProfessionalType>('accountant');
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formGovernorate, setFormGovernorate] = useState(PALESTINIAN_GOVERNORATES[1]);
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [dynamicServices, setDynamicServices] = useState<string[]>(() => getCachedProfessionalServices());

  useEffect(() => {
    fetchProfessionalServices().then((srvs) => {
      if (srvs && srvs.length > 0) {
        setDynamicServices(srvs);
      }
    });

    const handleServicesUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setDynamicServices(e.detail);
      }
    };
    window.addEventListener('sanad_professional_services_updated', handleServicesUpdate);
    return () => window.removeEventListener('sanad_professional_services_updated', handleServicesUpdate);
  }, []);

  useSync(['professionals_services', 'settings', 'all'], () => {
    fetchProfessionalServices().then((srvs) => {
      if (srvs && srvs.length > 0) {
        setDynamicServices(srvs);
      }
    });
  });

  const fetchSites = async () => {
    setLoading(true);
    const map = new Map<string, RelatedSite>();

    // 1. Cached sites
    try {
      const cached = localStorage.getItem('sanad_cached_related_sites');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => { if (s && s.id && s.title) map.set(s.id, s); });
        }
      }
    } catch {}

    // 2. API fetch
    try {
      const res = await fetch(`/api/related-sites?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.relatedSites && Array.isArray(data.relatedSites)) {
          data.relatedSites.forEach((s: any) => { if (s && s.id && s.title) map.set(s.id, s); });
        }
      }
    } catch (err) {
      console.warn('API fetch related sites notice, trying Firestore fallback:', err);
    }

    // 3. Direct Firestore Fallback
    try {
      const { directFetchRelatedSitesFromFirestore } = await import('../services/clientFirestore');
      const fsSites = await directFetchRelatedSitesFromFirestore();
      if (fsSites && Array.isArray(fsSites)) {
        fsSites.forEach((s: any) => { if (s && s.id && s.title) map.set(s.id, s); });
      }
    } catch (fsErr) {
      console.warn('Firestore fallback fetch notice:', fsErr);
    }

    const merged = Array.from(map.values());
    if (merged.length > 0) {
      setSites(merged);
      try {
        localStorage.setItem('sanad_cached_related_sites', JSON.stringify(merged));
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useSync(['related_sites', 'all'], () => {
    fetchSites();
  });

  const categories = Array.from(
    new Set(sites.map((s) => s.category).filter(Boolean))
  ) as string[];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const compressed = await compressImageClientSide(file, 400, 400);
      setFormLogoUrl(compressed);
    } catch (err) {
      console.error('Logo compression failed:', err);
      const reader = new FileReader();
      reader.onload = () => setFormLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const toggleService = (srv: string) => {
    if (formServices.includes(srv)) {
      setFormServices(formServices.filter((s) => s !== srv));
    } else {
      setFormServices([...formServices, srv]);
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setSubmitError('يرجى إدخال الاسم أو اسم المكتب/الشركة');
      return;
    }
    if (!formPhone.trim()) {
      setSubmitError('يرجى إدخال رقم الهاتف الأساسي للتواصل');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const newId = 'prof-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newProfessional = {
      id: newId,
      type: formType,
      name: formName.trim(),
      title: formTitle.trim() || (formType === 'firm' ? 'مكتب محاسبة وتدقيق' : formType === 'auditor' ? 'مدقق حسابات قانوني' : 'محاسب قانوني'),
      governorate: formGovernorate,
      city: formCity.trim(),
      address: formAddress.trim(),
      phone: formPhone.trim(),
      whatsapp: formWhatsapp.trim() || formPhone.trim(),
      email: formEmail.trim(),
      website: formWebsite.trim(),
      logoUrl: formLogoUrl.trim(),
      services: formServices.length > 0 ? formServices : ['خدمات محاسبية وضريبية'],
      bio: formBio.trim(),
      licenseNumber: formLicenseNumber.trim(),
      status: 'pending', // Awaits admin approval
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Direct Cloud Firestore Save as pending
    try {
      const { directSaveProfessionalToFirestore } = await import('../services/clientFirestore');
      await directSaveProfessionalToFirestore(newProfessional);
    } catch (fsErr) {
      console.warn('Direct Firestore save notice:', fsErr);
    }

    // 2. Background API Server Sync
    try {
      fetch('/api/professionals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfessional),
      }).catch(() => {});
    } catch {}

    // 3. Realtime Broadcast
    notifySync('professionals');
    notifySync('all');

    setRegistrationSuccess(true);
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormTitle('');
    setFormCity('');
    setFormAddress('');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormWebsite('');
    setFormBio('');
    setFormLicenseNumber('');
    setFormServices([]);
    setFormLogoUrl('');
    setSubmitError(null);
    setRegistrationSuccess(false);
  };

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      (site.title && site.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.url && site.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.category && site.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || site.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-10 space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
        <div>
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors mb-2.5 sm:mb-3 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#12281e] text-white flex items-center justify-center font-bold shadow-xs border border-emerald-900/60 shrink-0">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {customTitle}
                </h1>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onGoToAdminPortal) {
                        onGoToAdminPortal();
                      } else {
                        const newTitle = prompt('تعديل عنوان دليل المواقع ذات الصلة:', customTitle);
                        if (newTitle && newTitle.trim()) {
                          setCustomTitle(newTitle.trim());
                          fetch('/api/admin/settings/related-sites-header', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: newTitle.trim() }),
                          }).then(() => notifySync('related_sites_header'));
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105"
                    title="تعديل هذا العنوان بالقلم ✍️"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>تعديل بالقلم ✍️</span>
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-normal">
                {customSubtitle}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && onGoToAdminPortal && (
          <button
            onClick={onGoToAdminPortal}
            className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 border border-emerald-600"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span>إدارة المواقع في لوحة التحكم</span>
          </button>
        )}
      </div>



      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الموقع، الخدمات، أو الرابط..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll overscroll-x-contain w-full md:w-auto pb-1.5 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع المواقع ({sites.length})
          </button>
          {categories.map((cat) => {
            const count = sites.filter((s) => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedCategory === cat
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 border-3 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">جارٍ تحميل دليل المواقع ذات الصلة...</p>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Globe className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لم يتم العثور على مواقع مطابقة</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery ? 'جرّب تعديل كلمات البحث أو اختيار تصنيف آخر.' : 'لم تتم إضافة مواقع ذات صلة بعد.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-blue-800 hover:underline cursor-pointer"
            >
              إعادة ضبط البحث
            </button>
          )}
        </div>
      ) : (
        /* Sites Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site, idx) => (
            <div
              key={site.id || idx}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6 space-y-3">
                {/* Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(site.category || 'موقع رسمي')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                    title={`تصفية حسب: ${site.category || 'موقع رسمي'}`}
                  >
                    <Tag className="w-2.5 h-2.5 text-blue-600" />
                    <span>{site.category || 'موقع رسمي'}</span>
                  </button>
                  {site.isOfficial !== false && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      جهة رسمية
                    </span>
                  )}
                </div>

                {/* Site Title */}
                <h3 className="text-base font-bold text-slate-950 group-hover:text-blue-800 transition-colors">
                  {site.title}
                </h3>

                {/* Site Description */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                  {site.description || 'بوابة رسمية متخصصة في الخدمات الحكومية والتشريعية في دولة فلسطين.'}
                </p>

                {/* Display URL */}
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono" dir="ltr">
                  <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{site.url.replace(/^https?:\/\//, '')}</span>
                </div>
              </div>

              {/* Card Footer: Direct Open Link Button */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-white hover:bg-blue-800 text-blue-900 hover:text-white border border-blue-200 hover:border-blue-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <span>زيارة الموقع الرسمي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal for Users/Visitors to Add Accountant / Auditor / Firm */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0c1c14] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-emerald-300">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">إضافة مكتب أو محاسب أو مدقق في الدليل</h3>
                  <p className="text-[11px] text-emerald-300">
                    أدخل البيانات والشعار والروابط وسيتم اعتمادها فوراً من الإدارة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {registrationSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">تم إرسال طلبك للإدارة بنجاح!</h4>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    شكراً لك. تم تسجيل بيانات المكتب / المحاسب / المدقق بنجاح وحفظها سحابياً، وسيتم نشرها في الدليل فور مراجعة الإدارة وموافقتها.
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => setIsRegisterModalOpen(false)}
                      className="px-6 py-2.5 bg-[#12281e] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#1a382b] transition-colors"
                    >
                      إغلاق ومتابعة التصفح
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  {/* Type Selection (التقسيمات الثلاثة) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      اختر التقسيمة المناسبة للإضافة <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFormType('accountant')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          formType === 'accountant'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <UserCheck className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                        <span className="text-xs block font-bold">1. دليل المحاسبين</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormType('auditor')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          formType === 'auditor'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                        <span className="text-xs block font-bold">2. دليل المدققين</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormType('firm')}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          formType === 'firm'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Building2 className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                        <span className="text-xs block font-bold">3. مكاتب المحاسبة والتدقيق</span>
                      </button>
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        الاسم / اسم المكتب أو الشركة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={formType === 'firm' ? 'مثال: مكتب الأمل للمحاسبة والتدقيق' : 'مثال: أ. محمود أحمد'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        المسمى المهني أو الصفة
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="مثال: مدقق حسابات قانوني مرخص / محاسب مالي"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Governorate & City & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        تتبع لأي محافظة؟ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formGovernorate}
                        onChange={(e) => setFormGovernorate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      >
                        {PALESTINIAN_GOVERNORATES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        المدينة / البلدة
                      </label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="رام الله، نابلس..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        العنوان التفصيلي
                      </label>
                      <input
                        type="text"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="الشارع، المجمع، الطابق..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Contact Numbers & Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رقم الهاتف الأساسي <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="0599000000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رقم الواتساب
                      </label>
                      <input
                        type="tel"
                        value={formWhatsapp}
                        onChange={(e) => setFormWhatsapp(e.target.value)}
                        placeholder="0599000000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رابط الموقع / صفحة الفيس بوك
                      </label>
                      <input
                        type="url"
                        value={formWebsite}
                        onChange={(e) => setFormWebsite(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Logo / Photo Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      شعار المكتب أو الصورة الشخصية
                    </label>
                    <div className="flex items-center gap-3">
                      {formLogoUrl ? (
                        <div className="relative">
                          <img
                            src={formLogoUrl}
                            alt="Logo"
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setFormLogoUrl('')}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-emerald-600 rounded-xl p-3 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          {isUploadingLogo ? (
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                              <span>جاري معالجة الشعار...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                              <Upload className="w-4 h-4 text-emerald-700" />
                              <span>اختر ملف الشعار/الصورة من جهازك</span>
                            </div>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Services Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      حدد الخدمات التي تقدمها:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {dynamicServices.map((srv) => {
                        const checked = formServices.includes(srv);
                        return (
                          <button
                            key={srv}
                            type="button"
                            onClick={() => toggleService(srv)}
                            className={`p-2 rounded-lg text-right text-xs font-semibold border transition-all flex items-center justify-between ${
                              checked
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate">{srv}</span>
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mr-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      نبذة تعريفية ورقم الترخيص (إن وجد)
                    </label>
                    <textarea
                      rows={2}
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      placeholder="معلومات إضافية، رقم الترخيص، سنوات الخبرة..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white resize-none"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsRegisterModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال للإدارة...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>إرسال للادمن للموافقة</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
