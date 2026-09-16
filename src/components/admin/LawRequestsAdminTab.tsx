import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Trash2,
  Check,
  X,
  AlertCircle,
  Eye,
  Calendar,
  User,
  Phone,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
  Loader2,
  Edit3
} from 'lucide-react';
import { LawRequest, LegalCategory } from '../../types';
import {
  directFetchLawRequestsFromFirestore,
  directUpdateLawRequestStatusInFirestore,
  directDeleteLawRequestFromFirestore,
  directSaveLawToFirestore,
} from '../../services/clientFirestore';

interface LawRequestsAdminTabProps {
  categories: LegalCategory[];
  currentAdmin?: { username: string; role: string; fullName?: string };
  onLawsUpdated?: () => void;
  onLawApproved?: () => void;
  onRequestCountChanged?: (pendingCount: number) => void;
}

export const LawRequestsAdminTab: React.FC<LawRequestsAdminTabProps> = ({
  categories = [],
  currentAdmin,
  onLawsUpdated,
  onLawApproved,
  onRequestCountChanged,
}) => {
  const [requests, setRequests] = useState<LawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preview & Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<LawRequest | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Approval review edits
  const [approveTitle, setApproveTitle] = useState('');
  const [approveCategory, setApproveCategory] = useState('');
  const [approveContent, setApproveContent] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Rejection state
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reviewerName = currentAdmin?.fullName || currentAdmin?.username || 'المشرف';

  // Fetch all requests
  const fetchRequests = async () => {
    setLoading(true);
    let loaded = false;

    // 1. Try server endpoint
    try {
      const res = await fetch('/api/law-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.lawRequests && Array.isArray(data.lawRequests)) {
          setRequests(data.lawRequests);
          loaded = true;
          const pending = (data.lawRequests || []).filter((r: LawRequest) => r.status === 'pending').length;
          onRequestCountChanged?.(pending);
        }
      }
    } catch (err) {
      console.warn('Server law-requests endpoint notice:', err);
    }

    // 2. Direct Firestore fallback
    if (!loaded) {
      try {
        const directList = await directFetchLawRequestsFromFirestore();
        const safeList = directList || [];
        setRequests(safeList);
        const pending = safeList.filter((r) => r.status === 'pending').length;
        onRequestCountChanged?.(pending);
      } catch (fErr) {
        console.error('Firestore law requests fetch error:', fErr);
        setRequests([]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Open Approve Modal with prefilled data
  const handleOpenApproveModal = (req: LawRequest) => {
    setSelectedRequest(req);
    setApproveTitle(req.title);
    setApproveCategory(req.category || categories[0]?.name || 'جمارك');
    setApproveContent(req.content);
    setApproveModalOpen(true);
  };

  // Confirm Approval & Add to Knowledge Base
  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    if (!approveTitle.trim() || !approveContent.trim()) {
      showNotification('error', 'يرجى التأكد من ملء عنوان القانون والمواد القانونية.');
      return;
    }

    setIsApproving(true);
    let success = false;

    try {
      const res = await fetch(`/api/law-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: reviewerName,
          customTitle: approveTitle.trim(),
          customCategory: approveCategory.trim(),
          customContent: approveContent.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          success = true;
        }
      }
    } catch (err) {
      console.warn('API approve notice, falling back to direct Firestore:', err);
    }

    // Fallback direct Firestore
    if (!success) {
      try {
        const newLawPayload = {
          id: 'law-' + Date.now(),
          title: approveTitle.trim(),
          category: approveCategory.trim(),
          content: approveContent.trim(),
          sourceFileName: selectedRequest.sourceFileName,
          sourceFileSize: selectedRequest.sourceFileSize,
          pageCount: selectedRequest.pageCount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const lawOk = await directSaveLawToFirestore(newLawPayload);
        const reqOk = await directUpdateLawRequestStatusInFirestore(
          selectedRequest.id,
          'approved',
          reviewerName
        );

        if (lawOk && reqOk) {
          success = true;
        }
      } catch (fErr) {
        console.error('Direct firestore approval error:', fErr);
      }
    }

    setIsApproving(false);

    if (success) {
      showNotification(
        'success',
        `تم اعتماد القانون "${approveTitle.trim()}" بنجاح وإدراجه رسمياً في قاعدة المعرفة!`
      );
      setApproveModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
      onLawsUpdated?.();
      onLawApproved?.();
    } else {
      showNotification('error', 'حدث خطأ أثناء اعتماد القانون. يرجى التحقق من اتصال الإنترنت.');
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (req: LawRequest) => {
    setSelectedRequest(req);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  // Confirm Rejection
  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    setIsRejecting(true);
    let success = false;

    try {
      const res = await fetch(`/api/law-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: reviewerName,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          success = true;
        }
      }
    } catch (err) {
      console.warn('API reject notice, falling back to direct Firestore:', err);
    }

    if (!success) {
      try {
        const reqOk = await directUpdateLawRequestStatusInFirestore(
          selectedRequest.id,
          'rejected',
          reviewerName,
          rejectionReason.trim()
        );
        if (reqOk) success = true;
      } catch (fErr) {
        console.error('Direct firestore reject error:', fErr);
      }
    }

    setIsRejecting(false);

    if (success) {
      showNotification('success', `تم رفض طلب القانون "${selectedRequest.title}".`);
      setRejectModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
    } else {
      showNotification('error', 'حدث خطأ أثناء رفض الطلب. يرجى المحاولة ثانية.');
    }
  };

  // Delete Request
  const handleDeleteRequest = async (id: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف طلب القانون "${title}"؟`)) {
      return;
    }

    setDeletingId(id);
    let success = false;

    try {
      const res = await fetch(`/api/law-requests/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success = true;
      }
    } catch (err) {
      console.warn('API delete notice, falling back to direct Firestore:', err);
    }

    if (!success) {
      try {
        const ok = await directDeleteLawRequestFromFirestore(id);
        if (ok) success = true;
      } catch (fErr) {
        console.error('Direct delete firestore error:', fErr);
      }
    }

    setDeletingId(null);

    if (success) {
      showNotification('success', 'تم حذف طلب القانون بنجاح.');
      await fetchRequests();
    } else {
      showNotification('error', 'تعذر حذف طلب القانون.');
    }
  };

  // Filtered list
  const filteredRequests = (requests || []).filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchCategory = (r.category || '').toLowerCase().includes(q);
      const matchContent = (r.content || '').toLowerCase().includes(q);
      const matchSubmitter = (r.userFullName || r.userName || '').toLowerCase().includes(q);
      const matchPhone = (r.userPhone || '').includes(q);
      const matchFile = (r.sourceFileName || '').toLowerCase().includes(q);
      return matchTitle || matchCategory || matchContent || matchSubmitter || matchPhone || matchFile;
    }
    return true;
  });

  const pendingCount = (requests || []).filter((r) => r.status === 'pending').length;
  const approvedCount = (requests || []).filter((r) => r.status === 'approved').length;
  const rejectedCount = (requests || []).filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-[#12281e] via-[#1a382b] to-[#12281e] rounded-2xl p-5 sm:p-6 text-white border border-[#275940] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#275940]/80 text-[#86efac] text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            بوابة الإشراف والرقابة التشريعية
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#d4af37]" />
            طلبات القوانين المقترحة من المستفيدين
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
            هنا تصل ملفات ومقترحات التشريعات المرفوعة من المستفيدين. يمكنك مراجعة النصوص القانونية بدقة، وتعديلها إذا لزم الأمر، ثم اعتمادها وإدراجها بضغطة زر في قاعدة المعرفة المعتمدة للمنظومة.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/20 shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
          تحديث الطلبات
        </button>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all shadow-md ${
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
              : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">إجمالي الطلبات</span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">{requests.length}</div>
          <div className="text-[11px] text-gray-500 mt-1">كافة المقترحات المرفوعة</div>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-amber-50/90 border-amber-500 shadow-sm ring-2 ring-amber-400/30'
              : 'bg-white border-gray-200 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">قيد المراجعة</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-950 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                بحاجة لقرارك
              </span>
            )}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">في انتظار مراجعة المشرف</div>
        </div>

        <div
          onClick={() => setFilterStatus('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'approved'
              ? 'bg-emerald-50/90 border-emerald-500 shadow-sm'
              : 'bg-white border-gray-200 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">معتمدة ومدرجة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-950">{approvedCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1">تم إدخالها بقاعدة المعرفة</div>
        </div>

        <div
          onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'rejected'
              ? 'bg-red-50/90 border-red-500 shadow-sm'
              : 'bg-white border-gray-200 hover:border-red-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800">طلبات مرفوضة</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-950">{rejectedCount}</div>
          <div className="text-[11px] text-red-700 mt-1">لم تستوفِ شروط الاعتماد</div>
        </div>
      </div>

      {/* Visual Analytics Dashboard Panel */}
      <div className="bg-gradient-to-br from-white via-emerald-50/20 to-white p-5 rounded-2xl border border-emerald-200/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">لوحة المؤشرات والتحليلات البيانية لملفات القوانين</h3>
              <p className="text-xs text-gray-500">متابعة نشاط الرفع اليومي، نسب الاعتماد، وحالة التدقيق التشريعي</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-300 text-xs font-bold">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>ملفات اليوم: <strong className="text-emerald-950 font-black">{requests.filter(r => r.createdAt && r.createdAt.startsWith(new Date().toISOString().split('T')[0])).length}</strong> ملف</span>
          </div>
        </div>

        {/* Visual Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending bar */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> بانتظار المراجعة
              </span>
              <span className="text-amber-900 font-black">
                {requests.length > 0 ? Math.round((pendingCount / requests.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${requests.length > 0 ? (pendingCount / requests.length) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-gray-500 flex justify-between">
              <span>{pendingCount} ملفات معلقة</span>
              <span>تحت التدقيق</span>
            </div>
          </div>

          {/* Approved bar */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> مقبولة ومعتمدة
              </span>
              <span className="text-emerald-900 font-black">
                {requests.length > 0 ? Math.round((approvedCount / requests.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${requests.length > 0 ? (approvedCount / requests.length) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-gray-500 flex justify-between">
              <span>{approvedCount} ملفات مدرجة</span>
              <span>في قاعدة المعرفة</span>
            </div>
          </div>

          {/* Rejected bar */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-red-800 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> مرفوضة
              </span>
              <span className="text-red-900 font-black">
                {requests.length > 0 ? Math.round((rejectedCount / requests.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${requests.length > 0 ? (rejectedCount / requests.length) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-gray-500 flex justify-between">
              <span>{rejectedCount} ملفات مرفوضة</span>
              <span>مخالفة للشروط</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالعنوان، التصنيف، اسم المستفيد، أو اسم الملف المرفوع..."
            className="w-full pr-10 pl-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#12281e] focus:border-transparent text-gray-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-bold text-gray-700">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-950'
              }`}
            >
              الكل ({requests.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'hover:text-amber-700'
              }`}
            >
              المعلقة ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:text-emerald-700'
              }`}
            >
              المعتمدة ({approvedCount})
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                filterStatus === 'rejected' ? 'bg-red-600 text-white shadow-xs' : 'hover:text-red-700'
              }`}
            >
              المرفوضة ({rejectedCount})
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#12281e]"
          >
            <option value="all">كافة التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-8 h-8 text-[#12281e] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">جاري تحميل طلبات القوانين من قاعدة البيانات السحابية...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">لا توجد طلبات قوانين تطابق البحث</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'جرّب تغيير خيارات التصفية أو البحث لعرض باقي الطلبات.'
              : 'لم يقم أي مستفيد برفع مقترحات قوانين جديدة حتى الآن.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'pending';
            const isApproved = req.status === 'approved';
            const isRejected = req.status === 'rejected';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs hover:shadow-md ${
                  isPending
                    ? 'border-amber-300 bg-amber-50/15 ring-1 ring-amber-200'
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-gray-200 opacity-90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left info column */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#12281e] text-[#86efac]">
                        {req.category || 'جمارك'}
                      </span>

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 animate-pulse" />
                          قيد المراجعة والتدقيق
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          معتمد ومدرج في قاعدة المعرفة
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          طلب مرفوض
                        </span>
                      )}

                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-950 leading-snug">
                      {req.title}
                    </h3>

                    {/* Submitter & Document Meta Box */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-600 bg-gray-50/90 p-2.5 rounded-xl border border-gray-200/80">
                      <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        <User className="w-3.5 h-3.5 text-[#12281e]" />
                        <span>مقدم الطلب:</span>
                        <strong className="text-gray-900">
                          {req.userFullName || req.userName || 'مستفيد مجهول'}
                        </strong>
                      </div>

                      {req.userPhone && (
                        <div className="flex items-center gap-1 font-medium text-gray-700">
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span dir="ltr">{req.userPhone}</span>
                        </div>
                      )}

                      {req.sourceFileName && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>الملف المرفوع: {req.sourceFileName}</span>
                          {req.sourceFileSize && (
                            <span className="text-[10px] text-gray-400">({req.sourceFileSize})</span>
                          )}
                        </div>
                      )}

                      {req.pageCount && (
                        <div className="text-[11px] text-gray-500">
                          {req.pageCount} صفحة
                        </div>
                      )}
                    </div>

                    {/* Submitter Note if any */}
                    {req.description && (
                      <div className="text-xs text-amber-900 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                        <strong>ملاحظة من مقدم الطلب:</strong> {req.description}
                      </div>
                    )}

                    {/* Rejection Note if any */}
                    {isRejected && req.rejectionReason && (
                      <div className="text-xs text-red-900 bg-red-50 p-2.5 rounded-lg border border-red-200">
                        <strong>سبب الرفض:</strong> {req.rejectionReason}
                      </div>
                    )}

                    {/* Reviewer signature */}
                    {req.reviewedBy && (
                      <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تمت المراجعة والتدقيق بواسطة: <strong>{req.reviewedBy}</strong></span>
                        {req.reviewedAt && (
                          <span>بتاريخ {new Date(req.reviewedAt).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    )}

                    {/* Excerpt */}
                    <div className="mt-2 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200 line-clamp-3 leading-relaxed whitespace-pre-wrap font-mono">
                      {req.content}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex lg:flex-col items-center lg:items-stretch gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedRequest(req);
                        setPreviewModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-1 lg:flex-initial"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      معاينة كامل النص
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => handleOpenApproveModal(req)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer flex-1 lg:flex-initial"
                        >
                          <Check className="w-4 h-4 text-[#86efac]" />
                          اعتماد وإدراج بقاعدة المعرفة
                        </button>

                        <button
                          onClick={() => handleOpenRejectModal(req)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-1 cursor-pointer flex-1 lg:flex-initial"
                        >
                          <X className="w-3.5 h-3.5" />
                          رفض الطلب
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => handleOpenApproveModal(req)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        تعديل وإعادة اعتماد
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteRequest(req.id, req.title)}
                      disabled={deletingId === req.id}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors self-center cursor-pointer disabled:opacity-40"
                      title="حذف هذا الطلب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Full Preview Modal */}
      {previewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#12281e] text-[#86efac]">
                  {selectedRequest.category}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedRequest.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  مقدم من: <strong>{selectedRequest.userFullName || selectedRequest.userName}</strong> • {selectedRequest.userPhone}
                </p>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
              {selectedRequest.content}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200"
              >
                إغلاق
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => {
                    setPreviewModalOpen(false);
                    handleOpenApproveModal(selectedRequest);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-[#86efac]" />
                  متابعة إلى الاعتماد والإدراج
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Approve & Insert to Knowledge Base Modal */}
      {approveModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    اعتماد وإدراج القانون في قاعدة المعرفة
                  </h3>
                  <p className="text-xs text-gray-500">
                    يمكنك مراجعة وتعديل العنوان أو التصنيف أو صياغة المواد قبل تثبيت القانون رسمياً.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  العنوان الرسمي للتشريع / القانون:
                </label>
                <input
                  type="text"
                  value={approveTitle}
                  onChange={(e) => setApproveTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  placeholder="مثال: قرار بقانون رقم (8) لسنة 2011م بشأن ضريبة الدخل..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  التصنيف المعتمد:
                </label>
                <select
                  value={approveCategory}
                  onChange={(e) => setApproveCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  النص الكامل للمواد والبنود القانونية (متاح للتحرير والتدقيق):
                </label>
                <textarea
                  value={approveContent}
                  onChange={(e) => setApproveContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                  placeholder="نص المواد القانونية..."
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  بمجرد الضغط على "تأكيد الاعتماد"، سيتم فوراً حفظ القانون في قاعدة بيانات Firestore، وربطه بمحرك الاسترجاع الذكي للبوت، وإشعار المشرفين.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setApproveModalOpen(false)}
                disabled={isApproving}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={isApproving}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارِ الحفظ والاعتماد...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#86efac]" />
                    تأكيد الاعتماد والإدراج الآن
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reject Modal */}
      {rejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">رفض مقترح القانون</h3>
                  <p className="text-xs text-gray-500">توضيح سبب الرفض إن وُجد</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-700 mb-2">
                هل أنت متأكد من رفض القانون المقترح: <strong className="text-gray-950">"{selectedRequest.title}"</strong>؟
              </p>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                سبب الرفض (اختياري، يظهر للمستفيد):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                placeholder="مثال: النص غير مكتمل، أو القانون منسوخ بتشريع أحدث، أو الملف غير رسمي..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={isRejecting}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
