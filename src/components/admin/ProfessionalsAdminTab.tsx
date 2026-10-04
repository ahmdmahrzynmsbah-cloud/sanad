import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Building2,
  ShieldCheck,
  UserCheck,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  PhoneCall,
  Layers,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Settings2,
  Edit3
} from 'lucide-react';
import {
  ProfessionalProfile,
  ProfessionalType,
  ProfessionalTypeOption,
  DEFAULT_PROFESSIONAL_TYPES,
  PALESTINIAN_GOVERNORATES,
  PROFESSIONAL_SERVICES_LIST
} from '../../types';
import { compressImageClientSide } from '../../utils/imageCompressor';
import { useSync, notifySync } from '../../utils/sync';
import { SkeletonProfessionalRow } from '../common/Skeleton';
import {
  getCachedProfessionalTypes,
  fetchProfessionalTypes,
  saveProfessionalTypesList,
  getCachedProfessionalServices,
  fetchProfessionalServices,
  saveProfessionalServicesList
} from '../../services/professionalTypesService';

interface ProfessionalsAdminTabProps {
  professionals: ProfessionalProfile[];
  onRefresh: () => Promise<void>;
}

export const ProfessionalsAdminTab: React.FC<ProfessionalsAdminTabProps> = ({
  professionals,
  onRefresh,
}) => {
  const [items, setItems] = useState<ProfessionalProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sanad_cached_professionals');
        if (cached) {
          const parsed = JSON.parse(cached);
          const mockProfIds = ['prof-firm-1', 'prof-firm-2', 'prof-firm-3', 'prof-firm-4', 'prof-auditor-1', 'prof-auditor-2', 'prof-auditor-3', 'prof-accountant-1', 'prof-accountant-2', 'prof-accountant-3'];
          const real = Array.isArray(parsed) ? parsed.filter((p: any) => p && p.name && !mockProfIds.includes(p.id)) : [];
          if (real.length > 0) return real;
        }
      } catch {}
    }
    if (professionals && professionals.length > 0) return professionals;
    return [];
  });

  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Header customizable text state (نظام تعديل نصوص الدليل المهني بالقلم)
  const DEFAULT_PROF_TITLE = 'إدارة الدليل المهني (المحاسبين والمدققين والمكاتب)';
  const DEFAULT_PROF_SUBTITLE = 'إدارة ومراجعة طلبات الانضمام للدليل المهني واعتماد ظهورها أو تعديلها وحذفها.';

  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('professionals_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) return parsed.title;
      }
    } catch {}
    return DEFAULT_PROF_TITLE;
  });

  const [headerSubtitle, setHeaderSubtitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('professionals_header_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subtitle) return parsed.subtitle;
      }
    } catch {}
    return DEFAULT_PROF_SUBTITLE;
  });

  const [editingTarget, setEditingTarget] = useState<'none' | 'title' | 'subtitle' | 'all'>('none');
  const [editTitleDraft, setEditTitleDraft] = useState(headerTitle);
  const [editSubtitleDraft, setEditSubtitleDraft] = useState(headerSubtitle);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  const loadHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/professionals-header');
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
      console.warn('Load professionals header settings failed:', err);
    }
  };

  useEffect(() => {
    loadHeaderSettings();
  }, []);

  useSync(['professionals_header', 'all'], () => {
    loadHeaderSettings();
  });

  const handleSaveHeader = async (overrideTitle?: string, overrideSubtitle?: string) => {
    const finalTitle = (overrideTitle !== undefined ? overrideTitle : editTitleDraft).trim() || DEFAULT_PROF_TITLE;
    const finalSubtitle = (overrideSubtitle !== undefined ? overrideSubtitle : editSubtitleDraft).trim() || DEFAULT_PROF_SUBTITLE;

    setIsSavingHeader(true);
    setHeaderTitle(finalTitle);
    setHeaderSubtitle(finalSubtitle);
    setEditTitleDraft(finalTitle);
    setEditSubtitleDraft(finalSubtitle);

    try {
      localStorage.setItem('professionals_header_settings', JSON.stringify({
        title: finalTitle,
        subtitle: finalSubtitle,
        updatedAt: Date.now(),
      }));
    } catch {}

    try {
      await fetch('/api/admin/settings/professionals-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          subtitle: finalSubtitle,
        }),
      });
    } catch {}

    notifySync('professionals_header');
    setIsSavingHeader(false);
    setEditingTarget('none');
    setShowEditHeaderModal(false);
  };

  const handleResetHeader = () => {
    handleSaveHeader(DEFAULT_PROF_TITLE, DEFAULT_PROF_SUBTITLE);
  };

  const loadItems = async () => {
    setLoading(true);
    const mockProfIds = ['prof-firm-1', 'prof-firm-2', 'prof-firm-3', 'prof-firm-4', 'prof-auditor-1', 'prof-auditor-2', 'prof-auditor-3', 'prof-accountant-1', 'prof-accountant-2', 'prof-accountant-3'];
    const map = new Map<string, ProfessionalProfile>();

    // 1. Read from localStorage cache first
    try {
      const cached = localStorage.getItem('sanad_cached_professionals');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (p && p.name && !mockProfIds.includes(p.id)) {
              map.set(p.id, p);
            }
          });
        }
      }
    } catch {}

    // 2. Fetch from API endpoint (all statuses)
    try {
      const res = await fetch(`/api/professionals?status=all&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.professionals && Array.isArray(data.professionals)) {
          data.professionals.forEach((p: any) => {
            if (p && p.name && !mockProfIds.includes(p.id)) {
              map.set(p.id, p);
            }
          });
        }
      }
    } catch {}

    // 3. Direct Firestore Fallback / Complement
    try {
      const { directFetchProfessionalsFromFirestore } = await import('../../services/clientFirestore');
      const fsItems = await directFetchProfessionalsFromFirestore();
      if (fsItems && Array.isArray(fsItems)) {
        fsItems.forEach((p: any) => {
          if (p && p.name && !mockProfIds.includes(p.id)) {
            map.set(p.id, p);
          }
        });
      }
    } catch {}

    // 4. Incorporate props if any
    if (professionals && Array.isArray(professionals)) {
      professionals.forEach((p) => {
        if (p && p.name && !mockProfIds.includes(p.id)) {
          map.set(p.id, p);
        }
      });
    }

    const merged = Array.from(map.values()).sort((a, b) => {
      const aPending = a.status === 'pending' ? 1 : 0;
      const bPending = b.status === 'pending' ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    setItems(merged);
    try {
      localStorage.setItem('sanad_cached_professionals', JSON.stringify(merged));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadItems();

    // 1. Direct Realtime Firestore onSnapshot listener
    let unsubFirestore: (() => void) | null = null;
    import('../../services/clientFirestore')
      .then(({ subscribeToProfessionalsInFirestore }) => {
        unsubFirestore = subscribeToProfessionalsInFirestore((cloudItems) => {
          if (cloudItems && Array.isArray(cloudItems)) {
            setItems((prev) => {
              const map = new Map<string, ProfessionalProfile>();
              prev.forEach((p) => map.set(p.id, p));
              cloudItems.forEach((p) => map.set(p.id, p));
              const merged = Array.from(map.values()).sort((a, b) => {
                const aPending = a.status === 'pending' ? 1 : 0;
                const bPending = b.status === 'pending' ? 1 : 0;
                if (aPending !== bPending) return bPending - aPending;
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
              });
              try {
                localStorage.setItem('sanad_cached_professionals', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        });
      })
      .catch(() => {});

    // 2. Custom local window events & storage events
    const handleCustomUpdate = () => {
      loadItems();
    };
    window.addEventListener('sanad_professionals_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener('sanad_professionals_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  useEffect(() => {
    if (professionals && professionals.length > 0) {
      setItems((prev) => {
        const map = new Map<string, ProfessionalProfile>();
        prev.forEach((p) => map.set(p.id, p));
        professionals.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
    }
  }, [professionals]);

  const [dynamicTypes, setDynamicTypes] = useState<ProfessionalTypeOption[]>(() => getCachedProfessionalTypes());
  const [showTypeManagerModal, setShowTypeManagerModal] = useState<boolean>(false);
  const [editingTypesList, setEditingTypesList] = useState<ProfessionalTypeOption[]>([]);
  const [newTypeLabel, setNewTypeLabel] = useState<string>('');
  const [newTypeDescription, setNewTypeDescription] = useState<string>('');
  const [newTypeIcon, setNewTypeIcon] = useState<string>('UserCheck');
  const [typeManagerFeedback, setTypeManagerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic Professional Services State
  const [dynamicServices, setDynamicServices] = useState<string[]>(() => getCachedProfessionalServices());
  const [showServicesManagerModal, setShowServicesManagerModal] = useState<boolean>(false);
  const [editingServicesList, setEditingServicesList] = useState<string[]>([]);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [editingServiceIdx, setEditingServiceIdx] = useState<number | null>(null);
  const [editingServiceValue, setEditingServiceValue] = useState<string>('');
  const [servicesManagerFeedback, setServicesManagerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  useSync(['professionals_types', 'settings', 'all'], () => {
    fetchProfessionalTypes().then((types) => {
      if (types && types.length > 0) {
        setDynamicTypes(types);
      }
    });
  });

  useSync(['professionals_services', 'settings', 'all'], () => {
    fetchProfessionalServices().then((srvs) => {
      if (srvs && srvs.length > 0) {
        setDynamicServices(srvs);
      }
    });
  });

  useSync(['professionals', 'all'], () => {
    loadItems();
    onRefresh();
  });

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ProfessionalType>('all');
  const [govFilter, setGovFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, typeFilter, govFilter, searchQuery]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<ProfessionalType>(() => {
    const cached = getCachedProfessionalTypes();
    return cached[0]?.id || 'accountant';
  });
  const [formName, setFormName] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formGovernorate, setFormGovernorate] = useState<string>(PALESTINIAN_GOVERNORATES[1]);
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
  const [formStatus, setFormStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [formIsVerified, setFormIsVerified] = useState<boolean>(true);
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
        return <ShieldCheck className={className} />;
      case 'Briefcase':
        return <Briefcase className={className} />;
      case 'UserCheck':
      default:
        return <UserCheck className={className} />;
    }
  };

  const handleOpenTypeManager = () => {
    setEditingTypesList(JSON.parse(JSON.stringify(dynamicTypes)));
    setNewTypeLabel('');
    setNewTypeDescription('');
    setNewTypeIcon('UserCheck');
    setTypeManagerFeedback(null);
    setShowTypeManagerModal(true);
  };

  const handleSaveCustomTypes = async (typesToSave: ProfessionalTypeOption[]) => {
    setDynamicTypes(typesToSave);
    await saveProfessionalTypesList(typesToSave);
    notifySync('professionals_types');
    setTypeManagerFeedback({ type: 'success', message: 'تم حفظ وتحديث المسميات بنجاح!' });
    setTimeout(() => {
      setTypeManagerFeedback(null);
    }, 3000);
  };

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

  const handleUpdateTypeInList = (id: string, updates: Partial<ProfessionalTypeOption>) => {
    const updated = editingTypesList.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setEditingTypesList(updated);
  };

  const handleDeleteType = async (id: string) => {
    if (editingTypesList.length <= 1) {
      alert('يجب أن يتبقى تصنيف واحد على الأقل.');
      return;
    }
    const updated = editingTypesList.filter((t) => t.id !== id);
    setEditingTypesList(updated);
    await handleSaveCustomTypes(updated);
  };

  const handleResetToDefaultTypes = async () => {
    if (window.confirm('هل أنت متأكد من استعادة المسميات والتصنيفات الافتراضية؟')) {
      const def = [...DEFAULT_PROFESSIONAL_TYPES];
      setEditingTypesList(def);
      await handleSaveCustomTypes(def);
    }
  };

  // Professional Services Management Handlers
  const handleOpenServicesManager = () => {
    setEditingServicesList([...dynamicServices]);
    setNewServiceName('');
    setEditingServiceIdx(null);
    setEditingServiceValue('');
    setServicesManagerFeedback(null);
    setShowServicesManagerModal(true);
  };

  const handleSaveCustomServices = async (servicesToSave: string[]) => {
    const cleaned = servicesToSave.map((s) => s.trim()).filter(Boolean);
    setDynamicServices(cleaned);
    await saveProfessionalServicesList(cleaned);
    notifySync('professionals_services');
    setServicesManagerFeedback({ type: 'success', message: 'تم حفظ وتحديث قائمة الخدمات بنجاح!' });
    setTimeout(() => {
      setServicesManagerFeedback(null);
    }, 3000);
  };

  const handleAddNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newServiceName.trim();
    if (!trimmed) return;
    if (editingServicesList.includes(trimmed)) {
      setServicesManagerFeedback({ type: 'error', message: 'هذه الخدمة موجودة بالفعل في القائمة.' });
      return;
    }
    const updated = [...editingServicesList, trimmed];
    setEditingServicesList(updated);
    setNewServiceName('');
    await handleSaveCustomServices(updated);
  };

  const handleStartEditService = (idx: number, currentVal: string) => {
    setEditingServiceIdx(idx);
    setEditingServiceValue(currentVal);
  };

  const handleSaveEditService = async (idx: number) => {
    const trimmed = editingServiceValue.trim();
    if (!trimmed) return;
    const updated = [...editingServicesList];
    updated[idx] = trimmed;
    setEditingServicesList(updated);
    setEditingServiceIdx(null);
    setEditingServiceValue('');
    await handleSaveCustomServices(updated);
  };

  const handleDeleteService = async (idx: number) => {
    if (editingServicesList.length <= 1) {
      alert('يجب أن تتبقى خدمة واحدة على الأقل في القائمة.');
      return;
    }
    const targetName = editingServicesList[idx];
    if (!window.confirm(`هل أنت متأكد من حذف خدمة «${targetName}» نهائياً؟`)) return;
    const updated = editingServicesList.filter((_, i) => i !== idx);
    setEditingServicesList(updated);
    if (editingServiceIdx === idx) {
      setEditingServiceIdx(null);
      setEditingServiceValue('');
    }
    await handleSaveCustomServices(updated);
  };

  const handleMoveService = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editingServicesList.length) return;
    const updated = [...editingServicesList];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setEditingServicesList(updated);
    await handleSaveCustomServices(updated);
  };

  const handleResetServicesToDefault = async () => {
    if (!window.confirm('هل تريد استعادة قائمة الخدمات الافتراضية للنظام؟')) return;
    const updated = [...PROFESSIONAL_SERVICES_LIST];
    setEditingServicesList(updated);
    setEditingServiceIdx(null);
    setEditingServiceValue('');
    await handleSaveCustomServices(updated);
  };

  // Filtered & Sorted List (Pending items sorted first)
  const filteredList = items.filter((item) => {
    if (statusFilter !== 'all' && (item.status || 'approved') !== statusFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (govFilter !== 'all' && item.governorate !== govFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.phone?.includes(q) ||
        item.licenseNumber?.toLowerCase().includes(q) ||
        item.services?.some((s) => s.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    const aPending = a.status === 'pending' ? 1 : 0;
    const bPending = b.status === 'pending' ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const pendingCount = items.filter((p) => p.status === 'pending').length;

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormType('accountant');
    setFormName('');
    setFormTitle('');
    setFormGovernorate(PALESTINIAN_GOVERNORATES[1]);
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
    setFormStatus('approved');
    setFormIsVerified(true);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ProfessionalProfile) => {
    setEditingId(item.id);
    setFormType(item.type);
    setFormName(item.name);
    setFormTitle(item.title || '');
    setFormGovernorate(item.governorate || PALESTINIAN_GOVERNORATES[1]);
    setFormCity(item.city || '');
    setFormAddress(item.address || '');
    setFormPhone(item.phone || '');
    setFormSecondaryPhone(item.secondaryPhone || '');
    setFormWhatsapp(item.whatsapp || item.phone || '');
    setFormEmail(item.email || '');
    setFormWebsite(item.website || '');
    setFormBio(item.bio || '');
    setFormLicenseNumber(item.licenseNumber || '');
    setFormServices(item.services || []);
    setFormLogoUrl(item.logoUrl || '');
    setFormStatus(item.status || 'approved');
    setFormIsVerified(item.isVerified ?? true);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const compressed = await compressImageClientSide(file, 400, 400);
      setFormLogoUrl(compressed);
    } catch (err) {
      console.error('Logo compression error:', err);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setActionError('الاسم مطلوب');
      return;
    }
    if (!formPhone.trim()) {
      setActionError('رقم الهاتف مطلوب');
      return;
    }

    setIsSaving(true);
    setActionError(null);

    const payload: Partial<ProfessionalProfile> = {
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
      status: formStatus,
      isVerified: formIsVerified,
    };

    try {
      const url = editingId ? `/api/admin/professionals/${editingId}` : '/api/admin/professionals';
      const method = editingId ? 'PUT' : 'POST';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        const savedItem = resData.professional || { ...payload, id: editingId || 'prof-' + Date.now() };
        setItems((prev) => {
          const exists = prev.some((p) => p.id === savedItem.id);
          const next = exists ? prev.map((p) => (p.id === savedItem.id ? savedItem : p)) : [savedItem, ...prev];
          try { localStorage.setItem('sanad_cached_professionals', JSON.stringify(next)); } catch {}
          return next;
        });
        setActionSuccess(editingId ? 'تم تحديث بيانات المهني بنجاح' : 'تمت إضافة ونشر المهني بنجاح');
        setIsModalOpen(false);
        setIsSaving(false);
        setStatusFilter('all');
        setTypeFilter('all');
        setGovFilter('all');
        setSearchQuery('');
        import('../../utils/sync').then(({ notifySync }) => notifySync('professionals')).catch(() => {});
        onRefresh();
        setTimeout(() => setActionSuccess(null), 3500);
        return;
      } else {
        const data = await res.json().catch(() => ({}));
        // Direct Firestore fallback if server returns non-200
        const { directSaveProfessionalToFirestore } = await import('../../services/clientFirestore');
        const profId = editingId || 'prof-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const savedItem = {
          ...payload,
          id: profId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        } as ProfessionalProfile;
        const saved = await directSaveProfessionalToFirestore(savedItem);
        if (saved) {
          setItems((prev) => {
            const exists = prev.some((p) => p.id === savedItem.id);
            const next = exists ? prev.map((p) => (p.id === savedItem.id ? savedItem : p)) : [savedItem, ...prev];
            try { localStorage.setItem('sanad_cached_professionals', JSON.stringify(next)); } catch {}
            return next;
          });
          setActionSuccess(editingId ? 'تم تحديث بيانات المهني بنجاح' : 'تمت إضافة ونشر المهني بنجاح');
          setIsModalOpen(false);
          setIsSaving(false);
          setStatusFilter('all');
          setTypeFilter('all');
          setGovFilter('all');
          setSearchQuery('');
          import('../../utils/sync').then(({ notifySync }) => notifySync('professionals')).catch(() => {});
          onRefresh();
          setTimeout(() => setActionSuccess(null), 3500);
          return;
        } else {
          setActionError(data.error || 'حدث خطأ أثناء الحفظ.');
        }
      }
    } catch (err: any) {
      console.warn('Server save failed, using direct Firestore fallback:', err);
      try {
        const { directSaveProfessionalToFirestore } = await import('../../services/clientFirestore');
        const profId = editingId || 'prof-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const savedItem = {
          ...payload,
          id: profId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        } as ProfessionalProfile;
        await directSaveProfessionalToFirestore(savedItem);
        setItems((prev) => {
          const exists = prev.some((p) => p.id === savedItem.id);
          const next = exists ? prev.map((p) => (p.id === savedItem.id ? savedItem : p)) : [savedItem, ...prev];
          try { localStorage.setItem('sanad_cached_professionals', JSON.stringify(next)); } catch {}
          return next;
        });
        setActionSuccess(editingId ? 'تم تحديث بيانات المهني بنجاح' : 'تمت إضافة ونشر المهني بنجاح');
        setIsModalOpen(false);
        setIsSaving(false);
        setStatusFilter('all');
        setTypeFilter('all');
        setGovFilter('all');
        setSearchQuery('');
        import('../../utils/sync').then(({ notifySync }) => notifySync('professionals')).catch(() => {});
        onRefresh();
        setTimeout(() => setActionSuccess(null), 3500);
        return;
      } catch (fErr) {
        setActionError('تعذر الاتصال بالخادم. يرجى إعادة المحاولة.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Approve Status
  const handleQuickApprove = async (id: string) => {
    const current = items.find((p) => p.id === id);
    const updated = current ? { ...current, status: 'approved' as const, rejectionReason: undefined, updatedAt: new Date().toISOString() } : null;

    if (updated) {
      setItems((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        try { localStorage.setItem('sanad_cached_professionals', JSON.stringify(next)); } catch {}
        return next;
      });
    }

    try {
      await fetch(`/api/admin/professionals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
    } catch {}

    try {
      const { directSaveProfessionalToFirestore } = await import('../../services/clientFirestore');
      if (updated) await directSaveProfessionalToFirestore(updated);
    } catch {}

    setActionSuccess('تمت الموافقة واعتماد الظهور في الدليل بنجاح');
    import('../../utils/sync').then(({ notifySync }) => notifySync('professionals')).catch(() => {});
    await onRefresh();
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Quick Reject Status
  const handleQuickReject = async (id: string) => {
    const current = items.find((p) => p.id === id);
    const updated = current ? { ...current, status: 'rejected' as const, updatedAt: new Date().toISOString() } : null;

    if (updated) {
      setItems((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        try { localStorage.setItem('sanad_cached_professionals', JSON.stringify(next)); } catch {}
        return next;
      });
    }

    try {
      await fetch(`/api/admin/professionals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
    } catch {}

    try {
      const { directSaveProfessionalToFirestore } = await import('../../services/clientFirestore');
      if (updated) await directSaveProfessionalToFirestore(updated);
    } catch {}

    setActionSuccess('تم رفض / تعليق الطلب');
    import('../../utils/sync').then(({ notifySync }) => notifySync('professionals')).catch(() => {});
    await onRefresh();
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Delete
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف «${name}» نهائياً من الدليل؟`)) return;

    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try { localStorage.setItem('sanad_cached_professionals', JSON.stringify(next)); } catch {}
      return next;
    });

    try {
      await fetch(`/api/admin/professionals/${id}`, {
        method: 'DELETE',
      });
    } catch {}

    try {
      const { directDeleteProfessionalFromFirestore } = await import('../../services/clientFirestore');
      await directDeleteProfessionalFromFirestore(id);
    } catch {}

    setActionSuccess(`تم حذف «${name}» بنجاح`);
    import('../../utils/sync').then(({ notifySync }) => notifySync('professionals')).catch(() => {});
    await onRefresh();
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const pendingItems = items.filter((p) => p.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Tab Header & Action Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                    <span>تعديل عنوان ووصف الدليل المهني بحرية بالقلم:</span>
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
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-5 h-5" />
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
                    <div>
                      {/* Prominent floating pen indicator directly above the text */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditTitleDraft(headerTitle);
                            setEditSubtitleDraft(headerSubtitle);
                            setEditingTarget('all');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold shadow-xs border border-emerald-500/80 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-in fade-in"
                          title="قلم التعديل المباشر فوق النص: انقر لتعديل هذا الكلام بحرية ✍️"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
                          <span>قلم تعديل: {headerTitle} ✍️</span>
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

                      {pendingCount > 0 && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                          {pendingCount} بانتظار الموافقة
                        </span>
                      )}

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
                        className="text-xs text-slate-500 mt-0.5 cursor-pointer hover:text-slate-900 hover:bg-emerald-50/60 rounded-xl p-1.5 transition-all border border-dashed border-transparent hover:border-emerald-300 inline-flex items-center gap-2 flex-wrap"
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
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenTypeManager}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>تخصيص وإدارة المسميات</span>
          </button>
          <button
            type="button"
            onClick={handleOpenServicesManager}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>تخصيص وإدارة الخدمات</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة محاسب / مدقق / مكتب جديد</span>
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Pending Applications Alert & Quick Review Section */}
      {pendingItems.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 via-amber-50/70 to-orange-50/40 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                {pendingItems.length}
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                  <span>طلبات جديدة بانتظار المراجعة والاعتماد</span>
                  <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    جديد
                  </span>
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  تم تقديم هذه الطلبات للانضمام للدليل المهني. يمكنك مراجعتها واعتماد نشرها فوراً لتظهر لجميع الزوار.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('pending')}
              className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              عرض في الجدول أدناه
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 border border-amber-200/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.logoUrl ? (
                      <img src={item.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                        {item.type === 'firm' ? <Building2 className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 text-sm truncate">{item.name}</div>
                      <div className="text-xs text-slate-600 truncate">{item.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          item.type === 'firm'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.type === 'auditor'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}>
                          {item.type === 'firm' ? 'مكتب / شركة' : item.type === 'auditor' ? 'مدقق قانوني' : 'محاسب'}
                        </span>
                        <span className="text-[11px] text-slate-600 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{item.governorate} {item.city ? `(${item.city})` : ''}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">الهاتف:</span>
                    <span className="font-mono font-bold text-slate-800">{item.phone}</span>
                  </div>
                  {item.licenseNumber && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">رقم الترخيص:</span>
                      <span className="font-mono text-slate-800">{item.licenseNumber}</span>
                    </div>
                  )}
                  {item.email && (
                    <div className="col-span-2 truncate">
                      <span className="text-slate-400 block text-[10px]">البريد:</span>
                      <span className="text-slate-700">{item.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleQuickApprove(item.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>موافقة واعتماد النشر</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="تعديل التفاصيل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => handleQuickReject(item.id)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="رفض الطلب"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، المدينة، الهاتف..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            >
              <option value="all">كافة الحالات</option>
              <option value="pending">⏳ قيد المراجعة والاعتماد ({pendingCount})</option>
              <option value="approved">✅ معتمد للظهور</option>
              <option value="rejected">❌ مرفوض / معلق</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            >
              <option value="all">كافة التصنيفات والمسميات</option>
              {dynamicTypes.filter((t) => t.isActive !== false).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Governorate Filter */}
          <div>
            <select
              value={govFilter}
              onChange={(e) => setGovFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
            >
              <option value="all">كافة المحافظات</option>
              {PALESTINIAN_GOVERNORATES.map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table / List View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3.5">الاسم / المنشأة</th>
                  <th className="px-4 py-3.5">التصنيف</th>
                  <th className="px-4 py-3.5">المحافظة / المدينة</th>
                  <th className="px-4 py-3.5">الهاتف والتواصل</th>
                  <th className="px-4 py-3.5">الحالة والاعتماد</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonProfessionalRow key={idx} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لا توجد سجلات تطابق الفلاتر المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3.5">الاسم / المنشأة</th>
                  <th className="px-4 py-3.5">التصنيف</th>
                  <th className="px-4 py-3.5">المحافظة / المدينة</th>
                  <th className="px-4 py-3.5">الهاتف والتواصل</th>
                  <th className="px-4 py-3.5">الحالة والاعتماد</th>
                  <th className="px-4 py-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.slice(0, visibleCount).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {item.logoUrl ? (
                          <img
                            src={item.logoUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                            {item.type === 'firm' ? <Building2 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.isVerified && (
                              <span title="موثق">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{item.title}</div>
                          {item.licenseNumber && (
                            <span className="text-[10px] font-mono text-slate-400">ترخيص: {item.licenseNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border bg-emerald-50 text-emerald-900 border-emerald-200">
                        {dynamicTypes.find((t) => t.id === item.type)?.label || (item.type === 'firm' ? 'مكتب / شركة' : item.type === 'auditor' ? 'مدقق قانوني' : 'محاسب قانوني')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{item.governorate}</div>
                      <div className="text-[11px] text-slate-500">{item.city || item.address}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-800 font-bold">{item.phone}</div>
                      {item.whatsapp && (
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>واتساب: {item.whatsapp}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      {item.status === 'pending' ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>قيد المراجعة</span>
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="bg-red-50 text-red-800 border border-red-300 px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>مرفوض / معلق</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>معتمد للظهور</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleQuickApprove(item.id)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                            title="موافقة واعتماد النشر في الدليل"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>موافقة</span>
                          </button>
                        )}
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleQuickReject(item.id)}
                            className="px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-colors"
                            title="رفض الطلب"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Lazy Load More Bar */}
            {visibleCount < filteredList.length && (
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500 font-medium order-2 sm:order-1">
                  معروض <strong className="text-slate-900">{Math.min(visibleCount, filteredList.length)}</strong> من إجمالي{' '}
                  <strong className="text-slate-900">{filteredList.length}</strong> سجل
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredList.length))}
                  className="order-1 sm:order-2 px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>تحميل وعرض المزيد (+{Math.min(PAGE_SIZE, filteredList.length - visibleCount)})</span>
                  <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0c1c14] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-black text-base text-white">
                {editingId ? 'تعديل بيانات المهني / المكتب' : 'إضافة محاسب / مدقق / مكتب جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Type Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    التصنيف المهني <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenTypeManager}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-emerald-700" />
                    <span>تعديل المسميات</span>
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
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="mx-auto mb-1 text-emerald-700 flex justify-center">
                          {renderTypeIcon(typeOpt.icon, 'w-4 h-4')}
                        </div>
                        <span className="block truncate">{typeOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Verification */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    حالة النشر والاعتماد
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="approved">✅ معتمد للظهور مباشرة في الدليل</option>
                    <option value="pending">⏳ قيد المراجعة</option>
                    <option value="rejected">❌ مرفوض / معلق</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="formIsVerified"
                    checked={formIsVerified}
                    onChange={(e) => setFormIsVerified(e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded border-slate-300 focus:ring-emerald-700"
                  />
                  <label htmlFor="formIsVerified" className="text-xs font-bold text-slate-800 cursor-pointer">
                    تمييز كـ مهني معتمد وموثق رسمياً
                  </label>
                </div>
              </div>

              {/* Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    الاسم الكامل / اسم المكتب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    المسمى المهني
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مدقق حسابات قانوني / محاسب قانوني..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formGovernorate}
                    onChange={(e) => setFormGovernorate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
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
                    المدينة
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Phones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    الهاتف الأساسي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    الواتساب
                  </label>
                  <input
                    type="tel"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    الموقع أو صفحة التواصل
                  </label>
                  <input
                    type="url"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>
              </div>

              {/* Logo / Photo */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رابط الشعار أو رفعه من الجهاز
                </label>
                <div className="flex items-center gap-3">
                  {formLogoUrl && (
                    <img
                      src={formLogoUrl}
                      alt="Logo"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                    />
                  )}
                  <input
                    type="text"
                    value={formLogoUrl}
                    onChange={(e) => setFormLogoUrl(e.target.value)}
                    placeholder="https://... أو ارفع صورة"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <span>رفع صورة</span>
                  </label>
                </div>
              </div>

              {/* Services Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    الخدمات المقدمة:
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenServicesManager}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3 text-emerald-700" />
                    <span>تعديل وإدارة الخدمات</span>
                  </button>
                </div>
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
                  نبذة تعريفية
                </label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none"
                />
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingId ? 'حفظ التعديلات' : 'إضافة ونشر'}</span>
                </button>
              </div>
            </form>
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
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">تخصيص وإدارة مسميات وتصنيفات الدليل المهني</h3>
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
                    <Trash2 className="w-3 h-3" />
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

      {/* Dynamic Services Manager Modal (إدارة وتخصيص قائمة الخدمات المقدمة) */}
      {showServicesManagerModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#12281e] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">إدارة وتخصيص قائمة الخدمات المقدمة</h3>
                  <p className="text-[11px] text-emerald-300">
                    يمكنك إضافة خدمات جديدة، تعديل مسميات الخدمات الحالية، إعادة ترتيبها، أو حذفها
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowServicesManagerModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {servicesManagerFeedback && (
                <div
                  className={`p-3 border rounded-xl text-xs font-bold flex items-center gap-2 ${
                    servicesManagerFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {servicesManagerFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{servicesManagerFeedback.message}</span>
                </div>
              )}

              {/* Add New Service Form */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>إضافة خدمة جديدة إلى القائمة</span>
                </h4>
                <form onSubmit={handleAddNewService} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="مثال: استشارات ضريبة القيمة المضافة / تسويات بنكية..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                  <button
                    type="submit"
                    disabled={!newServiceName.trim()}
                    className="px-4 py-2 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>إضافة الخدمة</span>
                  </button>
                </form>
              </div>

              {/* Current Services List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    الخدمات المسجلة حالياً ({editingServicesList.length}):
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetServicesToDefault}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                    title="إعادة التعيين للخدمات الافتراضية"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة الافتراضية</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {editingServicesList.map((serviceName, idx) => {
                    const isEditing = editingServiceIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs flex items-center justify-between gap-2 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingServiceValue}
                              onChange={(e) => setEditingServiceValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditService(idx);
                                } else if (e.key === 'Escape') {
                                  setEditingServiceIdx(null);
                                  setEditingServiceValue('');
                                }
                              }}
                              autoFocus
                              className="flex-1 px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-emerald-600 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditService(idx)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                              title="حفظ التعديل"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingServiceIdx(null);
                                setEditingServiceValue('');
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="إلغاء"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {serviceName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveService(idx, 'up')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                title="تحريك لأعلى"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={idx === editingServicesList.length - 1}
                                onClick={() => handleMoveService(idx, 'down')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                title="تحريك لأسفل"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Name */}
                              <button
                                type="button"
                                onClick={() => handleStartEditService(idx, serviceName)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="تعديل مسمى الخدمة"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteService(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="حذف هذه الخدمة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                يتم تطبيق التعديلات ومزامنتها على فلاتر البحث ونماذج التسجيل فوراً
              </span>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveCustomServices(editingServicesList);
                  setShowServicesManagerModal(false);
                }}
                className="px-5 py-2.5 bg-[#12281e] hover:bg-[#1a382b] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>حفظ وإغلاق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professionals Header Customization Modal */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base">تعديل نصوص واجهة الدليل المهني</h3>
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
                  placeholder="مثال: إدارة الدليل المهني (المحاسبين والمدققين والمكاتب)"
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
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-slate-900 text-sm">{editTitleDraft || 'العنوان الرئيسي'}</span>
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
