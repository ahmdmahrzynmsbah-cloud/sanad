import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Save,
  X,
  Search,
  Filter,
  ShieldCheck,
  Scale,
  RefreshCw,
  Database,
  FileText,
  Phone,
  Zap,
  Loader2,
  Check,
  UploadCloud,
  FileUp,
  FileType,
  Settings,
  Tag,
  FolderPlus,
  AlertTriangle,
  Sparkles,
  Calendar,
  Crown,
  Snowflake,
  ShieldBan,
  Lock,
  Landmark,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Globe,
  Shield,
  Target,
  Link2,
  PhoneCall,
  Handshake
} from 'lucide-react';
import { User, Law, LawCategory, LegalCategory, SystemBranding, PlatformAboutData, ContactInfo } from '../types';
import { extractTextFromPDF, formatBytes, PDFProgress } from '../utils/pdfParser';
import { SupervisorsAdminTab } from './admin/SupervisorsAdminTab';
import { RelatedSitesAdminTab } from './admin/RelatedSitesAdminTab';
import { PartnersAdminTab } from './admin/PartnersAdminTab';
import { AboutPlatformAdminTab } from './admin/AboutPlatformAdminTab';
import { ContactAdminTab } from './admin/ContactAdminTab';
import { UserDetailsModal } from './admin/UserDetailsModal';
import { useSync } from '../utils/sync';

export interface QueuedLawItem {
  id: string;
  file: File;
  fileName: string;
  fileSizeFormatted: string;
  pageCount: number;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  progressPercent: number;
  statusText?: string;
  error?: string;
  title: string;
  category: string;
  content: string;
  summary?: string;
  isExpanded?: boolean;
}

interface AdminPortalProps {
  onLawsUpdated?: () => void;
  onBrandingUpdated?: (branding: SystemBranding) => void;
  onAboutUpdated?: (about: PlatformAboutData) => void;
  onContactUpdated?: (contact: ContactInfo) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLawsUpdated, onBrandingUpdated, onAboutUpdated, onContactUpdated }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'laws' | 'supervisors' | 'related-sites' | 'partners' | 'about' | 'contact' | 'settings'>('requests');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilter, setUsersFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'frozen'>('pending');
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Trial & Subscription Settings & State
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(7);
  const [editingTrialDays, setEditingTrialDays] = useState<number>(7);
  const [savingTrialSettings, setSavingTrialSettings] = useState(false);
  const [trialSettingsFeedback, setTrialSettingsFeedback] = useState<string | null>(null);

  // Custom User Trial Modal
  const [trialModalUser, setTrialModalUser] = useState<User | null>(null);
  const [extendDaysInput, setExtendDaysInput] = useState<number>(7);
  const [updatingUserTrial, setUpdatingUserTrial] = useState(false);

  // User Details Eye Modal
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);

  // Synchronize selectedUserDetails if users list changes
  useEffect(() => {
    if (selectedUserDetails) {
      const fresh = users.find((u) => u.id === selectedUserDetails.id);
      if (fresh) {
        setSelectedUserDetails(fresh);
      }
    }
  }, [users]);

  // Auto Approval State
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(true);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

  // System Branding & Settings state
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [systemNameInput, setSystemNameInput] = useState('مساعد الجمارك والضرائب');
  const [systemBadgeInput, setSystemBadgeInput] = useState('فلسطين');
  const [systemSubtitleInput, setSystemSubtitleInput] = useState(
    'دولة فلسطين • وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل'
  );
  const [logoTypeInput, setLogoTypeInput] = useState<'preset' | 'url' | 'upload'>('preset');
  const [logoPresetInput, setLogoPresetInput] = useState<string>('scale');
  const [logoUrlInput, setLogoUrlInput] = useState<string>('');
  const [logoAccentColorInput, setLogoAccentColorInput] = useState<string>('#d4af37');
  const [uploadedLogoPreview, setUploadedLogoPreview] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingFeedback, setBrandingFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resettingBranding, setResettingBranding] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Founder Info & Site Overview state
  const [founderNameInput, setFounderNameInput] = useState('أ. صلاح الدين عابد');
  const [founderTitleInput, setFounderTitleInput] = useState(
    'مؤسس المنظومة • خبير استشاري في التشريعات الجمركية والضريبية الفلسطينية'
  );
  const [founderBioInput, setFounderBioInput] = useState(
    'مستشار وخبير قانوني متخصص في السياسات المالية، القوانين الجمركية، وضريبة الدخل والمكوس في فلسطين. عمل على جمع وأرشفة وتيسير التشريعات والقرارات بقانون الصادرة رسمياً لتكون مرجعاً ذكياً رقمياً يخدم المواطنين والتجار والمحاسبين ورجال الأعمال.'
  );
  const [founderPhotoUrlInput, setFounderPhotoUrlInput] = useState(
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
  );
  const [founderPhotoSource, setFounderPhotoSource] = useState<'upload' | 'url'>('url');
  const [isDraggingFounderPhoto, setIsDraggingFounderPhoto] = useState(false);
  const founderPhotoFileInputRef = useRef<HTMLInputElement>(null);
  const [founderQuoteInput, setFounderQuoteInput] = useState(
    '«سعينا لبناء هذا النظام ليكون دليلاً قانونياً ذكياً موثوقاً لكل مواطن وتاجر، يربط التقنية الحديثة بنصوص التشريعات الفلسطينية بدقة ونزاهة تامة.»'
  );
  const [siteOverviewInput, setSiteOverviewInput] = useState(
    'المنظومة الرقمية الفلسطينية المتكاملة للاستعلام والاستشارات في القوانين الجمركية، ضريبة الدخل، ضريبة القيمة المضافة، والمكوس. توفر المنظومة محرك ذكاء اصطناعي مدعوماً بنصوص القوانين والقرارات بقانون المعتمدة رسمياً في دولة فلسطين للإجابة الفورية، واستخراج النصوص الأصلية مع أرقام المواد، واحتساب الرسوم والضرائب بالشيكل بدقة متناهية.'
  );

  // Laws state
  const [laws, setLaws] = useState<Law[]>([]);
  const [lawsLoading, setLawsLoading] = useState(false);
  const [lawSearch, setLawSearch] = useState('');
  const [lawCategoryFilter, setLawCategoryFilter] = useState<string>('الكل');
  const [expandedLawIds, setExpandedLawIds] = useState<Record<string, boolean>>({});
  const [viewingLawModal, setViewingLawModal] = useState<Law | null>(null);
  const [copiedLawId, setCopiedLawId] = useState<string | null>(null);

  const toggleLawContent = (lawId: string) => {
    setExpandedLawIds((prev) => ({
      ...prev,
      [lawId]: !prev[lawId],
    }));
  };

  // Dynamic Legal Categories state
  const [categories, setCategories] = useState<LegalCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [categoryModalSuccess, setCategoryModalSuccess] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<LegalCategory | null>(null);

  // New Law Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('جمارك');
  const [newContent, setNewContent] = useState('');
  const [submittingLaw, setSubmittingLaw] = useState(false);
  const [lawFormError, setLawFormError] = useState<string | null>(null);
  const [lawFormSuccess, setLawFormSuccess] = useState<string | null>(null);

  // PDF Upload & Batch Extraction state
  const [inputMode, setInputMode] = useState<'pdf' | 'manual'>('pdf');
  const [queuedLaws, setQueuedLaws] = useState<QueuedLawItem[]>([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);
  const [batchErrorMessage, setBatchErrorMessage] = useState<string | null>(null);
  const [batchGlobalCategory, setBatchGlobalCategory] = useState<string>('جمارك');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingQueue = useRef(false);

  // Edit Law state
  const [editingLaw, setEditingLaw] = useState<Law | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string>('جمارك');
  const [editContent, setEditContent] = useState('');
  const [updatingLaw, setUpdatingLaw] = useState(false);

  // Law Deletion Modal state (prevents iframe window.confirm blocking)
  const [lawToDelete, setLawToDelete] = useState<Law | null>(null);
  const [deletingLawId, setDeletingLawId] = useState<string | null>(null);
  const [deleteLawError, setDeleteLawError] = useState<string | null>(null);
  const [lawListFeedback, setLawListFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cloud Database Status
  const [systemStatus, setSystemStatus] = useState<{
    status: string;
    database: string;
    provider: string;
    projectId: string;
    databaseId: string;
    usersCount: number;
    lawsCount: number;
    categoriesCount?: number;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSystemStatus = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/system/status');
      const data = await res.json();
      setSystemStatus(data);
    } catch (err) {
      console.warn('Failed to fetch system status:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.warn('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Laws
  const fetchLaws = async () => {
    setLawsLoading(true);
    try {
      const res = await fetch('/api/laws');
      const data = await res.json();
      if (res.ok && data.laws) {
        setLaws(data.laws);
        if (onLawsUpdated) onLawsUpdated();
      }
    } catch (err) {
      console.warn('Failed to fetch laws:', err);
    } finally {
      setLawsLoading(false);
    }
  };

  // Fetch Dynamic Legal Categories
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
        // Ensure newCategory has a valid default if currently empty or not in list
        if (data.categories.length > 0) {
          setNewCategory((prev) => {
            const exists = data.categories.some((c: LegalCategory) => c.name === prev);
            return exists ? prev : data.categories[0].name;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch Settings (Auto-approval & Trial duration & Branding)
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) {
        if (typeof data.autoApprove === 'boolean') {
          setAutoApproveEnabled(data.autoApprove);
        }
        if (typeof data.defaultTrialDays === 'number') {
          setDefaultTrialDays(data.defaultTrialDays);
          setEditingTrialDays(data.defaultTrialDays);
        }
        if (data.branding) {
          applyBrandingState(data.branding);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch settings:', err);
    }
  };

  const fetchBranding = async () => {
    try {
      setBrandingLoading(true);
      const res = await fetch('/api/system/branding');
      if (res.ok) {
        const data = await res.json();
        applyBrandingState(data);
      }
    } catch (err) {
      console.warn('Failed to fetch branding:', err);
    } finally {
      setBrandingLoading(false);
    }
  };

  const applyBrandingState = (b: SystemBranding) => {
    if (!b) return;
    setSystemNameInput(b.systemName || 'مساعد الجمارك والضرائب');
    setSystemBadgeInput(b.systemBadge ?? 'فلسطين');
    setSystemSubtitleInput(
      b.systemSubtitle ?? 'دولة فلسطين • وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل'
    );
    setLogoTypeInput(b.logoType || 'preset');
    setLogoPresetInput(b.logoPreset || 'scale');
    setLogoUrlInput(b.logoUrl || '');
    setLogoAccentColorInput(b.logoAccentColor || '#d4af37');
    if ((b.logoType === 'upload' || b.logoType === 'url') && b.logoUrl) {
      setUploadedLogoPreview(b.logoUrl);
    }
    if (b.founderName || b.founder?.name) setFounderNameInput(b.founderName || b.founder?.name || '');
    if (b.founderTitle || b.founder?.title) setFounderTitleInput(b.founderTitle || b.founder?.title || '');
    if (b.founderBio || b.founder?.bio) setFounderBioInput(b.founderBio || b.founder?.bio || '');
    if (b.founderPhotoUrl || b.founder?.photoUrl) {
      const pUrl = b.founderPhotoUrl || b.founder?.photoUrl || '';
      setFounderPhotoUrlInput(pUrl);
      if (pUrl.startsWith('data:')) {
        setFounderPhotoSource('upload');
      } else if (pUrl.startsWith('http')) {
        setFounderPhotoSource('url');
      }
    }
    if (b.founderQuote || b.founder?.quote) setFounderQuoteInput(b.founderQuote || b.founder?.quote || '');
    if (b.siteOverview || b.founder?.siteOverview) setSiteOverviewInput(b.siteOverview || b.founder?.siteOverview || '');
  };

  // Ultra-fast consolidated initial data load (Single round-trip)
  const loadAllAdminData = async () => {
    setUsersLoading(true);
    setLawsLoading(true);
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/admin/init');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
        if (data.laws) {
          setLaws(data.laws);
          if (onLawsUpdated) onLawsUpdated();
        }
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setNewCategory((prev) => {
              const exists = data.categories.some((c: LegalCategory) => c.name === prev);
              return exists ? prev : data.categories[0].name;
            });
          }
        }
        if (typeof data.autoApprove === 'boolean') {
          setAutoApproveEnabled(data.autoApprove);
        }
        if (typeof data.defaultTrialDays === 'number') {
          setDefaultTrialDays(data.defaultTrialDays);
          setEditingTrialDays(data.defaultTrialDays);
        }
        if (data.branding) {
          applyBrandingState(data.branding);
        }
        if (data.systemStatus) {
          setSystemStatus(data.systemStatus);
        }
      } else {
        // Fallback to parallel execution
        await Promise.all([
          fetchUsers(),
          fetchLaws(),
          fetchCategories(),
          fetchSystemStatus(),
          fetchSettings(),
          fetchBranding(),
        ]);
      }
    } catch (err) {
      console.warn('Consolidated init fallback:', err);
      await Promise.all([
        fetchUsers(),
        fetchLaws(),
        fetchCategories(),
        fetchSystemStatus(),
        fetchSettings(),
        fetchBranding(),
      ]);
    } finally {
      setUsersLoading(false);
      setLawsLoading(false);
      setCategoriesLoading(false);
    }
  };

  // Handle Logo file upload (PNG, JPG, SVG, WebP)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBrandingFeedback({
        type: 'error',
        message: 'يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP).',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setBrandingFeedback({
        type: 'error',
        message: 'حجم ملف الصورة يتجاوز 2 ميغابايت. يرجى اختيار ملف أصغر حجماً.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedLogoPreview(result);
      setLogoUrlInput(result);
      setLogoTypeInput('upload');
      setBrandingFeedback({
        type: 'success',
        message: 'تم اختيار صورة الشعار بنجاح للمعاينة. اضغط "حفظ إعدادات السيستم" لتطبيقها رسمياً.',
      });
    };
    reader.readAsDataURL(file);
  };

  // Helper for processing founder photo file upload
  const processFounderPhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setBrandingFeedback({
        type: 'error',
        message: 'يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBrandingFeedback({
        type: 'error',
        message: 'حجم ملف الصورة يتجاوز 5 ميغابايت. يرجى اختيار ملف أصغر حجماً.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFounderPhotoUrlInput(result);
      setFounderPhotoSource('upload');
      setBrandingFeedback({
        type: 'success',
        message: 'تم اختيار صورة المؤسس من الجهاز بنجاح. اضغط "حفظ إعدادات السيستم" لتطبيقها.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFounderPhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFounderPhotoFile(file);
    }
  };

  // Save branding changes to Firestore and server
  const handleSaveBranding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!systemNameInput.trim()) {
      setBrandingFeedback({
        type: 'error',
        message: 'يرجى إدخال اسم النظام.',
      });
      return;
    }

    setSavingBranding(true);
    setBrandingFeedback(null);

    const targetUrl =
      logoTypeInput === 'url'
        ? logoUrlInput.trim()
        : logoTypeInput === 'upload'
        ? uploadedLogoPreview || logoUrlInput
        : '';

    const payload = {
      systemName: systemNameInput.trim(),
      systemBadge: systemBadgeInput.trim(),
      systemSubtitle: systemSubtitleInput.trim(),
      logoType: logoTypeInput,
      logoPreset: logoPresetInput,
      logoUrl: targetUrl,
      logoAccentColor: logoAccentColorInput,
      founderName: founderNameInput.trim(),
      founderTitle: founderTitleInput.trim(),
      founderBio: founderBioInput.trim(),
      founderPhotoUrl: founderPhotoUrlInput.trim(),
      founderQuote: founderQuoteInput.trim(),
      siteOverview: siteOverviewInput.trim(),
    };

    try {
      const res = await fetch('/api/admin/settings/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBrandingFeedback({
          type: 'success',
          message: 'تم حفظ وتطبيق لوجو واسم السيستم بنجاح وحفظها سحابياً في Google Cloud Firestore.',
        });
        if (onBrandingUpdated) {
          onBrandingUpdated(data.branding);
        }
      } else {
        setBrandingFeedback({
          type: 'error',
          message: data.error || 'حدث خطأ أثناء حفظ الإعدادات.',
        });
      }
    } catch {
      setBrandingFeedback({
        type: 'error',
        message: 'تعذر الاتصال بالخادم لحفظ إعدادات السيستم.',
      });
    } finally {
      setSavingBranding(false);
    }
  };

  // Reset branding to factory defaults
  const handleResetBranding = async () => {
    setResettingBranding(true);
    setBrandingFeedback(null);
    try {
      const res = await fetch('/api/admin/settings/branding/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        applyBrandingState(data.branding);
        setBrandingFeedback({
          type: 'success',
          message: 'تمت استعادة الاسم والشعار الافتراضي للسيستم بنجاح.',
        });
        if (onBrandingUpdated) {
          onBrandingUpdated(data.branding);
        }
      } else {
        setBrandingFeedback({
          type: 'error',
          message: data.error || 'فشلت استعادة الإعدادات.',
        });
      }
    } catch {
      setBrandingFeedback({
        type: 'error',
        message: 'تعذر الاتصال بالخادم لاستعادة الإعدادات.',
      });
    } finally {
      setResettingBranding(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  useSync(['users', 'laws', 'categories', 'system_settings'], () => {
    loadAllAdminData();
  });

  // Add new dynamic category
  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setCategoryModalError('يرجى إدخال اسم التصنيف');
      return;
    }

    // Duplicate check
    const isDuplicate = categories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCategoryModalError('هذا التصنيف موجود بالفعل مسبقاً في القائمة');
      return;
    }

    setAddingCategory(true);
    setCategoryModalError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCategoryModalError(data.error || 'تعذر إضافة التصنيف');
        return;
      }
      setCategoryModalSuccess(`تمت إضافة التصنيف "${trimmed}" وحفظه في السحابة بنجاح`);
      setNewCategoryInput('');
      setNewCategory(trimmed); // Select newly added category
      await fetchCategories();
      fetchSystemStatus();
      setTimeout(() => setCategoryModalSuccess(null), 3500);
    } catch (err) {
      console.error('Error adding category:', err);
      setCategoryModalError('حدث خطأ في الاتصال بالخادم لإضافة التصنيف');
    } finally {
      setAddingCategory(false);
    }
  };

  // Delete category with confirmation
  const handleConfirmDeleteCategory = async (cat: LegalCategory) => {
    setDeletingCategoryId(cat.id);
    setCategoryModalError(null);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setCategoryModalError(data.error || 'تعذر حذف التصنيف');
        return;
      }
      setCategoryModalSuccess(`تم حذف التصنيف "${cat.name}" بنجاح من قاعدة البيانات`);
      setCategoryToDelete(null);
      await fetchCategories();
      fetchSystemStatus();

      // If form was using this category, select a remaining one
      if (newCategory === cat.name) {
        const remaining = categories.filter((c) => c.id !== cat.id);
        if (remaining.length > 0) {
          setNewCategory(remaining[0].name);
        }
      }
      setTimeout(() => setCategoryModalSuccess(null), 3500);
    } catch (err) {
      console.error('Error deleting category:', err);
      setCategoryModalError('حدث خطأ في الاتصال بالخادم أثناء حذف التصنيف');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // Toggle Auto-Approve mode
  const handleToggleAutoApprove = async () => {
    const nextVal = !autoApproveEnabled;
    setAutoApproveLoading(true);
    setAutoApproveEnabled(nextVal);
    try {
      const res = await fetch('/api/admin/settings/auto-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextVal }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(
          nextVal
            ? '⚡ تم تفعيل نظام القبول التلقائي! سيتم اعتماد وقبول أي حساب جديد فور تسجيله مباشرة.'
            : '🔒 تم إيقاف نظام القبول التلقائي. يتطلب أي حساب جديد مراجعة واعتماد المسؤول يدوياً.'
        );
        setTimeout(() => setUserActionMessage(null), 5000);
      } else {
        setAutoApproveEnabled(!nextVal);
      }
    } catch {
      setAutoApproveEnabled(!nextVal);
    } finally {
      setAutoApproveLoading(false);
    }
  };

  // Bulk Auto-Approve all currently pending requests
  const handleAutoApproveAllPending = async () => {
    if (pendingCount === 0) return;
    setBulkApproving(true);
    try {
      const res = await fetch('/api/admin/users/auto-approve-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(
          `⚡ تم قبول واعتماد جميع الطلبات المعلقة (${data.count || pendingCount}) بنجاح وتصريحهم للشات!`
        );
        if (data.users) {
          setUsers(data.users);
        } else {
          fetchUsers();
        }
        setTimeout(() => setUserActionMessage(null), 5000);
      }
    } catch (err) {
      console.error('Bulk approve failed:', err);
    } finally {
      setBulkApproving(false);
    }
  };

  // Update user status with instant optimistic feedback
  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setProcessingUserId(id);
    
    // Instant optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status, reviewedAt: new Date().toISOString() } : u))
    );

    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(
          status === 'approved'
            ? '✅ تم قبول المستخدم واعتماده بنجاح! حسابه الآن مصرّح ويمكنه الدخول للشات.'
            : '⚠️ تم رفض المستخدم ومنعه من استخدام الشات.'
        );
        if (data.users) {
          setUsers(data.users);
        } else {
          fetchUsers();
        }
        setTimeout(() => setUserActionMessage(null), 5000);
      } else {
        setUserActionMessage(`❌ حدث خطأ: ${data.error || 'تعذر تحديث الحالة'}`);
        fetchUsers();
      }
    } catch (err) {
      console.error('Status update failed:', err);
      setUserActionMessage('❌ تعذر الاتصال بالخادم، يرجى المحاولة ثانية.');
      fetchUsers();
    } finally {
      setProcessingUserId(null);
    }
  };

  // Save default trial days
  const handleSaveDefaultTrialDays = async (daysToSave?: number) => {
    const days = daysToSave !== undefined ? daysToSave : Number(editingTrialDays);
    if (isNaN(days) || days < 1) {
      setTrialSettingsFeedback('❌ يرجى إدخال عدد أيام تجريبية صالح (يوم واحد على الأقل)');
      return;
    }

    setSavingTrialSettings(true);
    setTrialSettingsFeedback(null);
    try {
      const res = await fetch('/api/admin/settings/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultTrialDays: days }),
      });
      const data = await res.json();
      if (res.ok) {
        setDefaultTrialDays(days);
        setEditingTrialDays(days);
        setTrialSettingsFeedback(`✅ تم حفظ وتطبيق مدة الفترة التجريبية الافتراضية (${days} يوم) بنجاح في قاعدة البيانات السحابية.`);
        setTimeout(() => setTrialSettingsFeedback(null), 5000);
      } else {
        setTrialSettingsFeedback(`❌ حدث خطأ: ${data.error || 'تعذر حفظ الإعدادات'}`);
      }
    } catch (err) {
      console.error('Save trial settings error:', err);
      setTrialSettingsFeedback('❌ تعذر الاتصال بالخادم لحفظ إعدادات الفترة التجريبية.');
    } finally {
      setSavingTrialSettings(false);
    }
  };

  // Toggle user subscription status
  const handleToggleSubscription = async (user: User) => {
    const newSubscriptionState = !user.isSubscribed;
    setProcessingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSubscribed: newSubscriptionState }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(
          newSubscriptionState
            ? `👑 تم تفعيل الاشتراك الدائم للمستخدم "${user.fullName || user.username}" بنجاح! حسابه نشط دائماً.`
            : `⚠️ تم إلغاء اشتراك المستخدم "${user.fullName || user.username}".`
        );
        if (data.users) {
          setUsers(data.users);
        } else {
          fetchUsers();
        }
        setTimeout(() => setUserActionMessage(null), 5000);
      } else {
        setUserActionMessage(`❌ حدث خطأ: ${data.error || 'تعذر تعديل الاشتراك'}`);
      }
    } catch (err) {
      console.error('Toggle subscription error:', err);
      setUserActionMessage('❌ تعذر الاتصال بالخادم لتحديث الاشتراك.');
    } finally {
      setProcessingUserId(null);
    }
  };

  // Extend or update user trial
  const handleExtendTrial = async (userId: string, daysToAdd: number) => {
    setUpdatingUserTrial(true);
    setProcessingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays: daysToAdd }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(`⏳ تم تمديد الفترة التجريبية للمستخدم بنجاح بمقدار (${daysToAdd} يوم)!`);
        setTrialModalUser(null);
        if (data.users) {
          setUsers(data.users);
        } else {
          fetchUsers();
        }
        setTimeout(() => setUserActionMessage(null), 5000);
      } else {
        setUserActionMessage(`❌ ${data.error || 'تعذر تمديد التجربة'}`);
      }
    } catch (err) {
      console.error('Extend trial error:', err);
      setUserActionMessage('❌ تعذر الاتصال بالخادم لتمديد الفترة التجريبية.');
    } finally {
      setUpdatingUserTrial(false);
      setProcessingUserId(null);
    }
  };

  // Toggle Freeze User
  const handleToggleFreeze = async (user: User) => {
    const isCurrentlyFrozen = user.status === 'frozen' || user.subscriptionStatus === 'frozen';
    setProcessingUserId(user.id);
    try {
      const endpoint = isCurrentlyFrozen
        ? `/api/admin/users/${user.id}/unfreeze`
        : `/api/admin/users/${user.id}/freeze`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantTrialDays: defaultTrialDays }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserActionMessage(
          isCurrentlyFrozen
            ? `🔓 تم إلغاء تجميد حساب "${user.fullName || user.username}" بنجاح ومنحه فترة تجريبية إضافية (${defaultTrialDays} يوم).`
            : `❄️ تم تجميد حساب "${user.fullName || user.username}" بنجاح ولن يتمكن من استخدام الشات لحين الاشتراك.`
        );
        if (data.users) {
          setUsers(data.users);
        } else {
          fetchUsers();
        }
        setTimeout(() => setUserActionMessage(null), 5000);
      } else {
        setUserActionMessage(`❌ ${data.error || 'تعذر تعديل حالة التجميد'}`);
      }
    } catch (err) {
      console.error('Toggle freeze error:', err);
      setUserActionMessage('❌ تعذر الاتصال بالخادم لتعديل التجميد.');
    } finally {
      setProcessingUserId(null);
    }
  };

  // Category Matcher Helper
  const matchCategory = (suggestedCat: string | undefined): string => {
    if (!suggestedCat) return 'جمارك';
    const rawCat = suggestedCat.trim();
    const exactMatch = categories.find((c) => c.name === rawCat);
    if (exactMatch) return exactMatch.name;
    const partialMatch = categories.find(
      (c) =>
        rawCat.includes(c.name) ||
        c.name.includes(rawCat) ||
        (rawCat.includes('جمرك') && c.name.includes('جمارك')) ||
        (rawCat.includes('دخل') && c.name.includes('دخل')) ||
        (rawCat.includes('مضافة') && c.name.includes('مضافة')) ||
        (rawCat.includes('مكوس') && c.name.includes('مكوس'))
    );
    if (partialMatch) return partialMatch.name;
    return categories[0]?.name || 'جمارك';
  };

  // Add multiple files to batch queue
  const addFilesToQueue = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const newItems: QueuedLawItem[] = [];
    let invalidCount = 0;

    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        invalidCount++;
        continue;
      }

      const cleanTitle = file.name
        .replace(/\.pdf$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      const isTooBig = file.size > 35 * 1024 * 1024;

      newItems.push({
        id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        fileName: file.name,
        fileSizeFormatted: formatBytes(file.size),
        pageCount: 1,
        status: isTooBig ? 'error' : 'pending',
        error: isTooBig ? 'حجم الملف يتجاوز الحد الأقصى (35 ميجابايت)' : undefined,
        progressPercent: 0,
        statusText: isTooBig ? 'حجم الملف كبير جداً' : 'في انتظار بدء الاستخراج...',
        title: cleanTitle,
        category: 'جمارك',
        content: '',
        summary: '',
        isExpanded: false,
      });
    }

    if (invalidCount > 0) {
      setBatchErrorMessage(`تم تخطي ${invalidCount} ملفات لأنها ليست بصيغة PDF صالحة.`);
    }

    if (newItems.length > 0) {
      setQueuedLaws((prev) => [...prev, ...newItems]);
      setBatchSuccessMessage(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sequential Queue Processor for Batch PDFs
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingQueue.current) return;
      const nextItem = queuedLaws.find((item) => item.status === 'pending');
      if (!nextItem) return;

      isProcessingQueue.current = true;
      const targetId = nextItem.id;

      setQueuedLaws((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                status: 'parsing',
                progressPercent: 25,
                statusText: 'جاري قراءة واستخراج النصوص والمواد القانونية...',
              }
            : item
        )
      );

      try {
        const result = await extractTextFromPDF(nextItem.file, (prog) => {
          setQueuedLaws((prev) =>
            prev.map((item) =>
              item.id === targetId
                ? { ...item, progressPercent: prog.percent, statusText: prog.statusText }
                : item
            )
          );
        });

        const detectedCategory = matchCategory(result.suggestedCategory);

        setQueuedLaws((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  status: 'ready',
                  title: result.suggestedTitle || item.title,
                  category: detectedCategory,
                  content: result.text,
                  pageCount: result.numPages || item.pageCount,
                  fileSizeFormatted: result.fileSizeFormatted || item.fileSizeFormatted,
                  summary: result.summary,
                  progressPercent: 100,
                  statusText: 'تم استخراج المواد بنجاح',
                }
              : item
          )
        );
      } catch (err: any) {
        console.error('Error processing queued PDF:', err);
        setQueuedLaws((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  status: 'error',
                  error: err?.message || 'تعذر استخراج المواد القانونية من هذا الملف',
                  progressPercent: 0,
                  statusText: 'فشل الاستخراج',
                }
              : item
          )
        );
      } finally {
        isProcessingQueue.current = false;
      }
    };

    processQueue();
  }, [queuedLaws, categories]);

  const handleUpdateQueuedTitle = (id: string, title: string) => {
    setQueuedLaws((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item))
    );
  };

  const handleUpdateQueuedCategory = (id: string, category: string) => {
    setQueuedLaws((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );
  };

  const handleApplyCategoryToAll = (targetCategory: string) => {
    setBatchGlobalCategory(targetCategory);
    setQueuedLaws((prev) =>
      prev.map((item) => ({ ...item, category: targetCategory }))
    );
  };

  const handleRemoveQueuedItem = (id: string) => {
    setQueuedLaws((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRetryQueuedItem = (id: string) => {
    setQueuedLaws((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'pending',
              error: undefined,
              progressPercent: 0,
              statusText: 'في انتظار بدء الاستخراج...',
            }
          : item
      )
    );
  };

  const handleTogglePreview = (id: string) => {
    setQueuedLaws((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const handleClearAllQueued = () => {
    setQueuedLaws([]);
    setBatchErrorMessage(null);
    setBatchSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  // Submit all ready laws to knowledge base at once
  const handleBatchSubmit = async () => {
    const readyLaws = queuedLaws.filter((l) => l.status === 'ready' && l.content.trim());
    if (readyLaws.length === 0) {
      setBatchErrorMessage('لا توجد قوانين مكتملة الاستخراج وجاهزة للإضافة.');
      return;
    }

    const missingTitle = readyLaws.some((l) => !l.title.trim());
    if (missingTitle) {
      setBatchErrorMessage('يرجى التأكد من كتابة أو مراجعة عنوان كل قانون قبل الإضافة.');
      return;
    }

    setIsSubmittingBatch(true);
    setBatchErrorMessage(null);
    setBatchSuccessMessage(null);

    try {
      // Chunk laws into safe micro-batches (2 laws per batch) to prevent Vercel 4.5MB payload & timeout limits
      const chunkSize = 2;
      let totalSaved = 0;

      for (let i = 0; i < readyLaws.length; i += chunkSize) {
        const chunk = readyLaws.slice(i, i + chunkSize);
        const chunkPayload = chunk.map((item) => ({
          title: item.title.trim(),
          category: item.category || 'جمارك',
          content: item.content.trim(),
          sourceFileName: item.fileName,
          sourceFileSize: item.fileSizeFormatted,
          pageCount: item.pageCount,
        }));

        const res = await fetch('/api/laws/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ laws: chunkPayload }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'فشل حفظ دفعة القوانين.');
        }

        totalSaved += data.laws ? data.laws.length : chunk.length;

        // Immediately remove saved items from queue so user sees real-time progress
        const chunkIds = new Set(chunk.map((item) => item.id));
        setQueuedLaws((prev) => prev.filter((l) => !chunkIds.has(l.id)));
      }

      setBatchSuccessMessage(
        `تمت بنجاح إضافة ${totalSaved} تشريعات وقوانين إلى قاعدة المعرفة وتحديث مستشار الذكاء الاصطناعي فورياً!`
      );

      // Refresh laws list
      await fetchLaws();

      setTimeout(() => {
        setBatchSuccessMessage(null);
      }, 7000);
    } catch (err: any) {
      setBatchErrorMessage(err?.message || 'تعذر حفظ دفعة القوانين. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Create Law
  const handleCreateLaw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLawFormError(null);
    setLawFormSuccess(null);

    if (!newTitle.trim() || !newContent.trim()) {
      setLawFormError('يرجى ملء عنوان القانون ونص المواد بالكامل.');
      return;
    }

    setSubmittingLaw(true);
    try {
      const res = await fetch('/api/laws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          content: newContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLawFormError(data.error || 'فشل حفظ القانون.');
        return;
      }

      setLawFormSuccess('تم حفظ القانون في قاعدة البيانات بنجاح وتحديث قاعدة معرفة البوت فورياً.');
      setNewTitle('');
      setNewContent('');
      fetchLaws();
      setTimeout(() => setLawFormSuccess(null), 4000);
    } catch (err) {
      setLawFormError('تعذر الاتصال بالخادم.');
    } finally {
      setSubmittingLaw(false);
    }
  };

  // Start Edit Law
  const handleStartEdit = (law: Law) => {
    setEditingLaw(law);
    setEditTitle(law.title);
    setEditCategory(law.category);
    setEditContent(law.content);
  };

  // Save Edited Law
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLaw) return;

    setUpdatingLaw(true);
    try {
      const res = await fetch(`/api/laws/${editingLaw.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          category: editCategory,
          content: editContent.trim(),
        }),
      });

      if (res.ok) {
        setEditingLaw(null);
        fetchLaws();
      }
    } catch (err) {
      console.error('Failed to update law:', err);
    } finally {
      setUpdatingLaw(false);
    }
  };

  // Delete Law: Open in-app confirmation modal (works flawlessly in sandboxed iframes)
  const handleOpenDeleteLawModal = (law: Law) => {
    setDeleteLawError(null);
    setLawToDelete(law);
  };

  // Confirm delete law and remove from Firestore and local cache
  const handleConfirmDeleteLaw = async (law: Law) => {
    setDeletingLawId(law.id);
    setDeleteLawError(null);

    try {
      const res = await fetch(`/api/laws/${encodeURIComponent(law.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر حذف القانون من قاعدة البيانات.');
      }

      // If currently editing this law, cancel edit
      if (editingLaw?.id === law.id) {
        setEditingLaw(null);
      }

      // Close modal
      setLawToDelete(null);

      // Refresh list & stats
      await fetchLaws();
      fetchSystemStatus();
      if (onLawsUpdated) {
        onLawsUpdated();
      }

      setLawListFeedback({
        type: 'success',
        message: `تم حذف القانون "${law.title}" بنجاح من قاعدة البيانات السحابية (Cloud Firestore).`,
      });
      setTimeout(() => setLawListFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to delete law:', err);
      setDeleteLawError(err?.message || 'حدث خطأ أثناء محاولة حذف القانون.');
    } finally {
      setDeletingLawId(null);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (usersFilter === 'all') return true;
    if (usersFilter === 'frozen') return u.status === 'frozen' || u.subscriptionStatus === 'frozen';
    return u.status === usersFilter;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const rejectedCount = users.filter((u) => u.status === 'rejected').length;
  const frozenCount = users.filter((u) => u.status === 'frozen' || u.subscriptionStatus === 'frozen').length;
  const subscribedCount = users.filter((u) => u.isSubscribed).length;

  // Category styling helper
  const getCategoryBadgeClass = (categoryName: string) => {
    switch (categoryName) {
      case 'جمارك':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'ضريبة دخل':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'ضريبة قيمة مضافة':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'أخرى':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-teal-50 text-teal-800 border-teal-200';
    }
  };

  // Filtered Laws
  const filteredLaws = laws.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(lawSearch.toLowerCase()) ||
      l.content.toLowerCase().includes(lawSearch.toLowerCase());
    const matchesCategory =
      lawCategoryFilter === 'الكل' || l.category === lawCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleAllLaws = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    if (expand) {
      filteredLaws.forEach((l) => {
        updated[l.id] = true;
      });
    }
    setExpandedLawIds(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Official Government Admin Header Banner */}
      <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0d1c15] text-white rounded-xl p-4 sm:p-6 shadow-sm border border-[#2b5942] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f5d77f] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span>لوحة تحكم المسؤول المعتمد • وزارة المالية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            نظام الإشراف المركزي وإدارة التشريعات
          </h2>
          <p className="text-xs sm:text-sm text-[#a3c9b3] mt-1 max-w-2xl">
            مراجعة واعتماد طلبات حسابات المستفيدين الجدد، وإدارة نصوص المواد والقوانين المالية والجمركية المحقونة في قاعدة معرفة البوت.
          </p>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className="bg-[#1b3d2d] border border-[#2d6148] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-center min-w-[80px] sm:min-w-[90px]">
            <span className="block text-[10px] sm:text-[11px] text-[#93dfb3]">طلبات معلقة</span>
            <span className="text-base sm:text-lg font-bold text-amber-300">{pendingCount}</span>
          </div>
          <div className="bg-[#1b3d2d] border border-[#2d6148] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-center min-w-[80px] sm:min-w-[90px]">
            <span className="block text-[10px] sm:text-[11px] text-[#93dfb3]">قوانين بالمعرفة</span>
            <span className="text-base sm:text-lg font-bold text-emerald-300">{laws.length}</span>
          </div>
          <div className="bg-[#163527] border border-[#275940] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg flex flex-col justify-center text-right">
            <span className="text-[10px] sm:text-[11px] text-[#86efac] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              قاعدة بيانات سحابية متصلة
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-white mt-0.5">
              Google Cloud Firestore
            </span>
          </div>
        </div>
      </div>

      {/* Cloud Database Integration Info Bar */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-4 text-xs flex items-center justify-between flex-wrap gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-emerald-900 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>قاعدة البيانات السحابية: Google Cloud Firestore</span>
              <span className="bg-emerald-200/80 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                نشطة وسريعة للغاية
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            fetchUsers();
            fetchLaws();
            fetchSystemStatus();
          }}
          disabled={isSyncing}
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer min-h-[36px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'جارِ التحقق...' : 'تحديث البيانات السحابية'}
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-white rounded-t-xl px-2 sm:px-4 pt-3 shadow-xs scrollbar-none touch-scroll overscroll-x-contain">
        <button
          id="admin-tab-requests"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'requests'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          طلبات المستخدمين
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold animate-pulse">
              {pendingCount} جديد
            </span>
          )}
        </button>

        <button
          id="admin-tab-laws"
          onClick={() => setActiveTab('laws')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'laws'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          قاعدة المعرفة والقوانين
          <span className="bg-[#e2e8f0] text-gray-700 text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
            {laws.length}
          </span>
        </button>

        <button
          id="admin-tab-supervisors"
          onClick={() => setActiveTab('supervisors')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'supervisors'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          هيئة المشرفين
        </button>

        <button
          id="admin-tab-related-sites"
          onClick={() => setActiveTab('related-sites')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'related-sites'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          مواقع ذات صلة
        </button>

        <button
          id="admin-tab-partners"
          onClick={() => setActiveTab('partners')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'partners'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Handshake className="w-4 h-4 text-[#d4af37]" />
          شركاؤنا
        </button>

        <button
          id="admin-tab-about"
          onClick={() => setActiveTab('about')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'about'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Target className="w-4 h-4 text-[#d4af37]" />
          عن المنصة (الرؤية والرسالة)
        </button>

        <button
          id="admin-tab-contact"
          onClick={() => setActiveTab('contact')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'contact'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <PhoneCall className="w-4 h-4 text-emerald-600" />
          بيانات التواصل (اتصل بنا)
        </button>

        <button
          id="admin-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-3.5 sm:px-5 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          إعدادات المنظومة
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: USER REQUESTS (طلبات المستخدمين) */}
      {/* ======================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Action Notification */}
          {userActionMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg text-sm flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{userActionMessage}</span>
              </div>
              <button
                onClick={() => setUserActionMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs"
              >
                إغلاق
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* AUTO-APPROVAL SYSTEM & QUICK ACTION BAR                   */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-r from-emerald-900/10 via-emerald-800/5 to-transparent p-4 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                  autoApproveEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-gray-900">نظام القبول والاعتماد التلقائي</h4>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      autoApproveEnabled
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {autoApproveEnabled ? 'مفعّل تلقائياً ✓' : 'مراجعة يدوية فقط'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 max-w-xl">
                  {autoApproveEnabled
                    ? 'يتم قبول أي حساب جديد فور تسجيله مباشرة دون انتظار، وتصريحه لاستخدام الشات فوراً مع إمكانية إلغائه بأي وقت.'
                    : 'يتطلب كل تسجيل جديد مراجعة واعتماد المسؤول يدوياً من خلال أزرار القبول والرفض.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              {/* Toggle Auto-Approve Button */}
              <button
                id="admin-toggle-auto-approve-btn"
                onClick={handleToggleAutoApprove}
                disabled={autoApproveLoading}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all shadow-xs ${
                  autoApproveEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                }`}
              >
                {autoApproveLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap
                    className={`w-3.5 h-3.5 ${
                      autoApproveEnabled ? 'text-amber-300 fill-amber-300' : 'text-gray-400'
                    }`}
                  />
                )}
                <span>
                  {autoApproveEnabled
                    ? 'القبول التلقائي: مفعّل (انقر للإيقاف)'
                    : 'القبول التلقائي: متوقف (انقر للتفعيل)'}
                </span>
              </button>

              {/* Bulk Auto-Approve All Pending Button */}
              {pendingCount > 0 && (
                <button
                  id="admin-auto-approve-all-pending"
                  onClick={handleAutoApproveAllPending}
                  disabled={bulkApproving}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-[#12281e] hover:bg-[#1a3a2d] active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                  title="اعتماد وتصريح جميع الطلبات المعلقة دفعة واحدة"
                >
                  {bulkApproving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  قبول جميع المعلقين ({pendingCount})
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* TRIAL PERIOD & SUBSCRIPTION CONFIGURATION BAR            */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-r from-amber-900/10 via-amber-800/5 to-transparent p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-gray-900">نظام الفترة التجريبية وتجميد الحسابات غير المشتركة</h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    المدة الافتراضية المحددة: {defaultTrialDays} يوم
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 max-w-2xl leading-relaxed">
                  يتم منح أي حساب جديد تلقائياً فترة تجريبية تحددها أنت بالأيام. وإذا لم يشترك المستخدم خلال هذه المدة، يتجمد حسابه تلقائياً ويُمنع من استخدام الشات لحين الاشتراك أو فك التجميد من قبلك.
                </p>
                {trialSettingsFeedback && (
                  <p className="text-xs font-bold mt-1.5 text-emerald-700">{trialSettingsFeedback}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
              <span className="text-xs font-bold text-gray-700">تعديل مدة التجربة:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[3, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setEditingTrialDays(days);
                      handleSaveDefaultTrialDays(days);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      editingTrialDays === days
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-200'
                    }`}
                  >
                    {days} أيام
                  </button>
                ))}

                <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-0.5">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={editingTrialDays}
                    onChange={(e) => setEditingTrialDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-xs text-center font-bold outline-none"
                  />
                  <span className="text-xs text-gray-500">يوم</span>
                </div>

                <button
                  onClick={() => handleSaveDefaultTrialDays()}
                  disabled={savingTrialSettings}
                  className="px-3 py-1.5 bg-[#12281e] hover:bg-[#1a3a2d] active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {savingTrialSettings ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  حفظ المدة
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Filters and Refresh */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-600">تصفية الطلبات:</span>
              <button
                id="user-filter-pending"
                onClick={() => setUsersFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  usersFilter === 'pending'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                قيد المراجعة ({pendingCount})
              </button>
              <button
                id="user-filter-approved"
                onClick={() => setUsersFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  usersFilter === 'approved'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                المقبولة ({approvedCount})
              </button>
              <button
                id="user-filter-frozen"
                onClick={() => setUsersFilter('frozen')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  usersFilter === 'frozen'
                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                المجمدة (انتهت التجربة) ({frozenCount})
              </button>
              <button
                id="user-filter-rejected"
                onClick={() => setUsersFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  usersFilter === 'rejected'
                    ? 'bg-red-100 text-red-900 border border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                المرفوضة ({rejectedCount})
              </button>
              <button
                id="user-filter-all"
                onClick={() => setUsersFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  usersFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                الكل ({users.length})
              </button>
            </div>

            <button
              onClick={fetchUsers}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              تحديث القائمة
            </button>
          </div>

          {/* User Requests Table / Cards */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-700">لا توجد طلبات في هذا القسم حالياً</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {usersFilter === 'pending'
                    ? 'تم فحص وقبول جميع طلبات المستخدمين، ولا توجد حسابات معلقة حالياً.'
                    : usersFilter === 'frozen'
                    ? 'لا توجد حسابات مجمدة حالياً، جميع الحسابات إما ضمن فترتها التجريبية أو مشتركة.'
                    : 'لا توجد سجلات تطابق الفلتر المحدد.'}
                </p>
                {usersFilter !== 'all' && users.length > 0 && (
                  <button
                    onClick={() => setUsersFilter('all')}
                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    عرض جميع الحسابات ({users.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto touch-scroll overscroll-x-contain pb-2">
                <table className="w-full text-right text-xs min-w-[680px]">
                  <thead className="bg-[#f8fafc] text-gray-600 border-b border-gray-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">مقدم الطلب / الحساب</th>
                      <th className="py-3 px-4">رقم الجوال</th>
                      <th className="py-3 px-4">تاريخ التسجيل</th>
                      <th className="py-3 px-4">حالة الحساب</th>
                      <th className="py-3 px-4">حالة الاشتراك والتجربة</th>
                      <th className="py-3 px-4 text-center">إدارة الاشتراك والإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const isProcessing = processingUserId === user.id;
                      const isUserFrozen = user.status === 'frozen' || user.subscriptionStatus === 'frozen';
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#12281e]/10 text-[#12281e] flex items-center justify-center font-bold text-xs shrink-0">
                                {(user.fullName || user.username).slice(0, 2)}
                              </div>
                              <div>
                                <div className="text-gray-900 font-bold">
                                  {user.fullName || user.username}
                                </div>
                                <div className="text-[11px] text-gray-400 font-normal font-mono">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-700">
                            {user.phone ? (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-800">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span dir="ltr">{user.phone}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">غير محدد</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-500">
                            {new Date(user.createdAt).toLocaleString('ar-EG', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            {user.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                قيد المراجعة
                              </span>
                            )}
                            {user.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                معتمد
                              </span>
                            )}
                            {user.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                <XCircle className="w-3 h-3" />
                                مرفوض
                              </span>
                            )}
                            {user.status === 'frozen' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                <Snowflake className="w-3 h-3 text-purple-600" />
                                مجمد
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {user.isSubscribed ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <Crown className="w-3 h-3 text-amber-500" />
                                  مشترك دائم ✓
                                </span>
                                {user.subscribedAt && (
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    مشترك منذ {new Date(user.subscribedAt).toLocaleDateString('ar-EG')}
                                  </div>
                                )}
                              </div>
                            ) : isUserFrozen ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                                  <Snowflake className="w-3 h-3 text-blue-600" />
                                  مجمد (انتهت التجربة)
                                </span>
                                <div className="text-[10px] text-red-600 mt-0.5 font-medium">
                                  يتطلب الاشتراك لفك التجميد
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  فترة تجريبية ({user.remainingTrialDays ?? user.trialDays ?? defaultTrialDays} يوم)
                                </span>
                                {user.trialEndsAt && (
                                  <div className="text-[10px] text-gray-500 mt-0.5">
                                    تنتهي: {new Date(user.trialEndsAt).toLocaleDateString('ar-EG')}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* View Full User Details Eye Button */}
                              <button
                                id={`admin-view-user-${user.id}`}
                                onClick={() => setSelectedUserDetails(user)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200/90 flex items-center gap-1 transition-all shadow-xs cursor-pointer hover:border-amber-300"
                                title="عرض كامل تفاصيل وبيانات المستخدم وكلمة المرور وتاريخ التسجيل"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-700" />
                                <span>عرض التفاصيل</span>
                              </button>

                              {/* If pending: Show approve/reject */}
                              {user.status === 'pending' && (
                                <>
                                  <button
                                    id={`admin-approve-user-${user.id}`}
                                    onClick={() => handleUpdateStatus(user.id, 'approved')}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                                    title="قبول الحساب"
                                  >
                                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                    قبول
                                  </button>
                                  <button
                                    id={`admin-reject-user-${user.id}`}
                                    onClick={() => handleUpdateStatus(user.id, 'rejected')}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                                    title="رفض الحساب"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    رفض
                                  </button>
                                </>
                              )}

                              {/* Toggle Subscription Button */}
                              <button
                                id={`admin-sub-toggle-${user.id}`}
                                onClick={() => handleToggleSubscription(user)}
                                disabled={isProcessing}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                                  user.isSubscribed
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                }`}
                                title={user.isSubscribed ? 'إلغاء الاشتراك الدائم' : 'تفعيل الاشتراك الدائم للمستخدم'}
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Crown className="w-3 h-3 text-amber-300" />
                                )}
                                {user.isSubscribed ? 'إلغاء الاشتراك' : 'تفعيل اشتراك'}
                              </button>

                              {/* Extend Trial Button */}
                              <button
                                id={`admin-extend-trial-${user.id}`}
                                onClick={() => {
                                  setTrialModalUser(user);
                                  setExtendDaysInput(7);
                                }}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 transition-all cursor-pointer"
                                title="تمديد أو تغيير أيام الفترة التجريبية"
                              >
                                <Calendar className="w-3 h-3 text-blue-600" />
                                تمديد التجربة
                              </button>

                              {/* Freeze / Unfreeze Toggle Button */}
                              <button
                                id={`admin-freeze-toggle-${user.id}`}
                                onClick={() => handleToggleFreeze(user)}
                                disabled={isProcessing}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  isUserFrozen
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                    : 'bg-gray-50 hover:bg-purple-50 text-purple-800 border border-purple-200'
                                }`}
                                title={isUserFrozen ? 'فك تجميد الحساب ومنحه فترة إضافية' : 'تجميد الحساب ومنعه من الشات'}
                              >
                                {isUserFrozen ? (
                                  <CheckCircle2 className="w-3 h-3 text-purple-200" />
                                ) : (
                                  <Snowflake className="w-3 h-3 text-purple-500" />
                                )}
                                {isUserFrozen ? 'فك التجميد' : 'تجميد'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LAW MANAGEMENT (إدارة القوانين) */}
      {/* ======================================================== */}
      {activeTab === 'laws' && (
        <div className="space-y-6">
          {/* Important Legal Knowledge Base Callout */}
          <div className="bg-[#f0f7f3] border border-[#c4ded0] rounded-xl p-4 flex items-start gap-3 text-xs text-[#16432b]">
            <Database className="w-5 h-5 text-[#1b5e3a] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-[#0f3420]">
                المصدر الحصري لمعلومات المساعد الذكي
              </h4>
              <p className="text-[#194b30] mt-1 leading-relaxed">
                جميع القوانين والتشريعات المضافة والمعدلة هنا في قاعدة البيانات تُحقن تلقائياً ومباشرة كجزء من تعليمات النظام (System Instructions) في كل استدعاء لموديل Gemini. لا يجيب البوت إلا استناداً إلى هذه المواد كما هي مدخلة.
              </p>
            </div>
          </div>

          {/* Form: Add New Law */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-gray-100">
              <Plus className="w-5 h-5 text-[#12281e]" />
              <h3 className="text-base font-bold text-gray-900">إضافة قانون جديد لقاعدة المعرفة</h3>
            </div>

            {lawFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{lawFormError}</span>
              </div>
            )}

            {lawFormSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{lawFormSuccess}</span>
              </div>
            )}

            {/* Input Mode Selector: PDF Upload vs Manual Entry */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg mb-5 w-fit border border-gray-200">
              <button
                type="button"
                id="mode-pdf-btn"
                onClick={() => setInputMode('pdf')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  inputMode === 'pdf'
                    ? 'bg-white text-[#12281e] shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#1b5e3a]" />
                استيراد وقراءة ملف PDF قانوني
              </button>
              <button
                type="button"
                id="mode-manual-btn"
                onClick={() => setInputMode('manual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  inputMode === 'manual'
                    ? 'bg-white text-[#12281e] shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                كتابة يدوية مباشرة
              </button>
            </div>

            {/* BATCH PDF MODE */}
            {inputMode === 'pdf' && (
              <div className="mb-5 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="pdf-file-hidden-input"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {/* Batch Success / Error Banners */}
                {batchSuccessMessage && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span className="flex-1">{batchSuccessMessage}</span>
                    <button
                      type="button"
                      onClick={() => setBatchSuccessMessage(null)}
                      className="text-emerald-700 hover:text-emerald-900 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {batchErrorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                      <span>{batchErrorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBatchErrorMessage(null)}
                      className="text-red-700 hover:text-red-900 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Dropzone when no files are queued */}
                {queuedLaws.length === 0 ? (
                  <div
                    id="pdf-dropzone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#1b5e3a] bg-[#f0f7f3] scale-[1.01]'
                        : 'border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-emerald-500'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-[#1b5e3a] shadow-xs">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-1.5">
                      اسحب وأفلت ملفات PDF التشريعية هنا، أو انقر لاختيار عدة ملفات معاً
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 mb-4 max-w-lg mx-auto leading-relaxed">
                      يدعم رفع عدة ملفات قوانين دفعة واحدة. سيقوم الذكاء الاصطناعي باستخراج نصوص المواد والقرارات وكتابة اسم كل ملف واقتراح تصنيفه، لتراجعه وتضيف كافة القوانين إلى قاعدة المعرفة بنقرة واحدة.
                    </p>
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#12281e] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:bg-[#1c3e2f] transition-all">
                      <FileUp className="w-4 h-4" />
                      استعراض واختيار عدة ملفات PDF دفعة واحدة
                    </div>
                    <div className="mt-3 text-[11px] text-slate-400 font-medium">
                      الصيغة المدعومة: PDF تشريعي حتى 35 ميجابايت لكل ملف
                    </div>
                  </div>
                ) : (
                  /* Batch Queue View when files are present */
                  <div className="space-y-4">
                    {/* Queue Header Controls */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center flex-wrap gap-2 text-xs font-bold">
                        <span className="text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                          إجمالي الملفات: <span className="font-mono text-slate-900 font-black">{queuedLaws.length}</span>
                        </span>
                        <span className="text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                          جاهز للإضافة: {queuedLaws.filter((l) => l.status === 'ready').length}
                        </span>
                        {queuedLaws.some((l) => l.status === 'parsing') && (
                          <span className="text-amber-800 bg-amber-100/80 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            قيد الاستخراج: {queuedLaws.filter((l) => l.status === 'parsing').length}
                          </span>
                        )}
                        {queuedLaws.some((l) => l.status === 'pending') && (
                          <span className="text-slate-600 bg-slate-200/70 border border-slate-300 px-2.5 py-1.5 rounded-lg">
                            في الانتظار: {queuedLaws.filter((l) => l.status === 'pending').length}
                          </span>
                        )}
                        {queuedLaws.some((l) => l.status === 'error') && (
                          <span className="text-red-700 bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg">
                            أخطاء: {queuedLaws.filter((l) => l.status === 'error').length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {/* Quick Category Setter for all */}
                        <div className="hidden sm:flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500 text-[11px]">تصنيف موحد:</span>
                          <select
                            value={batchGlobalCategory}
                            onChange={(e) => handleApplyCategoryToAll(e.target.value)}
                            className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs cursor-pointer"
                            title="تطبيق هذا التصنيف على كافة الملفات في القائمة"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#1b5e3a]" />
                          إضافة ملفات أخرى
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllQueued}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-red-600 rounded-lg text-xs hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          إفراغ القائمة
                        </button>
                      </div>
                    </div>

                    {/* Files List Cards */}
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {queuedLaws.map((item, index) => (
                        <div
                          key={item.id}
                          className={`border rounded-xl p-4 transition-all ${
                            item.status === 'ready'
                              ? 'border-emerald-200 bg-emerald-50/30'
                              : item.status === 'parsing'
                              ? 'border-amber-300 bg-amber-50/40'
                              : item.status === 'error'
                              ? 'border-red-200 bg-red-50/40'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          {/* File Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70 mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center font-mono shrink-0">
                                {index + 1}
                              </span>
                              <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0 text-red-600">
                                <FileType className="w-4 h-4" />
                              </div>
                              <div className="truncate max-w-xs sm:max-w-md">
                                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate" title={item.fileName}>
                                  {item.fileName}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span>{item.fileSizeFormatted}</span>
                                  {item.pageCount > 0 && <span>• {item.pageCount} صفحة</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {/* Status Badges */}
                              {item.status === 'ready' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  جاهز ({item.content.length} حرف)
                                </span>
                              )}
                              {item.status === 'parsing' && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                  {item.progressPercent}% {item.statusText || 'جاري الاستخراج...'}
                                </span>
                              )}
                              {item.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  في الانتظار...
                                </span>
                              )}
                              {item.status === 'error' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryQueuedItem(item.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                  title="إعادة المحاولة"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  إعادة المحاولة
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveQueuedItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="إزالة هذا الملف من القائمة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Progress bar during parsing */}
                          {item.status === 'parsing' && (
                            <div className="mb-3">
                              <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-300"
                                  style={{ width: `${item.progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Error banner */}
                          {item.status === 'error' && (
                            <div className="mb-3 p-2.5 bg-red-100/70 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                              <span>{item.error || 'تعذر استخراج المواد القانونية من هذا الملف.'}</span>
                            </div>
                          )}

                          {/* Editable Title & Category Inputs */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                اسم القانون أو القرار التشريعي <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleUpdateQueuedTitle(item.id, e.target.value)}
                                placeholder="اكتب أو عدّل اسم القانون هنا..."
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#12281e]"
                                required
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-700">
                                  التصنيف <span className="text-red-500">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCategoryModalError(null);
                                    setCategoryModalSuccess(null);
                                    setCategoryToDelete(null);
                                    setShowCategoryModal(true);
                                  }}
                                  className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                                >
                                  + تصنيف جديد
                                </button>
                              </div>
                              <select
                                value={item.category}
                                onChange={(e) => {
                                  if (e.target.value === '__add_new__') {
                                    setCategoryModalError(null);
                                    setCategoryModalSuccess(null);
                                    setCategoryToDelete(null);
                                    setShowCategoryModal(true);
                                  } else {
                                    handleUpdateQueuedCategory(item.id, e.target.value);
                                  }
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#12281e]"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                                <option value="__add_new__" className="text-emerald-700 font-bold bg-emerald-50">
                                  ➕ إضافة تصنيف جديد...
                                </option>
                              </select>
                            </div>
                          </div>

                          {/* Extracted Content Preview Toggle */}
                          {item.status === 'ready' && item.content && (
                            <div className="mt-3 pt-2.5 border-t border-slate-200/70">
                              <button
                                type="button"
                                onClick={() => handleTogglePreview(item.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#1b5e3a]" />
                                <span>
                                  {item.isExpanded ? 'إخفاء معاينة المواد القانونية' : 'معاينة نصوص المواد القانونية المستخرجة'}
                                </span>
                                {item.isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {item.isExpanded && (
                                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg max-h-48 overflow-y-auto text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                                  {item.content}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Batch Action Submit Footer */}
                    <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          جاهز للحفظ في قاعدة المعرفة
                        </h4>
                        <p className="text-xs text-slate-600">
                          سيتم حفظ كافة القوانين المكتملة وتحديث المستشار الذكي RAG فورياً.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="batch-submit-laws-btn"
                        onClick={handleBatchSubmit}
                        disabled={
                          isSubmittingBatch ||
                          queuedLaws.filter((l) => l.status === 'ready' && l.content.trim()).length === 0
                        }
                        className="w-full sm:w-auto px-6 py-3 bg-[#12281e] hover:bg-[#1c3e2f] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingBatch ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            جاري حفظ وإضافة القوانين دفعة واحدة...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 text-emerald-400" />
                            إضافة كافة القوانين ({queuedLaws.filter((l) => l.status === 'ready').length}) إلى قاعدة المعرفة دفعة واحدة
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MANUAL ENTRY MODE */}
            {inputMode === 'manual' && (
              <form onSubmit={handleCreateLaw} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      عنوان القانون أو التشريع <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="law-title-input"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="مثال: قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل وتعديلاته"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700">
                        التصنيف القانوني <span className="text-red-500">*</span>
                      </label>
                      <button
                        id="manage-categories-btn"
                        type="button"
                        onClick={() => {
                          setCategoryModalError(null);
                          setCategoryModalSuccess(null);
                          setCategoryToDelete(null);
                          setShowCategoryModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/90 px-2.5 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                        title="إدارة وتخصيص وحذف التصنيفات القانونية"
                      >
                        <Settings className="w-3.5 h-3.5 text-emerald-700" />
                        <span>إدارة التصنيفات</span>
                      </button>
                    </div>
                    <select
                      id="law-category-select"
                      value={newCategory}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setCategoryModalError(null);
                          setCategoryModalSuccess(null);
                          setCategoryToDelete(null);
                          setShowCategoryModal(true);
                        } else {
                          setNewCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="__add_new__" className="text-emerald-700 font-bold bg-emerald-50">
                        ➕ إضافة تصنيف جديد...
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    نص المواد الكامل والبنود القانونية <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="law-content-textarea"
                    rows={6}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="أدخل نصوص المواد القانونية، الأرقام، النسب، الإعفاءات، وشروط التطبيق بالتفصيل..."
                    className="w-full p-4 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] font-sans leading-relaxed transition-all"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    id="law-submit-btn"
                    type="submit"
                    disabled={submittingLaw}
                    className="px-5 py-2.5 bg-[#12281e] hover:bg-[#1c3e2f] text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingLaw ? (
                      'جاري الحفظ في قاعدة البيانات...'
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        إضافة القانون إلى قاعدة المعرفة
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Laws List & Management */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                <input
                  id="law-search-input"
                  type="text"
                  value={lawSearch}
                  onChange={(e) => setLawSearch(e.target.value)}
                  placeholder="البحث في عناوين ونصوص المواد..."
                  className="w-full pr-9 pl-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#12281e]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-500">التصنيف:</span>
                <select
                  id="law-filter-select"
                  value={lawCategoryFilter}
                  onChange={(e) => setLawCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none"
                >
                  <option value="الكل">جميع التصنيفات ({laws.length})</option>
                  {categories.map((cat) => {
                    const count = laws.filter((l) => l.category === cat.name).length;
                    return (
                      <option key={cat.id} value={cat.name}>
                        {cat.name} ({count})
                      </option>
                    );
                  })}
                </select>
                <button
                  id="filter-manage-categories-btn"
                  type="button"
                  onClick={() => {
                    setCategoryModalError(null);
                    setCategoryModalSuccess(null);
                    setCategoryToDelete(null);
                    setShowCategoryModal(true);
                  }}
                  className="p-2 text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-gray-200 transition-colors"
                  title="إدارة التصنيفات القانونية"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Feedback Message */}
            {lawListFeedback && (
              <div
                className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold animate-in fade-in ${
                  lawListFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-red-50 text-red-900 border-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {lawListFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{lawListFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLawListFeedback(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Header / Actions: count and expand/collapse all */}
            <div className="flex items-center justify-between gap-2 mb-3 px-1 text-xs text-gray-500">
              <span className="font-semibold">
                عرض {filteredLaws.length} من أصل {laws.length} قانون
              </span>
              {filteredLaws.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleAllLaws(true)}
                    className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-emerald-600" />
                    عرض محتوى الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllLaws(false)}
                    className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <EyeOff className="w-3 h-3 text-gray-500" />
                    طي الكل
                  </button>
                </div>
              )}
            </div>

            {/* Laws Cards */}
            {filteredLaws.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">لم يتم العثور على أي قوانين مطابقة للبحث.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLaws.map((law) => {
                  const isExpanded = !!expandedLawIds[law.id];
                  return (
                    <div
                      key={law.id}
                      className="border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-white hover:border-emerald-300 transition-all shadow-xs"
                    >
                      {/* Law Main Row: نص/اسم القانون + التصنيف + زر عرض المحتوى + تعديل + حذف */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getCategoryBadgeClass(law.category)}`}
                          >
                            {law.category}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 leading-snug">
                            {law.title}
                          </h4>
                          {law.sourceFileName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 shrink-0">
                              <FileType className="w-3 h-3 text-red-500" />
                              <span>{law.sourceFileName}</span>
                              {law.pageCount ? <span>({law.pageCount} ص)</span> : null}
                            </span>
                          )}
                        </div>

                        {/* Actions Row: عرض المحتوى + تعديل + حذف */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* زر عرض المحتوى / إخفاء المحتوى */}
                          <button
                            id={`law-toggle-content-btn-${law.id}`}
                            type="button"
                            onClick={() => toggleLawContent(law.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-xs'
                            }`}
                            title={isExpanded ? 'إخفاء محتوى القانون' : 'عرض محتوى القانون'}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{isExpanded ? 'إخفاء المحتوى' : 'عرض المحتوى'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                          </button>

                          {/* زر تعديل */}
                          <button
                            id={`law-edit-btn-${law.id}`}
                            type="button"
                            onClick={() => handleStartEdit(law)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-gray-600" />
                            تعديل
                          </button>

                          {/* زر حذف */}
                          <button
                            id={`law-delete-btn-${law.id}`}
                            type="button"
                            onClick={() => handleOpenDeleteLawModal(law)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1 transition-colors cursor-pointer"
                            title="حذف هذا القانون"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                            حذف
                          </button>
                        </div>
                      </div>

                      {/* المحتوى يظهر فقط عند الضغط على "عرض المحتوى" */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-emerald-700" />
                              نصوص ومواد القانون الكاملة:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingLawModal(law)}
                                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>نافذة مكبرة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(law.content);
                                  setCopiedLawId(law.id);
                                  setTimeout(() => setCopiedLawId(null), 2000);
                                }}
                                className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md hover:bg-gray-200 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedLawId === law.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <span>نسخ النص</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto font-sans shadow-inner">
                            {law.content}
                          </div>
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
                        <span>معرّف المرجع: {law.id}</span>
                        <span>
                          آخر تحديث:{' '}
                          {new Date(law.updatedAt || law.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Law Modal */}
      {editingLaw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-[#12281e] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#d4af37]" />
                تعديل نصوص القانون في قاعدة المعرفة
              </h3>
              <button
                onClick={() => setEditingLaw(null)}
                className="text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عنوان القانون
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-bold"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    التصنيف القانوني <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalError(null);
                      setCategoryModalSuccess(null);
                      setCategoryToDelete(null);
                      setShowCategoryModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-emerald-700" />
                    <span>إدارة التصنيفات</span>
                  </button>
                </div>
                <select
                  value={editCategory}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setCategoryModalError(null);
                      setCategoryModalSuccess(null);
                      setCategoryToDelete(null);
                      setShowCategoryModal(true);
                    } else {
                      setEditCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__add_new__" className="text-emerald-700 font-bold bg-emerald-50">
                    ➕ إضافة تصنيف جديد...
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  نص المواد الكامل
                </label>
                <textarea
                  rows={8}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-4 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] font-sans leading-relaxed transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingLaw(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatingLaw}
                  className="px-4 py-2 text-xs font-bold bg-[#12281e] text-white hover:bg-[#1e4030] rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {updatingLaw ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Law Content Modal */}
      {viewingLawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#12281e] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-5 h-5 text-[#d4af37] shrink-0" />
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {viewingLawModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingLawModal(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(viewingLawModal.category)}`}>
                  {viewingLawModal.category}
                </span>
                {viewingLawModal.sourceFileName && (
                  <span className="text-xs text-gray-500">
                    المصدر: {viewingLawModal.sourceFileName}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(viewingLawModal.content);
                  setCopiedLawId(viewingLawModal.id);
                  setTimeout(() => setCopiedLawId(null), 2000);
                }}
                className="px-3 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLawId === viewingLawModal.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <span>نسخ كامل النص</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap selection:bg-emerald-100">
              {viewingLawModal.content}
            </div>

            <div className="px-5 py-3 bg-gray-100 border-t border-gray-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingLawModal(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner & Quick Actions */}
          <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0a1813] text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#235748] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold">إعدادات السيستم وتخصيص الهوية</h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    تزامن سحابي Firestore ✓
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  تغيير اسم السيستم، وتخصيص اللوجو الرسمي وشعارات الوزارة المعروضة في الترويسة وبوابة الشات لجميع المستخدمين.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <button
                type="button"
                id="reset-branding-defaults-btn"
                onClick={handleResetBranding}
                disabled={resettingBranding || savingBranding}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="استعادة الاسم والشعار الافتراضي"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingBranding ? 'animate-spin' : ''}`} />
                <span>استعادة الافتراضي</span>
              </button>
            </div>
          </div>

          {/* Feedback banner if any */}
          {brandingFeedback && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs border animate-in fade-in duration-150 ${
                brandingFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-red-50 text-red-900 border-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {brandingFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{brandingFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBrandingFeedback(null)}
                className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded"
              >
                إغلاق
              </button>
            </div>
          )}

          {/* Grid Layout: Settings Controls on Left/Right, Live Preview on Top or Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Section (8 cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Card 1: System Name and Identity */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#12281e] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">اسم وهوية السيستم</h4>
                    <p className="text-[11px] text-gray-500">
                      يظهر الاسم في أعلى الموقع والتبويب والرسائل الترحيبية
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* System Main Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      اسم السيستم الرئيسي <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-system-name"
                      value={systemNameInput}
                      onChange={(e) => setSystemNameInput(e.target.value)}
                      placeholder="مثال: مساعد الجمارك والضرائب"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] transition-all"
                      required
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      اسم المنظومة الظاهر في عنوان الصفحة (Header) وفي المحادثة الذكية لكافة المستخدمين.
                    </p>
                  </div>

                  {/* System Badge & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        الشارة الفرعية (Badge)
                      </label>
                      <input
                        type="text"
                        id="input-system-badge"
                        value={systemBadgeInput}
                        onChange={(e) => setSystemBadgeInput(e.target.value)}
                        placeholder="مثال: فلسطين"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] transition-all"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        وسم نصي صغير مميز بجانب اسم السيستم (مثل: فلسطين، الإدارة العامة).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        الجهة أو الوزارة (التوصيف الفرعي)
                      </label>
                      <input
                        type="text"
                        id="input-system-subtitle"
                        value={systemSubtitleInput}
                        onChange={(e) => setSystemSubtitleInput(e.target.value)}
                        placeholder="مثال: دولة فلسطين • وزارة المالية"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] transition-all"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        يظهر بخط أصغر تحت اسم المنظومة في الشريط العلوي.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: System Logo Customization */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#12281e] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">شعار ولوجو السيستم</h4>
                    <p className="text-[11px] text-gray-500">
                      يمكنك اختيار أيقونة رسمية معتمدة أو رفع صورة الشعار الخاصة بوزارتك أو مؤسستك
                    </p>
                  </div>
                </div>

                {/* Logo Type Tabs */}
                <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl border border-gray-200 w-fit flex-wrap">
                  <button
                    type="button"
                    onClick={() => setLogoTypeInput('preset')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logoTypeInput === 'preset'
                        ? 'bg-white text-[#12281e] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    <span>أيقونة رسمية معتمدة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTypeInput('upload')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logoTypeInput === 'upload'
                        ? 'bg-white text-[#12281e] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>رفع صورة من الجهاز</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoTypeInput('url')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logoTypeInput === 'url'
                        ? 'bg-white text-[#12281e] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>رابط صورة مباشر (URL)</span>
                  </button>
                </div>

                {/* MODE 1: Preset Icons */}
                {logoTypeInput === 'preset' && (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-2">
                        اختر أيقونة الشعار الرسمية:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { id: 'scale', name: 'ميزان العدالة والقانون', icon: Scale },
                          { id: 'shield', name: 'درع الأمان والرقابة', icon: Shield },
                          { id: 'landmark', name: 'صرح حكومي / وزارة', icon: Landmark },
                          { id: 'scroll', name: 'وثيقة وتشريع', icon: FileText },
                          { id: 'book', name: 'كتاب التشريعات', icon: BookOpen },
                        ].map((item) => {
                          const IconComp = item.icon;
                          const isSelected = logoPresetInput === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setLogoPresetInput(item.id)}
                              className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#12281e] bg-[#12281e]/5 ring-2 ring-[#12281e]/20 text-[#12281e]'
                                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shadow-xs"
                                style={{
                                  backgroundColor: isSelected ? '#12281e' : '#ffffff',
                                  color: isSelected ? logoAccentColorInput : '#475569',
                                }}
                              >
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className="text-[11px] font-bold leading-tight">{item.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Accent Picker */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-2">
                        لون تمييز الأيقونة (Accent Color):
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {[
                          { color: '#d4af37', label: 'ذهبي كلاسيكي' },
                          { color: '#10b981', label: 'أخضر زمردي' },
                          { color: '#3b82f6', label: 'أزرق ملكي' },
                          { color: '#8b5cf6', label: 'بنفسجي ملكي' },
                          { color: '#f59e0b', label: 'كهرماني' },
                          { color: '#ef4444', label: 'أحمر قرمزي' },
                          { color: '#ffffff', label: 'أبيض ناصع' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setLogoAccentColorInput(c.color)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              logoAccentColorInput === c.color
                                ? 'border-gray-900 ring-2 ring-gray-900/30 shadow-xs'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: Upload Image */}
                {logoTypeInput === 'upload' && (
                  <div className="space-y-4 pt-1">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      onChange={handleLogoFileUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                    />

                    <div
                      onClick={() => logoFileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-[#12281e] bg-gray-50/70 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all"
                    >
                      {uploadedLogoPreview || logoUrlInput ? (
                        <div className="space-y-3">
                          <div className="w-20 h-20 mx-auto rounded-2xl bg-[#0b1f1a] border border-[#235748] p-2 flex items-center justify-center shadow-md">
                            <img
                              src={uploadedLogoPreview || logoUrlInput}
                              alt="Logo Preview"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              تم اختيار الصورة بنجاح
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              انقر هنا لتغيير الصورة أو اختيار ملف آخر من جهازك
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-gray-800">
                            انقر لاختيار ملف صورة الشعار من جهازك
                          </p>
                          <p className="text-[11px] text-gray-500">
                            يدعم PNG (خلفية شفافة مفضلة)، JPG، SVG، WebP (الحد الأقصى: 2 ميغابايت)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MODE 3: Image URL */}
                {logoTypeInput === 'url' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5">
                        رابط صورة الشعار المباشر (URL):
                      </label>
                      <input
                        type="url"
                        id="input-logo-url"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] font-mono text-left transition-all"
                        dir="ltr"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        أدخل رابطاً مباشراً لصورة الشعار الرسمية المنشورة على الإنترنت.
                      </p>
                    </div>

                    {logoUrlInput && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="w-12 h-12 rounded-xl bg-[#0b1f1a] border border-[#235748] p-1 flex items-center justify-center shrink-0">
                          <img
                            src={logoUrlInput}
                            alt="Logo URL Preview"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 min-w-0">
                          <span className="font-bold text-gray-800 block">معاينة الرابط:</span>
                          <span className="text-[11px] font-mono text-gray-500 break-all">{logoUrlInput}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 3: Founder Profile & Site Overview Customization */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 text-[#91751d] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">بيانات المؤسس ونبذة عن الموقع</h4>
                    <p className="text-[11px] text-gray-500">
                      تظهر هذه البيانات مباشرة في الواجهة الرئيسية للموقع لجميع الزوار قبل تسجيل الدخول
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    اسم المؤسس:
                  </label>
                  <input
                    type="text"
                    value={founderNameInput}
                    onChange={(e) => setFounderNameInput(e.target.value)}
                    placeholder="مثال: أ. صلاح الدين عابد"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] transition-all"
                  />
                </div>

                {/* Founder Photo: Both Upload from device AND Enter URL available */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-800">
                        صورة المؤسس:
                      </label>
                      <p className="text-[11px] text-gray-500">
                        يمكنك رفع صورة مباشرة من جهازك أو وضع رابط خارجي
                      </p>
                    </div>

                    {/* Modern Switcher: Upload vs URL */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setFounderPhotoSource('upload')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          founderPhotoSource === 'upload'
                            ? 'bg-[#12281e] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>رفع من الجهاز</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFounderPhotoSource('url')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          founderPhotoSource === 'url'
                            ? 'bg-[#12281e] text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>رابط صورة (URL)</span>
                      </button>
                    </div>
                  </div>

                  {/* OPTION 1: Upload directly from Device */}
                  {founderPhotoSource === 'upload' && (
                    <div className="space-y-3">
                      <input
                        type="file"
                        ref={founderPhotoFileInputRef}
                        onChange={handleFounderPhotoFileUpload}
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                      />

                      <div
                        onClick={() => founderPhotoFileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFounderPhoto(true);
                        }}
                        onDragLeave={() => setIsDraggingFounderPhoto(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFounderPhoto(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) processFounderPhotoFile(file);
                        }}
                        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                          isDraggingFounderPhoto
                            ? 'border-emerald-600 bg-emerald-50/80 scale-[0.99]'
                            : 'border-gray-300 hover:border-[#12281e] bg-gray-50/70 hover:bg-emerald-50/30'
                        }`}
                      >
                        {founderPhotoUrlInput ? (
                          <div className="flex items-center gap-4 w-full justify-center flex-wrap sm:flex-nowrap">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-900 border-2 border-[#d4af37] shadow-md shrink-0">
                              <img
                                src={founderPhotoUrlInput}
                                alt="Founder Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="text-right flex-1 min-w-[180px]">
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>تم تحديد الصورة بنجاح</span>
                              </div>
                              <p className="text-xs font-bold text-gray-800">
                                {founderPhotoUrlInput.startsWith('data:') ? 'صورة مرفوعة من الجهاز' : 'صورة محددة للمؤسس'}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                انقر هنا أو اسحب صورة جديدة لتغييرها في أي وقت (PNG, JPG, WebP)
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                              <UploadCloud className="w-6 h-6 text-emerald-700" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800">
                                اضغط هنا لرفع صورة المؤسس من جهازك أو اسحب الملف وأفلته هنا
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                يدعم ملفات PNG و JPG و WebP و SVG (حتى 5 ميغابايت)
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {founderPhotoUrlInput && (
                        <div className="flex items-center justify-between text-xs px-1">
                          <button
                            type="button"
                            onClick={() => founderPhotoFileInputRef.current?.click()}
                            className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>اختيار صورة أخرى من الجهاز</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFounderPhotoUrlInput('')}
                            className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>إزالة الصورة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OPTION 2: Enter direct URL */}
                  {founderPhotoSource === 'url' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            type="url"
                            value={founderPhotoUrlInput}
                            onChange={(e) => setFounderPhotoUrlInput(e.target.value)}
                            placeholder="https://... (رابط صورة المؤسس المباشر)"
                            className="w-full pl-3.5 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] transition-all font-mono"
                            dir="ltr"
                          />
                          <Link2 className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {founderPhotoUrlInput && (
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-900 border-2 border-[#d4af37] shrink-0 shadow-xs">
                            <img
                              src={founderPhotoUrlInput}
                              alt="Founder preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>ضع رابطاً مباشراً للصورة من أي موقع أو استضافة خارجية (URL).</span>
                        {founderPhotoUrlInput && (
                          <button
                            type="button"
                            onClick={() => setFounderPhotoUrlInput('')}
                            className="text-red-600 hover:text-red-700 font-bold cursor-pointer"
                          >
                            مسح الرابط
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    كلمة / اقتباس المؤسس:
                  </label>
                  <input
                    type="text"
                    value={founderQuoteInput}
                    onChange={(e) => setFounderQuoteInput(e.target.value)}
                    placeholder="مثال: «سعينا لبناء هذا النظام ليكون دليلاً قانونياً ذكياً موثوقاً...»"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    نبذة تعريفية عن المؤسس وخبراته:
                  </label>
                  <textarea
                    rows={3}
                    value={founderBioInput}
                    onChange={(e) => setFounderBioInput(e.target.value)}
                    placeholder="اكتب نبذة عن مسيرة وخبرات المؤسس في القوانين الجمركية والضريبية..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] transition-all leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    نبذة شاملة عن الموقع والمنظومة (التي تظهر في الصفحة الرئيسية):
                  </label>
                  <textarea
                    rows={3}
                    value={siteOverviewInput}
                    onChange={(e) => setSiteOverviewInput(e.target.value)}
                    placeholder="اكتب نبذة توضيحية عن المنظومة، الخدمات التي تقدمها، التشريعات التي تستند إليها، وميزاتها للمكلفين..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e]/20 focus:border-[#12281e] transition-all leading-relaxed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetBranding}
                  disabled={resettingBranding || savingBranding}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  إلغاء التغييرات
                </button>

                <button
                  type="button"
                  id="save-branding-settings-btn"
                  onClick={handleSaveBranding}
                  disabled={savingBranding || !systemNameInput.trim()}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#12281e] hover:bg-[#1a3a2d] text-white rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingBranding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>جاري الحفظ والتطبيق سحابياً...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-emerald-400" />
                      <span>حفظ وتطبيق إعدادات السيستم سحابياً</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Live Preview Section (4 cols) */}
            <div className="lg:col-span-4 space-y-6">

              {/* Interactive Live Header Preview Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs sticky top-20 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#12281e]" />
                    <h4 className="text-xs font-bold text-gray-900">معاينة حية ومباشرة</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    مباشر (Live)
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    هكذا سيظهر الشعار واسم النظام في الشريط العلوي (Header) لجميع زوار ومستخدمي النظام:
                  </p>

                  {/* Header Simulated Widget */}
                  <div className="bg-[#0b1f1a] text-white p-4 rounded-xl border border-[#183d33] shadow-inner space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Logo Icon / Image */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#163a30] to-[#0d2620] border border-[#235748] flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                        {((logoTypeInput === 'url' || logoTypeInput === 'upload') && (uploadedLogoPreview || logoUrlInput)) ? (
                          <img
                            src={uploadedLogoPreview || logoUrlInput}
                            alt="Preview"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : logoPresetInput === 'shield' ? (
                          <Shield className="w-5 h-5" style={{ color: logoAccentColorInput }} />
                        ) : logoPresetInput === 'landmark' ? (
                          <Landmark className="w-5 h-5" style={{ color: logoAccentColorInput }} />
                        ) : logoPresetInput === 'scroll' ? (
                          <FileText className="w-5 h-5" style={{ color: logoAccentColorInput }} />
                        ) : logoPresetInput === 'book' ? (
                          <BookOpen className="w-5 h-5" style={{ color: logoAccentColorInput }} />
                        ) : (
                          <Scale className="w-5 h-5" style={{ color: logoAccentColorInput }} />
                        )}
                      </div>

                      {/* Name & Badge */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-white tracking-tight truncate">
                            {systemNameInput.trim() || 'اسم السيستم'}
                          </span>
                          {systemBadgeInput.trim() && (
                            <span className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/25">
                              {systemBadgeInput.trim()}
                            </span>
                          )}
                        </div>
                        {systemSubtitleInput.trim() && (
                          <p className="text-[10px] text-slate-300/80 font-light truncate mt-0.5">
                            {systemSubtitleInput.trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bot Message Simulated Widget */}
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] font-bold text-gray-500">معاينة داخل رسائل الشات:</span>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#12281e] flex items-center justify-center shrink-0 text-white overflow-hidden">
                        {((logoTypeInput === 'url' || logoTypeInput === 'upload') && (uploadedLogoPreview || logoUrlInput)) ? (
                          <img
                            src={uploadedLogoPreview || logoUrlInput}
                            alt="Bot Avatar"
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <Scale className="w-3.5 h-3.5" style={{ color: logoAccentColorInput }} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-[#1b5e3a] mb-1">
                          {systemNameInput.trim() || 'اسم السيستم'} • إفادة نظامية
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                          مرحباً بك، يتم تطبيق هذا الاسم والشعار رسمياً لكافة المستفيدين.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Firestore Info */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-700" />
                      <span>حفظ دائم في Cloud Firestore</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      يتم حفظ الإعدادات في مجموعة <code className="bg-white px-1 py-0.5 rounded border border-emerald-200 font-mono text-[10px]">system_settings</code> مما يجعل التغيير مستمراً حتى بعد إعادة تحميل الصفحة أو تسجيل الدخول من جهاز آخر.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SUPERVISORS MANAGEMENT (هيئة المشرفين)            */}
      {/* ======================================================== */}
      {activeTab === 'supervisors' && (
        <SupervisorsAdminTab />
      )}

      {/* ======================================================== */}
      {/* TAB 5: RELATED SITES MANAGEMENT (مواقع ذات صلة)          */}
      {/* ======================================================== */}
      {activeTab === 'related-sites' && (
        <RelatedSitesAdminTab />
      )}

      {/* ======================================================== */}
      {/* TAB: PARTNERS MANAGEMENT (شركاؤنا - المؤسسات الشريكة)    */}
      {/* ======================================================== */}
      {activeTab === 'partners' && (
        <PartnersAdminTab />
      )}

      {/* ======================================================== */}
      {/* TAB 6: PLATFORM ABOUT & VISION (عن المنصة والرؤية والرسالة) */}
      {/* ======================================================== */}
      {activeTab === 'about' && (
        <AboutPlatformAdminTab onAboutUpdated={onAboutUpdated} />
      )}

      {/* ======================================================== */}
      {/* TAB 7: CONTACT US MANAGEMENT (بيانات التواصل واتساب وبريد) */}
      {/* ======================================================== */}
      {activeTab === 'contact' && (
        <ContactAdminTab onContactUpdated={onContactUpdated} />
      )}

      {/* Dynamic Category Management Modal (إدارة التصنيفات القانونية) */}
      {showCategoryModal && (
        <div
          id="category-management-modal"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCategoryModal(false);
              setCategoryToDelete(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0d1c15] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#244b38] border border-[#3b7357] flex items-center justify-center text-[#f5d77f]">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">إدارة التصنيفات القانونية</h3>
                  <p className="text-[11px] text-emerald-300">
                    تخصيص تصنيفات القوانين وحفظها سحابياً في Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryToDelete(null);
                }}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Add New Category Form */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4 text-emerald-700" />
                    <span>إضافة تصنيف جديد</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    حفظ فوري في قاعدة البيانات
                  </span>
                </div>

                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    id="new-category-name-input"
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => {
                      setNewCategoryInput(e.target.value);
                      if (categoryModalError) setCategoryModalError(null);
                    }}
                    placeholder="اكتب اسم التصنيف (مثال: جمارك المركبات، ضريبة أملاك...)"
                    className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#12281e]"
                  />
                  <button
                    id="submit-add-category-btn"
                    type="submit"
                    disabled={addingCategory || !newCategoryInput.trim()}
                    className="px-4 py-2 bg-[#12281e] text-white hover:bg-[#1e4030] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
                  >
                    {addingCategory ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الإضافة...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Validation / Error Message */}
                {categoryModalError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{categoryModalError}</span>
                  </div>
                )}

                {/* Success Message */}
                {categoryModalSuccess && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span>{categoryModalSuccess}</span>
                  </div>
                )}
              </div>

              {/* Deletion Confirmation Banner */}
              {categoryToDelete && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-red-900">
                        تأكيد حذف التصنيف: «{categoryToDelete.name}»
                      </h4>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        {laws.filter((l) => l.category === categoryToDelete.name).length > 0 ? (
                          <>
                            ⚠️ <strong>تنبيه هام:</strong> يوجد حالياً{' '}
                            <span className="font-bold underline">
                              {laws.filter((l) => l.category === categoryToDelete.name).length} تشريع/قانون
                            </span>{' '}
                            مسجل تحت هذا التصنيف. حذف التصنيف سيحذفه من قائمة الاختيارات، لكن القوانين القائمة ستحتفظ بنصها وتصنيفها.
                          </>
                        ) : (
                          'هل أنت متأكد من رغبتك في حذف هذا التصنيف نهائياً من قاعدة البيانات السحابية؟'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-red-200">
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(null)}
                      disabled={deletingCategoryId === categoryToDelete.id}
                      className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-red-100/60 rounded-lg transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDeleteCategory(categoryToDelete)}
                      disabled={deletingCategoryId === categoryToDelete.id}
                      className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      {deletingCategoryId === categoryToDelete.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الحذف...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>تأكيد الحذف</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Current Categories List */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>التصنيفات المعتمدة حالياً</span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-bold border border-gray-200">
                      {categories.length}
                    </span>
                  </h4>
                  {categoriesLoading && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جاري التحديث...
                    </span>
                  )}
                </div>

                {categories.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    لا توجد تصنيفات حالياً. يمكنك إضافة تصنيف جديد أعلاه.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                    {categories.map((cat) => {
                      const lawCount = laws.filter((l) => l.category === cat.name).length;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2.5 bg-gray-50/70 hover:bg-gray-100/80 rounded-xl border border-gray-200 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                                cat.name
                              )} shrink-0`}
                            >
                              {cat.name}
                            </span>
                            {cat.isDefault ? (
                              <span className="text-[10px] font-semibold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded">
                                افتراضي
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                                مخصص
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-gray-500 font-medium">
                              {lawCount} {lawCount === 1 ? 'قانون' : 'قوانين'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryModalError(null);
                                setCategoryModalSuccess(null);
                                setCategoryToDelete(cat);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={`حذف تصنيف "${cat.name}"`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>متصل بقاعدة بيانات Cloud Firestore</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Law Deletion Confirmation Modal */}
      {lawToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-red-200 overflow-hidden text-right"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-red-50/90 border-b border-red-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-red-950">
                    تأكيد حذف القانون من قاعدة البيانات
                  </h3>
                  <p className="text-[11px] text-red-700">
                    إجراء نهائي وغير قابل للتراجع في Cloud Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!deletingLawId) setLawToDelete(null);
                }}
                disabled={Boolean(deletingLawId)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-red-100/50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا القانون نهائياً؟ سيتم إزالته من قاعدة البيانات السحابية (Firestore) ولن يعتمد عليه المستشار القانوني في الردود لاحقاً.
              </p>

              {/* Law summary card */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                      lawToDelete.category
                    )}`}
                  >
                    {lawToDelete.category}
                  </span>
                  {lawToDelete.sourceFileName && (
                    <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      ملف: {lawToDelete.sourceFileName}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-gray-900 leading-snug">
                  {lawToDelete.title}
                </h4>
                <div className="text-[11px] text-gray-500 line-clamp-3 bg-white p-2 rounded border border-gray-100 font-sans">
                  {lawToDelete.content}
                </div>
              </div>

              {/* Error display if any */}
              {deleteLawError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{deleteLawError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLawToDelete(null)}
                disabled={Boolean(deletingLawId)}
                className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200/80 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                id="confirm-delete-law-btn"
                onClick={() => handleConfirmDeleteLaw(lawToDelete)}
                disabled={Boolean(deletingLawId)}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deletingLawId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحذف من السحابة...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، احذف القانون نهائياً</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EXTEND / CUSTOMIZE TRIAL MODAL DIALOG                     */}
      {/* ======================================================== */}
      {trialModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-[#193225] to-[#12281e] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">تمديد الفترة التجريبية للمستخدم</h3>
                  <p className="text-[11px] text-[#93dfb3] font-mono">@{trialModalUser.username}</p>
                </div>
              </div>
              <button
                onClick={() => setTrialModalUser(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex justify-between text-gray-700">
                  <span className="text-gray-500">اسم المستخدم:</span>
                  <span className="font-bold text-gray-900">{trialModalUser.fullName || trialModalUser.username}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="text-gray-500">حالة الحساب الحالية:</span>
                  <span className="font-bold text-amber-700">
                    {trialModalUser.isSubscribed
                      ? 'مشترك دائم'
                      : trialModalUser.status === 'frozen'
                      ? 'مجمد (انتهت التجربة)'
                      : `تجريبي (متبقي ${trialModalUser.remainingTrialDays ?? trialModalUser.trialDays ?? defaultTrialDays} يوم)`}
                  </span>
                </div>
                {trialModalUser.trialEndsAt && (
                  <div className="flex justify-between text-gray-700">
                    <span className="text-gray-500">تاريخ انتهاء التجربة:</span>
                    <span className="font-mono text-[11px] font-bold">
                      {new Date(trialModalUser.trialEndsAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-2">
                  اختر عدد الأيام الإضافية المراد تمديدها للحساب:
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExtendDaysInput(days)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        extendDaysInput === days
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                      }`}
                    >
                      +{days} أيام
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-xs font-medium text-gray-600">أو حدد عدداً مخصصاً:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={extendDaysInput}
                    onChange={(e) => setExtendDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-center outline-none"
                  />
                  <span className="text-xs text-gray-500">يوم إضافي</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                ℹ️ سيتم تمديد تاريخ انتهاء التجربة وتحديث حالة الحساب وحفظها مباشرة في قاعدة البيانات السحابية، وإذا كان الحساب مجمداً سيتم فك تجميده تلقائياً ليستطيع المستفيد الدخول للشات.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTrialModalUser(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200/80 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="confirm-extend-trial-btn"
                onClick={() => handleExtendTrial(trialModalUser.id, extendDaysInput)}
                disabled={updatingUserTrial}
                className="px-4 py-2 text-xs font-bold bg-[#12281e] hover:bg-[#1a3a2d] text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {updatingUserTrial ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التمديد...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تأكيد التمديد (+{extendDaysInput} يوم)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal (Eye icon pop-up) */}
      {selectedUserDetails && (
        <UserDetailsModal
          user={selectedUserDetails}
          onClose={() => setSelectedUserDetails(null)}
          onToggleSubscription={handleToggleSubscription}
          onOpenExtendTrial={(user) => {
            setTrialModalUser(user);
            setExtendDaysInput(7);
          }}
          onToggleFreeze={handleToggleFreeze}
          onUpdateStatus={handleUpdateStatus}
          defaultTrialDays={defaultTrialDays}
        />
      )}
    </div>
  );
};
