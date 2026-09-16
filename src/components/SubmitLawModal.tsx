import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  FileUp,
  FileType,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Send,
  User,
  Phone,
  BookOpen,
  Info,
  Check,
  Calendar,
  Layers,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { User as UserType, LegalCategory, LawRequest } from '../types';
import { extractTextFromAnyDocument } from '../utils/documentParser';
import { formatBytes, sanitizeLawTitle, PDFProgress } from '../utils/pdfParser';
import {
  directSaveLawRequestToFirestore,
  directFetchLawRequestsFromFirestore,
} from '../services/clientFirestore';

interface SubmitLawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType | null;
  categories?: (LegalCategory | string)[];
  onSubmissionSuccess?: () => void;
}

export const SubmitLawModal: React.FC<SubmitLawModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  categories = [
    { id: '1', name: 'جمارك' },
    { id: '2', name: 'ضريبة دخل' },
    { id: '3', name: 'ضريبة قيمة مضافة' },
    { id: '4', name: 'رسوم ومكوس' },
  ],
  onSubmissionSuccess,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'submit' | 'my-requests'>('submit');

  // Form State
  const [lawTitle, setLawTitle] = useState('');
  const [lawCategory, setLawCategory] = useState('جمارك');
  const [lawContent, setLawContent] = useState('');
  const [submitterNotes, setSubmitterNotes] = useState('');
  const [submitterName, setSubmitterName] = useState(
    currentUser?.fullName || currentUser?.username || ''
  );
  const [submitterPhone, setSubmitterPhone] = useState(currentUser?.phone || '');

  // File Upload & Parsing State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parsingProgress, setParsingProgress] = useState<PDFProgress | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    fileName: string;
    fileSizeFormatted: string;
    pageCount: number;
  } | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // My Requests State
  const [myRequests, setMyRequests] = useState<LawRequest[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);

  // Daily upload limit state & calculation (protecting database and server)
  const DAILY_LIMIT = 40;
  const MAX_FILE_SIZE_MB = 40;
  const DAILY_TOTAL_MB_LIMIT = 800; // 800 MB total daily quota
  const todayDateStr = new Date().toISOString().split('T')[0];

  const getLocalTodayData = () => {
    try {
      const saved = localStorage.getItem('sanad_daily_uploads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayDateStr) {
          return { count: parsed.count || 0, totalBytes: parsed.totalBytes || 0 };
        }
      }
    } catch (e) {}
    return { count: 0, totalBytes: 0 };
  };

  const serverTodayRequests = myRequests.filter((r) => {
    if (!r.createdAt) return false;
    return r.createdAt.startsWith(todayDateStr);
  });
  const serverTodayCount = serverTodayRequests.length;

  const localData = getLocalTodayData();
  const todayUploadsCount = Math.max(serverTodayCount, localData.count);
  const totalUploadedBytesToday = localData.totalBytes;
  const totalUploadedMbToday = parseFloat((totalUploadedBytesToday / (1024 * 1024)).toFixed(1));

  const remainingUploads = Math.max(0, DAILY_LIMIT - todayUploadsCount);
  const isLimitReached = todayUploadsCount >= DAILY_LIMIT || totalUploadedMbToday >= DAILY_TOTAL_MB_LIMIT;

  // Update submitter info when user changes
  useEffect(() => {
    if (currentUser) {
      if (!submitterName) setSubmitterName(currentUser.fullName || currentUser.username);
      if (!submitterPhone && currentUser.phone) setSubmitterPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Fetch my requests
  const fetchMyRequests = async () => {
    setLoadingMyRequests(true);
    let list: LawRequest[] = [];

    if (currentUser) {
      try {
        const res = await fetch(`/api/law-requests?userId=${encodeURIComponent(currentUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.lawRequests && Array.isArray(data.lawRequests)) {
            list = data.lawRequests;
          }
        }
      } catch (err) {
        console.warn('API my law requests notice:', err);
      }
    }

    if (list.length === 0) {
      try {
        const allDirect = await directFetchLawRequestsFromFirestore();
        if (allDirect && allDirect.length > 0) {
          list = allDirect.filter(
            (r) =>
              (currentUser && (r.userId === currentUser.id || r.userName === currentUser.username))
          );
        }
      } catch (fErr) {
        console.error('Firestore my law requests error:', fErr);
      }
    }

    if (list.length === 0 && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('sanad_cached_law_requests');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed.filter(
              (r: any) =>
                (currentUser && (r.userId === currentUser.id || r.userName === currentUser.username))
            );
          }
        }
      } catch {}
    }

    setMyRequests(list);
    setLoadingMyRequests(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle File Selection and Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isValidExt =
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.pptx') ||
      lowerName.endsWith('.ppt') ||
      lowerName.endsWith('.txt');

    if (!isValidExt) {
      setFeedback({
        type: 'error',
        message: 'الصيغة غير مدعومة. يرجى اختيار ملف PDF أو Word أو نصي (TXT).',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: `حجم الملف يتجاوز الحد الأقصى المسموح (${MAX_FILE_SIZE_MB} ميجابايت). يرجى اختيار ملف أصغر.`,
      });
      return;
    }

    setSelectedFile(file);
    setIsParsingFile(true);
    setFeedback(null);
    setParsingProgress({ currentPage: 0, totalPages: 1, percent: 15, statusText: 'جاري فتح وقراءة محتوى الملف...' });

    try {
      const result = await extractTextFromAnyDocument(file, (prog) => {
        setParsingProgress(prog);
      });

      const cleanTitle = sanitizeLawTitle(result.suggestedTitle || file.name);
      setLawTitle(cleanTitle);

      if (result.suggestedCategory) {
        const match = categories.find((c) => {
          const catName = typeof c === 'string' ? c : c.name;
          return result.suggestedCategory?.toLowerCase().includes(catName.toLowerCase());
        });
        if (match) {
          setLawCategory(typeof match === 'string' ? match : match.name);
        }
      }

      setLawContent(result.text || '');
      setFileMeta({
        fileName: file.name,
        fileSizeFormatted: formatBytes(file.size),
        pageCount: result.numPages || 1,
      });

      setFeedback({
        type: 'success',
        message: `تم استخراج نصوص القانون من ملف "${file.name}" بنجاح! راجع البيانات وأرسلها للمشرفين.`,
      });
    } catch (err: any) {
      console.warn('Document parse notice:', err);
      const cleanTitle = sanitizeLawTitle(file.name);
      setLawTitle(cleanTitle);
      setFileMeta({
        fileName: file.name,
        fileSizeFormatted: formatBytes(file.size),
        pageCount: 1,
      });
      setFeedback({
        type: 'error',
        message: 'تعذر الاستخراج التلقائي الكامل للنصوص. يمكنك كتابة أو لصق مواد القانون يدوياً.',
      });
    } finally {
      setIsParsingFile(false);
      setParsingProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit Request Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!lawTitle.trim()) {
      setFeedback({ type: 'error', message: 'يرجى إدخال اسم أو عنوان القانون/التشريع.' });
      return;
    }

    if (!lawContent.trim()) {
      setFeedback({
        type: 'error',
        message: 'يرجى إدخال نصوص ومواد القانون أو رفع ملف يحتوي عليها.',
      });
      return;
    }

    if (todayUploadsCount >= DAILY_LIMIT) {
      setFeedback({
        type: 'error',
        message: `عذراً، لقد وصلت إلى الحد الأقصى المسموح به لرفع الملفات اليوم (${DAILY_LIMIT} ملف). يرجى المحاولة غداً.`,
      });
      return;
    }

    if (totalUploadedMbToday >= DAILY_TOTAL_MB_LIMIT) {
      setFeedback({
        type: 'error',
        message: `عذراً، لقد استهلكت الحصة التخزينية اليومية المسموحة (${DAILY_TOTAL_MB_LIMIT} ميجابايت). يرجى المحاولة غداً.`,
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: lawTitle.trim(),
      category: lawCategory,
      content: lawContent.trim(),
      description: submitterNotes.trim() || undefined,
      sourceFileName: fileMeta?.fileName || selectedFile?.name || undefined,
      sourceFileSize: fileMeta?.fileSizeFormatted || undefined,
      pageCount: fileMeta?.pageCount || undefined,
      userId: currentUser?.id,
      userName: currentUser?.username,
      userFullName: submitterName.trim() || currentUser?.fullName || currentUser?.username || 'مستفيد',
      userPhone: submitterPhone.trim() || currentUser?.phone || undefined,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let submitted = false;

    // 1. Send to server endpoint
    try {
      const res = await fetch('/api/law-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          submitted = true;
        }
      }
    } catch (apiErr) {
      console.warn('API law request submit notice, falling back to direct Firestore:', apiErr);
    }

    // 2. Direct Firestore fallback
    if (!submitted) {
      try {
        const ok = await directSaveLawRequestToFirestore(payload);
        if (ok) submitted = true;
      } catch (fErr) {
        console.error('Direct firestore submit law request error:', fErr);
      }
    }

    setIsSubmitting(false);

    if (submitted) {
      try {
        const currentData = getLocalTodayData();
        const currentCount = currentData.count + 1;
        const fileBytes = selectedFile ? selectedFile.size : 50 * 1024;
        const currentBytes = currentData.totalBytes + fileBytes;
        localStorage.setItem(
          'sanad_daily_uploads',
          JSON.stringify({ date: todayDateStr, count: currentCount, totalBytes: currentBytes })
        );

        // Update cached law requests list
        const cachedRaw = localStorage.getItem('sanad_cached_law_requests');
        let existingRequests: any[] = [];
        if (cachedRaw) {
          try {
            existingRequests = JSON.parse(cachedRaw);
          } catch {}
        }
        if (!Array.isArray(existingRequests)) existingRequests = [];
        const updated = [payload, ...existingRequests.filter((r) => r.id !== payload.id)];
        localStorage.setItem('sanad_cached_law_requests', JSON.stringify(updated));
      } catch (e) {}

      setFeedback({
        type: 'success',
        message: 'تم إرسال مقترح القانون بنجاح! سيقوم المشرفون بمراجعته وإدراجه في قاعدة المعرفة.',
      });
      // Reset form
      setLawTitle('');
      setLawContent('');
      setSubmitterNotes('');
      setSelectedFile(null);
      setFileMeta(null);
      onSubmissionSuccess?.();

      setTimeout(() => {
        setActiveSubTab('my-requests');
      }, 1500);
    } else {
      setFeedback({
        type: 'error',
        message: 'تعذر إرسال الطلب. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#12281e] via-[#1a382b] to-[#12281e] px-5 py-4 text-white flex items-center justify-between border-b border-[#275940]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shadow-xs">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                <span>رفع واقتراح قانون جديد</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#275940] text-[#86efac] font-bold">
                  خدمة المستفيدين
                </span>
              </h2>
              <p className="text-[11px] text-gray-300 mt-0.5">
                أرسل تشريعاً أو قراراً قانونياً ليصل مباشرة إلى هيئة الإشراف لاعتماده
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs (تقديم جديد / طلباتي السابقة) */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-5 pt-2 gap-2 text-xs font-bold text-gray-700">
          <button
            onClick={() => setActiveSubTab('submit')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'submit'
                ? 'border-[#12281e] text-[#12281e]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileUp className="w-4 h-4" />
            تقديم مقترح قانون جديد
          </button>

          {currentUser && (
            <button
              onClick={() => setActiveSubTab('my-requests')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'my-requests'
                  ? 'border-[#12281e] text-[#12281e]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              متابعة طلباتي السابقة
              {myRequests.length > 0 && (
                <span className="bg-gray-200 text-gray-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {myRequests.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Notification feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-red-50 text-red-900 border border-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {activeSubTab === 'submit' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Daily Upload Counter & Database Protection Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {DAILY_LIMIT - todayUploadsCount}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      <span>عداد الرفع اليومي (حماية الخادم وقاعدة البيانات)</span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5 space-y-0.5">
                      <div>تم استهلاك {todayUploadsCount} من أصل {DAILY_LIMIT} ملف مسموح اليوم</div>
                      <div className="text-[10px] text-emerald-700 font-medium">
                        الحصة التخزينية المستخدمة: {totalUploadedMbToday} ميجابايت من أصل {DAILY_TOTAL_MB_LIMIT} ميجابايت (الحد الأقصى للملف الواحد: {MAX_FILE_SIZE_MB} ميجابايت)
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                      isLimitReached
                        ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {isLimitReached ? 'تم بلوغ الحد الأقصى' : `متبقي ${remainingUploads} ملف`}
                  </span>
                </div>
              </div>

              {isLimitReached && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    عذراً، لقد وصلت إلى الحد الأقصى المسموح به لرفع الملفات أو الحصة التخزينية اليومية ({DAILY_LIMIT} ملف أو {DAILY_TOTAL_MB_LIMIT} ميجابايت) للحفاظ على استقرار الخادم وقاعدة البيانات. يرجى المحاولة غداً.
                  </p>
                </div>
              )}

              {/* Informative Guidance Banner */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  يمكنك رفع ملف القانون (PDF أو Word) ليقوم النظام باستخراج نصوصه تلقائياً، أو كتابة اسم القانون والمواد يدوياً. سيصل طلبك إلى <strong>لوحة تحكم المشرفين</strong> للتدقيق والاعتماد قبل دمجه في قاعدة المعرفة.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                  disabled={isLimitReached}
                  className="hidden"
                />
                <div
                  onClick={() => {
                    if (!isLimitReached) fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
                    isLimitReached
                      ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/40 cursor-pointer'
                      : 'border-gray-300 hover:border-[#12281e] bg-gray-50 hover:bg-gray-100/70 cursor-pointer'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-white text-[#12281e] shadow-xs flex items-center justify-center mx-auto mb-2 border border-gray-200">
                    <UploadCloud className="w-6 h-6 text-[#12281e]" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                    {selectedFile ? selectedFile.name : 'اضغط لاختيار أو إفلات ملف القانون (PDF / Word / TXT)'}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {fileMeta
                      ? `الحجم: ${fileMeta.fileSizeFormatted} • عدد الصفحات المقدر: ${fileMeta.pageCount}`
                      : 'يدعم كافة صيغ المستندات الرسمية حتى 150 ميجابايت'}
                  </p>
                </div>
              </div>

              {/* Parsing Progress Bar */}
              {isParsingFile && parsingProgress && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 animate-pulse">
                  <div className="flex justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {parsingProgress.statusText}
                    </span>
                    <span>{parsingProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${parsingProgress.percent}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    اسم القانون / التشريع <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lawTitle}
                    onChange={(e) => setLawTitle(e.target.value)}
                    placeholder="مثال: قانون الجمارك رقم 1 لسنة 2026..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#12281e] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    الجهة / التصنيف <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={lawCategory}
                    onChange={(e) => setLawCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#12281e] focus:outline-none"
                  >
                    {categories.map((c, idx) => {
                      const id = typeof c === 'string' ? `cat-${idx}` : c.id;
                      const name = typeof c === 'string' ? c : c.name;
                      return (
                        <option key={id} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Content Field */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center justify-between">
                  <span>
                    نصوص المواد والقرارات القانونية <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-gray-500">
                    {lawContent ? `${lawContent.length} حرف` : 'مستخرج تلقائياً أو مدخل يدوياً'}
                  </span>
                </label>
                <textarea
                  value={lawContent}
                  onChange={(e) => setLawContent(e.target.value)}
                  rows={6}
                  placeholder="المادة (1): ...&#10;المادة (2): ...&#10;اكتب أو الصق نصوص المواد القانونية هنا..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#12281e] focus:outline-none leading-relaxed"
                  required
                />
              </div>

              {/* Submitter Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    اسم مقدم المقترح:
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="اسمك الكامل أو صفتك"
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#12281e] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    رقم الهاتف / للتواصل (اختياري):
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={submitterPhone}
                      onChange={(e) => setSubmitterPhone(e.target.value)}
                      placeholder="059xxxxxxx"
                      dir="ltr"
                      className="w-full pr-8 pl-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-[#12281e] focus:outline-none text-right"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    ملاحظات أو توضيحات إضافية للمشرفين (اختياري):
                  </label>
                  <input
                    type="text"
                    value={submitterNotes}
                    onChange={(e) => setSubmitterNotes(e.target.value)}
                    placeholder="مثال: هذا التعديل صدر بالجريدة الرسمية رقم 200 لسنة 2026..."
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-[#12281e] focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isParsingFile}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جارِ إرسال المقترح...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      إرسال الطلب لهيئة الإشراف
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Tab: My Previous Requests */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-800">
                  سجل طلبات القوانين المقدمة من قبلك:
                </h3>
                <button
                  onClick={fetchMyRequests}
                  disabled={loadingMyRequests}
                  className="text-xs font-semibold text-[#12281e] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingMyRequests ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
              </div>

              {loadingMyRequests ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#12281e]" />
                  جاري تحميل طلباتك...
                </div>
              ) : myRequests.length === 0 ? (
                <div className="py-12 px-4 text-center bg-gray-50 rounded-2xl border border-gray-200">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">لم تقدم أي مقترحات قوانين حتى الآن.</p>
                  <button
                    onClick={() => setActiveSubTab('submit')}
                    className="mt-3 px-3.5 py-1.5 bg-[#12281e] text-white text-xs font-bold rounded-lg hover:bg-[#1a382b]"
                  >
                    تقديم أول مقترح الآن
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {myRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-950 text-xs sm:text-sm">
                          {req.title}
                        </span>
                        {req.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5 animate-pulse" />
                            قيد المراجعة
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            معتمد ومدرج
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-900 border border-red-300 flex items-center gap-1 shrink-0">
                            <XCircle className="w-3 h-3 text-red-600" />
                            مرفوض
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>التصنيف: <strong>{req.category}</strong></span>
                        <span>•</span>
                        <span>
                          تاريخ التقديم: {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>

                      {req.rejectionReason && req.status === 'rejected' && (
                        <div className="p-2 bg-red-50 text-red-900 rounded-lg text-[11px] border border-red-200">
                          <strong>سبب الرفض:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
