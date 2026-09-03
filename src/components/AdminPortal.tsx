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
  Sparkles
} from 'lucide-react';
import { User, Law, LawCategory, LegalCategory } from '../types';
import { extractTextFromPDF, formatBytes, PDFProgress } from '../utils/pdfParser';

interface AdminPortalProps {
  onLawsUpdated?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLawsUpdated }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'laws'>('requests');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilter, setUsersFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Auto Approval State
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(true);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

  // Laws state
  const [laws, setLaws] = useState<Law[]>([]);
  const [lawsLoading, setLawsLoading] = useState(false);
  const [lawSearch, setLawSearch] = useState('');
  const [lawCategoryFilter, setLawCategoryFilter] = useState<string>('الكل');

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

  // PDF Upload & Extraction state
  const [inputMode, setInputMode] = useState<'pdf' | 'manual'>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfFileSize, setPdfFileSize] = useState<string>('');
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PDFProgress | null>(null);
  const [pdfParseError, setPdfParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      console.error('Failed to fetch system status:', err);
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
      console.error('Failed to fetch users:', err);
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
      console.error('Failed to fetch laws:', err);
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
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch Settings (Auto-approval)
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok && typeof data.autoApprove === 'boolean') {
        setAutoApproveEnabled(data.autoApprove);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
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
      ]);
    } finally {
      setUsersLoading(false);
      setLawsLoading(false);
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

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

  // PDF Processing and Drag-and-Drop Handlers
  const processSelectedPDF = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfParseError('الملف المرفق ليس بصيغة PDF صالحة. يرجى اختيار ملف PDF تشريعي.');
      return;
    }

    // Proactive file size validation (max 35MB)
    if (file.size > 35 * 1024 * 1024) {
      setPdfParseError(
        `حجم ملف الـ PDF (${formatBytes(file.size)}) كبير جداً ويتجاوز الحد الأقصى (35 ميجابايت). يرجى اختيار ملف أصغر حجماً لتسريع المعالجة بواسطة الذكاء الاصطناعي.`
      );
      return;
    }

    setPdfFile(file);
    setPdfFileName(file.name);
    setPdfFileSize(formatBytes(file.size));
    setIsParsingPDF(true);
    setPdfParseError(null);
    setPdfProgress({
      currentPage: 1,
      totalPages: 1,
      percent: 20,
      statusText: 'جاري قراءة وتجهيز ملف الـ PDF للمعالجة الذكية...',
    });

    try {
      const result = await extractTextFromPDF(file, (progress) => {
        setPdfProgress(progress);
      });

      setPdfPageCount(result.numPages);
      setPdfFileSize(result.fileSizeFormatted);
      setNewContent(result.text);

      // Auto-populate Title
      if (result.suggestedTitle) {
        setNewTitle(result.suggestedTitle);
      }

      // Auto-populate and match Category
      if (result.suggestedCategory) {
        const rawCat = result.suggestedCategory.trim();
        const exactMatch = categories.find((c) => c.name === rawCat);
        if (exactMatch) {
          setNewCategory(exactMatch.name);
        } else {
          const partialMatch = categories.find(
            (c) =>
              rawCat.includes(c.name) ||
              c.name.includes(rawCat) ||
              (rawCat.includes('جمرك') && c.name.includes('جمارك')) ||
              (rawCat.includes('دخل') && c.name.includes('دخل')) ||
              (rawCat.includes('مضافة') && c.name.includes('مضافة')) ||
              (rawCat.includes('مكوس') && c.name.includes('مكوس'))
          );
          if (partialMatch) {
            setNewCategory(partialMatch.name);
          } else if (rawCat) {
            setNewCategory(rawCat);
          }
        }
      }

      setLawFormSuccess(
        `تم بنجاح قراءة واستخراج كافة المواد والبنود القانونية بواسطة الذكاء الاصطناعي (Gemini AI)! تم ملء العنوان والتصنيف ونصوص المواد تلقائياً أدناه لمراجعتها وحفظها.`
      );
      setTimeout(() => setLawFormSuccess(null), 9000);
    } catch (err: any) {
      console.error('PDF AI parsing error:', err);
      setPdfParseError(
        err?.message || 'تعذر استخراج المواد القانونية من ملف الـ PDF عبر الذكاء الاصطناعي. يرجى التأكد من وضوح الملف أو كتابة المواد يدوياً.'
      );
    } finally {
      setIsParsingPDF(false);
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
      const file = e.dataTransfer.files[0];
      processSelectedPDF(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processSelectedPDF(file);
    }
  };

  const handleClearPDF = () => {
    setPdfFile(null);
    setPdfFileName('');
    setPdfFileSize('');
    setPdfPageCount(0);
    setPdfProgress(null);
    setPdfParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          sourceFileName: pdfFileName || undefined,
          sourceFileSize: pdfFileSize || undefined,
          pageCount: pdfPageCount || undefined,
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
      handleClearPDF();
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
    return u.status === usersFilter;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const rejectedCount = users.filter((u) => u.status === 'rejected').length;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Official Government Admin Header Banner */}
      <div className="bg-gradient-to-l from-[#193225] via-[#12281e] to-[#0d1c15] text-white rounded-xl p-5 sm:p-6 shadow-sm border border-[#2b5942] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-[#1b3d2d] border border-[#2d6148] px-3.5 py-2 rounded-lg text-center min-w-[90px]">
            <span className="block text-[11px] text-[#93dfb3]">طلبات معلقة</span>
            <span className="text-lg font-bold text-amber-300">{pendingCount}</span>
          </div>
          <div className="bg-[#1b3d2d] border border-[#2d6148] px-3.5 py-2 rounded-lg text-center min-w-[90px]">
            <span className="block text-[11px] text-[#93dfb3]">قوانين بالمعرفة</span>
            <span className="text-lg font-bold text-emerald-300">{laws.length}</span>
          </div>
          <div className="bg-[#163527] border border-[#275940] px-3.5 py-2 rounded-lg flex flex-col justify-center text-right">
            <span className="text-[11px] text-[#86efac] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              قاعدة بيانات سحابية متصلة
            </span>
            <span className="text-xs font-semibold text-white mt-0.5">
              Google Cloud Firestore
            </span>
          </div>
        </div>
      </div>

      {/* Cloud Database Integration Info Bar */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 sm:p-4 text-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-emerald-900 flex items-center gap-2">
              <span>قاعدة البيانات السحابية: Google Cloud Firestore</span>
              <span className="bg-emerald-200/80 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                نشطة وسريعة للغاية
              </span>
            </div>
            <div className="text-emerald-700 text-[11px] mt-0.5">
              معرّف المشروع: <span className="font-mono">{systemStatus?.projectId || 'pos1-d562e'}</span> | معرّف قاعدة البيانات: <span className="font-mono">{systemStatus?.databaseId || 'ai-studio-6d29bd6f'}</span>
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
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'جارِ التحقق...' : 'تحديث البيانات السحابية'}
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3 shadow-xs">
        <button
          id="admin-tab-requests"
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'requests'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          طلبات المستخدمين
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-full font-extrabold animate-pulse">
              {pendingCount} جديد
            </span>
          )}
        </button>

        <button
          id="admin-tab-laws"
          onClick={() => setActiveTab('laws')}
          className={`pb-3 px-5 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'laws'
              ? 'border-[#12281e] text-[#12281e]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          إدارة القوانين وقاعدة المعرفة
          <span className="bg-[#e2e8f0] text-gray-700 text-[11px] px-2 py-0.5 rounded-full font-bold">
            {laws.length}
          </span>
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
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f8fafc] text-gray-600 border-b border-gray-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">مقدم الطلب / الحساب</th>
                      <th className="py-3 px-4">رقم الجوال</th>
                      <th className="py-3 px-4">تاريخ الطلب</th>
                      <th className="py-3 px-4">الحالة الحالية</th>
                      <th className="py-3 px-4 text-center">الإجراءات والقرار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const isProcessing = processingUserId === user.id;
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
                                مقبول (مصرّح للشات)
                              </span>
                            )}
                            {user.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                <XCircle className="w-3 h-3" />
                                مرفوض (ممنوع)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* Accept Button */}
                              <button
                                id={`admin-approve-user-${user.id}`}
                                onClick={() => handleUpdateStatus(user.id, 'approved')}
                                disabled={isProcessing || user.status === 'approved'}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                                  user.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-85'
                                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer hover:shadow-md'
                                }`}
                                title={
                                  user.status === 'approved'
                                    ? 'الحساب مقبول ومصرّح حالياً'
                                    : 'قبول الحساب وتصريحه لاستخدام الشات'
                                }
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                {user.status === 'approved' ? 'مقبول ✓' : 'قبول'}
                              </button>

                              {/* Reject Button */}
                              <button
                                id={`admin-reject-user-${user.id}`}
                                onClick={() => handleUpdateStatus(user.id, 'rejected')}
                                disabled={isProcessing || user.status === 'rejected'}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                                  user.status === 'rejected'
                                    ? 'bg-red-50 text-red-700 border border-red-200 cursor-default opacity-85'
                                    : 'bg-red-600 hover:bg-red-700 active:scale-95 text-white cursor-pointer hover:shadow-md'
                                }`}
                                title={
                                  user.status === 'rejected'
                                    ? 'الحساب مرفوض حالياً'
                                    : 'رفض الحساب ومنعه من استخدام الشات'
                                }
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5" />
                                )}
                                {user.status === 'rejected' ? 'مرفوض ✗' : 'رفض'}
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

            {/* Drag & Drop PDF Box (Visible in PDF Mode) */}
            {inputMode === 'pdf' && (
              <div className="mb-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="pdf-file-hidden-input"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!pdfFile ? (
                  <div
                    id="pdf-dropzone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#1b5e3a] bg-[#f0f7f3] scale-[1.01]'
                        : 'border-gray-300 bg-gray-50/70 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-[#1b5e3a]">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                      اسحب وأفلت ملف PDF التشريعي هنا، أو انقر للاختيار
                    </h4>
                    <p className="text-xs text-gray-500 mb-3 max-w-md mx-auto">
                      يدعم قراءة واستخراج نصوص المواد والقرارات الوزارية والجمركية تلقائياً مع معالجة اللغة العربية بدقة عالية.
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-100 transition-colors">
                      <FileUp className="w-3.5 h-3.5 text-[#1b5e3a]" />
                      استعراض ملفات الجهاز (PDF)
                    </div>
                  </div>
                ) : (
                  <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0 text-red-600">
                          <FileType className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
                              {pdfFileName}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              PDF
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                            <span>الحجم: {pdfFileSize}</span>
                            {pdfPageCount > 0 && <span>عدد الصفحات: {pdfPageCount} صفحة</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          id="change-pdf-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isParsingPDF}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          تغيير الملف
                        </button>
                        <button
                          type="button"
                          id="clear-pdf-btn"
                          onClick={handleClearPDF}
                          disabled={isParsingPDF}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="إزالة الملف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress or Status indicator */}
                    {isParsingPDF && (
                      <div className="mt-3 pt-3 border-t border-emerald-200/60 bg-emerald-50/70 -mx-4 -mb-4 p-4 rounded-b-xl">
                        <div className="flex items-center justify-between text-xs text-[#12281e] font-bold mb-2">
                          <span className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1b5e3a] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1b5e3a]"></span>
                            </span>
                            <Sparkles className="w-4 h-4 text-[#1b5e3a] animate-pulse" />
                            <span>{pdfProgress?.statusText || 'جاري قراءة واستخراج المواد القانونية من الملف بواسطة الذكاء الاصطناعي...'}</span>
                          </span>
                          <span className="font-mono text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            {pdfProgress?.percent || 50}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 via-[#1b5e3a] to-teal-600 transition-all duration-300 rounded-full"
                            style={{ width: `${pdfProgress?.percent || 50}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-emerald-700 mt-2 font-medium">
                          <span>نظام الاستخراج الذكي يتعرف على المواد والبنود والقرارات الوزارية والممسوحة ضوئياً.</span>
                          <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 font-bold">
                            Gemini AI
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Extracted success status */}
                    {!isParsingPDF && newContent.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>تم استخراج المواد وتعبئة الحقول بنجاح بواسطة الذكاء الاصطناعي، ويمكنك مراجعتها وتعديلها أدناه.</span>
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono shrink-0 mr-2">
                          {newContent.length} حرف
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Parsing error notification */}
                {pdfParseError && (
                  <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{pdfParseError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPdfParseError(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

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

            {/* Laws Cards */}
            {filteredLaws.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">لم يتم العثور على أي قوانين مطابقة للبحث.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLaws.map((law) => (
                  <div
                    key={law.id}
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(law.category)}`}
                        >
                          {law.category}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">{law.title}</h4>
                        {law.sourceFileName && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                            <FileType className="w-3 h-3 text-red-500" />
                            <span>{law.sourceFileName}</span>
                            {law.pageCount ? <span>({law.pageCount} ص)</span> : null}
                          </span>
                        )}
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`law-edit-btn-${law.id}`}
                          onClick={() => handleStartEdit(law)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-gray-600" />
                          تعديل
                        </button>
                        <button
                          id={`law-delete-btn-${law.id}`}
                          onClick={() => handleOpenDeleteLawModal(law)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded hover:bg-red-50 flex items-center gap-1 transition-colors cursor-pointer"
                          title="حذف هذا القانون"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          حذف
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
                      {law.content}
                    </div>

                    <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                      <span>معرّف المرجع: {law.id}</span>
                      <span>
                        آخر تحديث:{' '}
                        {new Date(law.updatedAt || law.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                ))}
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
    </div>
  );
};
