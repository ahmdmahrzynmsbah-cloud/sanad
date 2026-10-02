import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Users,
  Search,
  Filter,
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  CheckCircle2,
  Building2,
  UserCheck,
  ShieldCheck,
  Plus,
  ArrowRight,
  Shuffle,
  Sparkles,
  Award,
  X,
  Loader2,
  FileText,
  Upload,
  AlertCircle,
  ExternalLink,
  PhoneCall,
  Settings,
  Edit3,
  Trash2,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  ProfessionalProfile,
  ProfessionalType,
  ProfessionalTypeOption,
  DEFAULT_PROFESSIONAL_TYPES,
  PALESTINIAN_GOVERNORATES,
  PROFESSIONAL_SERVICES_LIST
} from '../types';
import { compressImageClientSide } from '../utils/imageCompressor';
import { notifySync, useSync } from '../utils/sync';
import { SkeletonProfessionalCard } from './common/Skeleton';
import { directFetchProfessionalsPaginatedFromFirestore } from '../services/clientFirestore';
import {
  getCachedProfessionalTypes,
  fetchProfessionalTypes,
  saveProfessionalTypesList
} from '../services/professionalTypesService';

interface ProfessionalsDirectoryViewProps {
  initialType?: ProfessionalType | 'all';
  onBackToHome: () => void;
  onOpenChatWithAdvisor?: (advisorName: string) => void;
}

// Fisher-Yates array randomizer for unbiased exposure
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const ProfessionalsDirectoryView: React.FC<ProfessionalsDirectoryViewProps> = ({
  initialType = 'all',
  onBackToHome,
}) => {
  const [dynamicTypes, setDynamicTypes] = useState<ProfessionalTypeOption[]>(() => getCachedProfessionalTypes());
  const [activeTypeTab, setActiveTypeTab] = useState<ProfessionalType | 'all'>(initialType);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('all');
  
  // Dynamic Types Management Modal State
  const [showTypeManagerModal, setShowTypeManagerModal] = useState<boolean>(false);
  const [editingTypesList, setEditingTypesList] = useState<ProfessionalTypeOption[]>([]);
  const [newTypeLabel, setNewTypeLabel] = useState<string>('');
  const [newTypeDescription, setNewTypeDescription] = useState<string>('');
  const [newTypeIcon, setNewTypeIcon] = useState<string>('UserCheck');
  const [typeManagerFeedback, setTypeManagerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync and fetch dynamic types
  useEffect(() => {
    fetchProfessionalTypes().then((types) => {
      if (types && types.length > 0) {
        setDynamicTypes(types);
      }
    });

    const handleTypesUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setDynamicTypes(e.detail);
      }
    };
    window.addEventListener('sanad_professional_types_updated', handleTypesUpdate);
    return () => window.removeEventListener('sanad_professional_types_updated', handleTypesUpdate);
  }, []);

  useSync(['professionals_types', 'settings', 'all'], () => {
    fetchProfessionalTypes().then((types) => {
      if (types && types.length > 0) {
        setDynamicTypes(types);
      }
    });
  });

  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>(() => {
    try {
      const cached = localStorage.getItem('sanad_cached_professionals');
      if (cached) {
        const parsed = JSON.parse(cached);
        const mockIds = ['prof-firm-1', 'prof-firm-2', 'prof-firm-3', 'prof-firm-4', 'prof-auditor-1', 'prof-auditor-2', 'prof-auditor-3', 'prof-accountant-1', 'prof-accountant-2', 'prof-accountant-3'];
        const real = Array.isArray(parsed) ? parsed.filter((p: any) => p && p.name && !mockIds.includes(p.id)) : [];
        if (real.length > 0) {
          return real.filter((p: any) => p.status === 'approved');
        }
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const PAGE_SIZE = 9;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTypeTab, selectedGovernorate, selectedService, searchQuery]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // New Registration Form State
  const [formType, setFormType] = useState<ProfessionalType>(() => {
    const cached = getCachedProfessionalTypes();
    return cached[0]?.id || 'accountant';
  });
  const [formName, setFormName] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formGovernorate, setFormGovernorate] = useState<string>(PALESTINIAN_GOVERNORATES[1]); // رام الله والبيرة
  const [formCity, setFormCity] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formSecondaryPhone, setFormSecondaryPhone] = useState<string>('');
  const [formWhatsapp, setFormWhatsapp] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formWebsite, setFormWebsite] = useState<string>('');
  const [formBio, setFormBio] = useState<string>('');
  const [formLicenseNumber, setFormLicenseNumber] = useState<string>('');
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formLogoUrl, setFormLogoUrl] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // Helper to render type icons
  const renderTypeIcon = (iconName?: string, className = "w-5 h-5") => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Building2':
        return <Building2 className={className} />;
      case 'Award':
      case 'Scale':
        return <Award className={className} />;
      case 'Briefcase':
        return <Briefcase className={className} />;
      case 'FileText':
        return <FileText className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'UserCheck':
      default:
        return <UserCheck className={className} />;
    }
  };

  // Fetch approved professionals from backend / Firestore with bounded pagination
  const fetchProfessionals = async () => {
    setIsLoading(true);
    let loadedItems: any[] | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`/api/professionals?t=${Date.now()}`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        if (data.professionals && Array.isArray(data.professionals)) {
          loadedItems = data.professionals;
        }
      }
    } catch (err) {
      console.warn('API fetch professionals notice, trying direct Firestore:', err);
    }

    if (!loadedItems || loadedItems.length === 0) {
      try {
        const paged = await directFetchProfessionalsPaginatedFromFirestore({ pageSize: 50 });
        if (paged.items && paged.items.length > 0) {
          loadedItems = paged.items;
        }
      } catch (fsErr) {
        console.warn('Direct Firestore fetch professionals error:', fsErr);
      }
    }

    if (loadedItems && Array.isArray(loadedItems)) {
      const mockIds = ['prof-firm-1', 'prof-firm-2', 'prof-firm-3', 'prof-firm-4', 'prof-auditor-1', 'prof-auditor-2', 'prof-auditor-3', 'prof-accountant-1', 'prof-accountant-2', 'prof-accountant-3'];
      const realItems = loadedItems.filter((p: any) => p && p.name && !mockIds.includes(p.id));
      const approvedOnly = realItems.filter((p: ProfessionalProfile) => p.status === 'approved');
      setProfessionals(approvedOnly);
      try {
        const cachedRaw = localStorage.getItem('sanad_cached_professionals');
        const cached: ProfessionalProfile[] = cachedRaw ? JSON.parse(cachedRaw) : [];
        const map = new Map<string, ProfessionalProfile>();
        cached.forEach((p) => { if (p && p.id) map.set(p.id, p); });
        realItems.forEach((p) => { if (p && p.id) map.set(p.id, p); });
        localStorage.setItem('sanad_cached_professionals', JSON.stringify(Array.from(map.values())));
      } catch {}
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  useSync(['professionals', 'all'], () => {
    fetchProfessionals();
  });

  // Filtered list
  const filteredProfessionals = useMemo(() => {
    return professionals.filter((item) => {
      // Status check (only approved in public directory)
      if (item.status !== 'approved') return false;

      // Type tab check
      if (activeTypeTab !== 'all' && item.type !== activeTypeTab) return false;

      // Governorate filter
      if (selectedGovernorate !== 'all' && item.governorate !== selectedGovernorate) return false;

      // Service tag filter
      if (selectedService !== 'all' && (!item.services || !item.services.includes(selectedService))) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesCity = item.city?.toLowerCase().includes(q);
        const matchesAddress = item.address?.toLowerCase().includes(q);
        const matchesPhone = item.phone?.includes(q) || item.whatsapp?.includes(q);
        const matchesServices = item.services?.some((s) => s.toLowerCase().includes(q));
        const matchesBio = item.bio?.toLowerCase().includes(q);

        if (!matchesName && !matchesTitle && !matchesCity && !matchesAddress && !matchesPhone && !matchesServices && !matchesBio) {
          return false;
        }
      }

      return true;
    });
  }, [professionals, activeTypeTab, selectedGovernorate, selectedService, searchQuery]);

  // Handle Logo Upload in Registration Form
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const compressed = await compressImageClientSide(file, 400, 400);
      setFormLogoUrl(compressed);
    } catch (err) {
      console.error('Logo compression failed:', err);
      // Fallback direct FileReader
      const reader = new FileReader();
      reader.onload = () => setFormLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Toggle Service in Registration Form
  const toggleService = (srv: string) => {
    if (formServices.includes(srv)) {
      setFormServices(formServices.filter((s) => s !== srv));
    } else {
      setFormServices([...formServices, srv]);
    }
  };

  // Submit Public Registration Request
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
    const newProfessional: ProfessionalProfile = {
      id: newId,
      type: formType,
      name: formName.trim(),
      title: formTitle.trim() || (formType === 'firm' ? 'مكتب محاسبة وتدقيق' : formType === 'auditor' ? 'مدقق حسابات قانوني' : 'محاسب قانوني'),
      governorate: formGovernorate,
      city: formCity.trim(),
      address: formAddress.trim(),
      phone: formPhone.trim(),
      secondaryPhone: formSecondaryPhone.trim(),
      whatsapp: formWhatsapp.trim() || formPhone.trim(),
      email: formEmail.trim(),
      website: formWebsite.trim(),
      logoUrl: formLogoUrl.trim(),
      services: formServices.length > 0 ? formServices : ['خدمات محاسبية وضريبية'],
      bio: formBio.trim(),
      licenseNumber: formLicenseNumber.trim(),
      status: 'pending', // Awaits admin review & approval
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately store in client localStorage so Admin Portal and tabs see it instantly
    try {
      const cachedRaw = localStorage.getItem('sanad_cached_professionals');
      const cachedList: ProfessionalProfile[] = cachedRaw ? JSON.parse(cachedRaw) : [];
      const updatedList = [newProfessional, ...cachedList.filter((p) => p.id !== newProfessional.id)];
      localStorage.setItem('sanad_cached_professionals', JSON.stringify(updatedList));
    } catch {}

    // 2. Direct Cloud Firestore Save as pending
    try {
      const { directSaveProfessionalToFirestore } = await import('../services/clientFirestore');
      await directSaveProfessionalToFirestore(newProfessional);
    } catch (fsErr) {
      console.warn('Direct Firestore save notice:', fsErr);
    }

    // 3. API Server Registration
    try {
      const res = await fetch('/api/professionals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfessional),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.professional) {
          try {
            const cachedRaw = localStorage.getItem('sanad_cached_professionals');
            const cachedList: ProfessionalProfile[] = cachedRaw ? JSON.parse(cachedRaw) : [];
            const merged = [data.professional, ...cachedList.filter((p) => p.id !== data.professional.id && p.id !== newProfessional.id)];
            localStorage.setItem('sanad_cached_professionals', JSON.stringify(merged));
          } catch {}
        }
      }
    } catch (apiErr) {
      console.warn('API registration sync notice:', apiErr);
    }

    // 4. Broadcast Realtime Sync to Admin Portal and all open tabs
    notifySync('professionals');
    notifySync('all');
    try {
      window.dispatchEvent(new CustomEvent('sanad_professionals_updated', { detail: { professional: newProfessional } }));
    } catch {}

    setRegistrationSuccess(true);
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormTitle('');
    setFormCity('');
    setFormAddress('');
    setFormPhone('');
    setFormSecondaryPhone('');
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

  // Re-shuffle manually
  const handleShuffle = () => {
    setProfessionals((prev) => shuffleArray(prev));
  };

  // Stats calculation
  const counts = useMemo(() => {
    const approved = professionals.filter((p) => p.status === 'approved' || !p.status);
    const res: Record<string, number> = { all: approved.length };
    dynamicTypes.forEach((t) => {
      res[t.id] = approved.filter((p) => p.type === t.id).length;
    });
    return res;
  }, [professionals, dynamicTypes]);

  // Handle open type manager modal
  const handleOpenTypeManager = () => {
    setEditingTypesList(JSON.parse(JSON.stringify(dynamicTypes)));
    setNewTypeLabel('');
    setNewTypeDescription('');
    setNewTypeIcon('UserCheck');
    setTypeManagerFeedback(null);
    setShowTypeManagerModal(true);
  };

  // Save customized professional types
  const handleSaveCustomTypes = async (typesToSave: ProfessionalTypeOption[]) => {
    setDynamicTypes(typesToSave);
    await saveProfessionalTypesList(typesToSave);
    notifySync('professionals_types');
    setTypeManagerFeedback({ type: 'success', message: 'تم حفظ وتحديث المسميات والتصنيفات بنجاح!' });
    setTimeout(() => {
      setTypeManagerFeedback(null);
    }, 3000);
  };

  // Add a new custom type
  const handleAddNewType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeLabel.trim()) return;

    const slug = 'type-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 5);
    const newOption: ProfessionalTypeOption = {
      id: slug,
      label: newTypeLabel.trim(),
      description: newTypeDescription.trim(),
      icon: newTypeIcon || 'UserCheck',
      order: editingTypesList.length + 1,
      isActive: true,
    };

    const updated = [...editingTypesList, newOption];
    setEditingTypesList(updated);
    setNewTypeLabel('');
    setNewTypeDescription('');
    await handleSaveCustomTypes(updated);
  };

  // Rename or edit existing type
  const handleUpdateTypeInList = (id: string, updates: Partial<ProfessionalTypeOption>) => {
    const updated = editingTypesList.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setEditingTypesList(updated);
  };

  // Delete a type from list
  const handleDeleteType = async (id: string) => {
    if (editingTypesList.length <= 1) {
      alert('يجب أن يتبقى تصنيف واحد على الأقل في الدليل.');
      return;
    }
    const updated = editingTypesList.filter((t) => t.id !== id);
    setEditingTypesList(updated);
    await handleSaveCustomTypes(updated);
  };

  // Reset to default types
  const handleResetToDefaultTypes = async () => {
    if (window.confirm('هل أنت متأكد من استعادة المسميات والتصنيفات الافتراضية؟')) {
      const def = [...DEFAULT_PROFESSIONAL_TYPES];
      setEditingTypesList(def);
      await handleSaveCustomTypes(def);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-10 space-y-5 sm:space-y-8 animate-in fade-in duration-300 font-['IBM_Plex_Sans_Arabic',sans-serif]">
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
              <Briefcase className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>دليل المحاسبين والمدققين والمكاتب</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  فلسطين
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-normal">
                دليل معتمد للمحاسبين القانونيين ومدققي الحسابات ومكاتب المحاسبة والتدقيق المرخصة بدولة فلسطين
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleOpenTypeManager}
            title="تعديل وتخصيص مسميات وتصنيفات الدليل"
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-700" />
            <span>تخصيص المسميات</span>
          </button>
          <button
            onClick={handleShuffle}
            title="إعادة الترتيب العشوائي للظهور العادل"
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Shuffle className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">ترتيب عادل</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsRegisterModalOpen(true);
            }}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#12281e] hover:bg-[#1a382b] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#12281e]"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>سجّل بياناتك في الدليل المهني</span>
          </button>
        </div>
      </div>

      {/* Directory Filter Tabs (Dynamic) */}
      <div className="flex items-center gap-2 overflow-x-auto touch-scroll overscroll-x-contain pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTypeTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
            activeTypeTab === 'all'
              ? 'bg-[#12281e] text-white shadow-xs border border-[#12281e]'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>كافة المهنيين والمكاتب</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeTypeTab === 'all' ? 'bg-[#0b1a13] text-emerald-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {counts.all || 0}
          </span>
        </button>

        {dynamicTypes.filter((t) => t.isActive !== false).map((typeOpt) => {
          const isSelected = activeTypeTab === typeOpt.id;
          const count = counts[typeOpt.id] || 0;
          return (
            <button
              key={typeOpt.id}
              onClick={() => setActiveTypeTab(typeOpt.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-[#12281e] text-white shadow-xs border border-[#12281e]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {renderTypeIcon(typeOpt.icon, 'w-4 h-4 text-emerald-400')}
              <span>{typeOpt.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isSelected ? 'bg-[#0b1a13] text-emerald-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Search & Filters Controls */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، المدينة، الخدمة، أو رقم الهاتف..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 rounded-xl text-xs sm:text-sm text-slate-900 transition-all placeholder:text-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Governorate Filter */}
            <div className="md:col-span-3 relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-700" />
              </div>
              <select
                value={selectedGovernorate}
                onChange={(e) => setSelectedGovernorate(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 rounded-xl text-xs sm:text-sm font-bold text-slate-800 transition-all cursor-pointer"
              >
                <option value="all">كافة المحافظات الفلسطينية</option>
                {PALESTINIAN_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>
                    محافظة {gov}
                  </option>
                ))}
              </select>
            </div>

            {/* Services Filter */}
            <div className="md:col-span-3 relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-4 h-4 text-emerald-700" />
              </div>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 rounded-xl text-xs sm:text-sm font-bold text-slate-800 transition-all cursor-pointer"
              >
                <option value="all">كافة الخدمات والأنشطة</option>
                {PROFESSIONAL_SERVICES_LIST.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Stats & Active Filter Chips */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">
                عدد النتائج المتاحة: ({filteredProfessionals.length})
              </span>
              {selectedGovernorate !== 'all' && (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                  <span>محافظة: {selectedGovernorate}</span>
                  <button onClick={() => setSelectedGovernorate('all')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedService !== 'all' && (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                  <span>خدمة: {selectedService}</span>
                  <button onClick={() => setSelectedService('all')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                  <span>بحث: {searchQuery}</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {(selectedGovernorate !== 'all' || selectedService !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedGovernorate('all');
                  setSelectedService('all');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                إعادة ضبط كافة الفلاتر
              </button>
            )}
          </div>
        </div>

        {/* Directory Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonProfessionalCard key={idx} />
            ))}
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">لم يتم العثور على نتائج مطابقة</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              لم نعثر على محاسبين أو مكاتب تطابق معايير البحث الحالية. يمكنك تغيير الفلاتر أو تسجيل مكتبك للانضمام للدليل.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSelectedGovernorate('all');
                  setSelectedService('all');
                  setSearchQuery('');
                  setActiveTypeTab('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                عرض كافة المسجلين
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setIsRegisterModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>سجّل مكتبك الآن</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfessionals.slice(0, visibleCount).map((prof) => {
                const cleanWhatsapp = (prof.whatsapp || prof.phone || '').replace(/[^\d+]/g, '');
              const waLink = cleanWhatsapp.startsWith('0')
                ? `https://wa.me/970${cleanWhatsapp.substring(1)}`
                : cleanWhatsapp.startsWith('+')
                ? `https://wa.me/${cleanWhatsapp.substring(1)}`
                : cleanWhatsapp.startsWith('970') || cleanWhatsapp.startsWith('972')
                ? `https://wa.me/${cleanWhatsapp}`
                : `https://wa.me/970${cleanWhatsapp}`;

              return (
                <div
                  key={prof.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-600/40 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  {/* Card Header & Profile */}
                  <div className="p-5">
                    <div className="flex items-start gap-3.5 mb-4">
                      {/* Logo / Avatar */}
                      <div className="relative shrink-0">
                        {prof.logoUrl ? (
                          <img
                            src={prof.logoUrl}
                            alt={prof.name}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              // Fallback on image load error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200">
                            {renderTypeIcon(dynamicTypes.find((t) => t.id === prof.type)?.icon, 'w-7 h-7 text-emerald-800')}
                          </div>
                        )}
                        {prof.isVerified && (
                          <span
                            title="مهني معتمد وموثق رسمياً"
                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-700 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      {/* Name & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-emerald-50 text-emerald-900 border-emerald-200">
                            {dynamicTypes.find((t) => t.id === prof.type)?.label || (prof.type === 'firm' ? 'مكتب / شركة' : prof.type === 'auditor' ? 'مدقق قانوني' : 'محاسب قانوني')}
                          </span>
                          {prof.licenseNumber && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                              ترخيص: {prof.licenseNumber}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1 leading-snug group-hover:text-emerald-900 transition-colors">
                          {prof.name}
                        </h3>
                        <p className="text-xs text-emerald-800 font-semibold mt-0.5 line-clamp-1">
                          {prof.title}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="font-bold text-slate-800">{prof.governorate}</span>
                      {prof.city && <span className="text-slate-500">• {prof.city}</span>}
                      {prof.address && <span className="text-slate-400 text-[11px] truncate">• {prof.address}</span>}
                    </div>

                    {/* Bio (if available) */}
                    {prof.bio && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {prof.bio}
                      </p>
                    )}

                    {/* Services Chips */}
                    {prof.services && prof.services.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-400 block">الخدمات المعتمدة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {prof.services.slice(0, 4).map((srv, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80"
                            >
                              {srv}
                            </span>
                          ))}
                          {prof.services.length > 4 && (
                            <span className="text-[10px] font-bold bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              +{prof.services.length - 4} خدمات
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      {prof.phone && (
                        <a
                          href={`tel:${prof.phone}`}
                          className="flex-1 px-3 py-2 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                          <span>اتصال مباشر</span>
                        </a>
                      )}
                      {(prof.whatsapp || prof.phone) && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>واتساب</span>
                        </a>
                      )}
                    </div>

                    {prof.website && (
                      <a
                        href={prof.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-colors shadow-2xs"
                        title="الموقع الإلكتروني أو صفحة المنشأة"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination / Lazy Load More */}
          {visibleCount < filteredProfessionals.length && (
            <div className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-medium order-2 sm:order-1">
                معروض <strong className="text-slate-900">{Math.min(visibleCount, filteredProfessionals.length)}</strong> من إجمالي{' '}
                <strong className="text-slate-900">{filteredProfessionals.length}</strong> سجل معتمد
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredProfessionals.length))}
                className="order-1 sm:order-2 px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-800 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>تحميل وعرض المزيد (+{Math.min(PAGE_SIZE, filteredProfessionals.length - visibleCount)})</span>
                <ArrowRight className="w-4 h-4 rotate-90 text-emerald-700" />
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Public Registration Modal (انضم للدليل المهني) */}
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
                  <h3 className="font-black text-base text-white">تسجيل في الدليل المهني الفلسطيني</h3>
                  <p className="text-[11px] text-emerald-300">
                    انضم إلى شبكة المحاسبين والمدققين والمكاتب المعتمدة
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
                  <h4 className="text-lg font-bold text-slate-900">تم استلام طلب التسجيل بنجاح!</h4>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    شكراً لانضمامك. تم تسجيل بياناتك بنجاح وحفظها في قاعدة البيانات السحابية، وستظهر في الدليل العام فور مراجعتها واعتمادها من قِبل إدارة المنصة.
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
                  {/* Dynamic Type Selection (Focused Element) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-800">
                        نوع التسجيل في الدليل <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenTypeManager}
                        className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="تعديل وتخصيص المسميات والتصنيفات"
                      >
                        <Edit3 className="w-3 h-3 text-emerald-700" />
                        <span>تخصيص وتعديل المسميات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {dynamicTypes.filter((t) => t.isActive !== false).map((typeOpt) => {
                        const isSelected = formType === typeOpt.id;
                        return (
                          <button
                            key={typeOpt.id}
                            type="button"
                            onClick={() => setFormType(typeOpt.id)}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <div className="mx-auto mb-1 text-emerald-700 flex justify-center">
                              {renderTypeIcon(typeOpt.icon, 'w-5 h-5')}
                            </div>
                            <span className="text-xs block font-bold">{typeOpt.label}</span>
                            {typeOpt.description && (
                              <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                {typeOpt.description}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        الاسم الكامل / اسم المكتب أو الشركة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={formType === 'firm' ? 'مثال: شركة النخبة للتدقيق والاستشارات' : 'مثال: أ. أحمد مصطفى خليل'}
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
                        placeholder="مثال: مدقق حسابات قانوني مرخص / محاسب مالي معتمد"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Governorate & City & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        المحافظة <span className="text-red-500">*</span>
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
                        placeholder="مثال: رام الله، بيتونيا..."
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

                  {/* Contact Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رقم الهاتف / الجوال الأساسي <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="مثال: 0599123456"
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
                        placeholder="مثال: 0599123456"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رقم ترخيص المزاولة / العضوية
                      </label>
                      <input
                        type="text"
                        value={formLicenseNumber}
                        onChange={(e) => setFormLicenseNumber(e.target.value)}
                        placeholder="مثال: JCPA-105"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Email & Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="info@example.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        الموقع الإلكتروني أو صفحة الفيسبوك
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
                      الشعار أو الصورة الشخصية (اختياري)
                    </label>
                    <div className="flex items-center gap-3">
                      {formLogoUrl ? (
                        <div className="relative">
                          <img
                            src={formLogoUrl}
                            alt="Logo preview"
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
                              <span>جاري معالجة الصورة...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                              <Upload className="w-4 h-4 text-emerald-700" />
                              <span>انقر لاختيار الشعار أو الصورة من جهازك</span>
                            </div>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Services Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      الخدمات التي تقدمها (حدد ما ينطبق):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROFESSIONAL_SERVICES_LIST.map((srv) => {
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
                      نبذة تعريفية ومجالات الخبرة
                    </label>
                    <textarea
                      rows={3}
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      placeholder="اكتب نبذة مختصرة عن خبراتك، اختصاصاتك، سنوات العمل..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white resize-none"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsRegisterModalOpen(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
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
                          <span>جاري الإرسال...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>إرسال طلب الانضمام للدليل</span>
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

      {/* Dynamic Type Manager Modal (إدارة وتخصيص المسميات والتصنيفات) */}
      {showTypeManagerModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#12281e] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">تخصيص وتعديل مسميات وتصنيفات الدليل</h3>
                  <p className="text-[11px] text-emerald-300">
                    يمكنك تعديل مسميات الخانات، تغيير النصوص، أو إضافة مسميات وتصنيفات جديدة بحرية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTypeManagerModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {typeManagerFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{typeManagerFeedback.message}</span>
                </div>
              )}

              {/* Add New Type Form */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>إضافة مسمى / تصنيف جديد للدليل</span>
                </h4>
                <form onSubmit={handleAddNewType} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        اسم المسمى / التصنيف الجديد <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newTypeLabel}
                        onChange={(e) => setNewTypeLabel(e.target.value)}
                        placeholder="مثال: مستشار ضريبي / خبير قضائي"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        أيقونة التصنيف
                      </label>
                      <select
                        value={newTypeIcon}
                        onChange={(e) => setNewTypeIcon(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                      >
                        <option value="UserCheck">👤 محاسب / شخصي (UserCheck)</option>
                        <option value="ShieldCheck">🛡️ مدقق حسابات (ShieldCheck)</option>
                        <option value="Building2">🏢 مكتب / شركة (Building2)</option>
                        <option value="Award">⚖️ مستشار / خبير (Award)</option>
                        <option value="Briefcase">💼 أعمال واستشارات (Briefcase)</option>
                        <option value="FileText">📄 تقارير ووثائق (FileText)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      وصف مختصر (اختياري)
                    </label>
                    <input
                      type="text"
                      value={newTypeDescription}
                      onChange={(e) => setNewTypeDescription(e.target.value)}
                      placeholder="مثال: مستشارون وخبراء ضرائب معتمدون"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newTypeLabel.trim()}
                      className="px-4 py-2 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>إضافة المسمى الآن</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Types List with In-Place Renaming */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    المسميات والتصنيفات الحالية ({editingTypesList.length}):
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetToDefaultTypes}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة الافتراضية</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editingTypesList.map((typeItem) => (
                    <div
                      key={typeItem.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-2xs space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                            {renderTypeIcon(typeItem.icon, 'w-4 h-4')}
                          </div>
                          <input
                            type="text"
                            value={typeItem.label}
                            onChange={(e) => handleUpdateTypeInList(typeItem.id, { label: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                            placeholder="اسم المسمى"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={typeItem.icon || 'UserCheck'}
                            onChange={(e) => handleUpdateTypeInList(typeItem.id, { icon: e.target.value })}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer"
                          >
                            <option value="UserCheck">👤 شخصي</option>
                            <option value="ShieldCheck">🛡️ تدقيق</option>
                            <option value="Building2">🏢 مكتب</option>
                            <option value="Award">⚖️ خبير</option>
                            <option value="Briefcase">💼 أعمال</option>
                            <option value="FileText">📄 وثائق</option>
                          </select>

                          {editingTypesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteType(typeItem.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="حذف هذا المسمى"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={typeItem.description || ''}
                          onChange={(e) => handleUpdateTypeInList(typeItem.id, { description: e.target.value })}
                          className="w-full px-2.5 py-1 bg-slate-50/60 focus:bg-white border border-slate-200 focus:border-emerald-600 rounded-lg text-[11px] text-slate-600 focus:outline-none"
                          placeholder="وصف إضافي للمسمى أو الشروط (اختياري)..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                يتم تطبيق التعديلات وتحديث خيارات التسجيل والفلاتر فوراً
              </span>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveCustomTypes(editingTypesList);
                  setShowTypeManagerModal(false);
                }}
                className="px-5 py-2.5 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>حفظ واعتماد المسميات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
