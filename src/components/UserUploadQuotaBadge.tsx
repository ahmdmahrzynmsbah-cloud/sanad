import React, { useState, useEffect } from 'react';
import {
  FileUp,
  HardDrive,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  X,
  Layers,
} from 'lucide-react';
import { User, LawRequest } from '../types';

interface UserUploadQuotaBadgeProps {
  currentUser?: User;
  onOpenSubmitLaw?: () => void;
  className?: string;
  compact?: boolean;
}

export const UserUploadQuotaBadge: React.FC<UserUploadQuotaBadgeProps> = ({
  currentUser,
  onOpenSubmitLaw,
  className = '',
  compact = false,
}) => {
  const DAILY_FILES_LIMIT = 40;
  const DAILY_STORAGE_LIMIT_MB = 800; // 800 MB daily limit
  const todayDateStr = new Date().toISOString().split('T')[0];

  const [isOpen, setIsOpen] = useState(false);
  const [uploadsCount, setUploadsCount] = useState<number>(0);
  const [usedBytes, setUsedBytes] = useState<number>(0);

  const calculateQuota = () => {
    let localCount = 0;
    let localBytes = 0;

    // 1. Read from local storage tracking
    try {
      const saved = localStorage.getItem('sanad_daily_uploads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayDateStr) {
          localCount = parsed.count || 0;
          localBytes = parsed.totalBytes || 0;
        }
      }
    } catch {}

    // 2. Cross-check with cached law requests
    let cachedRequestsCount = 0;
    try {
      const cached = localStorage.getItem('sanad_cached_law_requests');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const userTodayReqs = parsed.filter((r: LawRequest) => {
            const isToday = r.createdAt && r.createdAt.startsWith(todayDateStr);
            const isUser = currentUser
              ? r.userId === currentUser.id || r.userName === currentUser.username
              : true;
            return isToday && isUser;
          });
          cachedRequestsCount = userTodayReqs.length;
        }
      }
    } catch {}

    const totalCount = Math.max(localCount, cachedRequestsCount);
    // If bytes were 0 but count > 0, estimate ~2.5 MB average per file
    const effectiveBytes = localBytes > 0 ? localBytes : totalCount * 2.5 * 1024 * 1024;

    setUploadsCount(totalCount);
    setUsedBytes(effectiveBytes);
  };

  useEffect(() => {
    calculateQuota();

    // Listen for custom upload update events and storage changes
    const handleUpdate = () => calculateQuota();
    window.addEventListener('sanad_uploads_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Refresh every 30 seconds
    const interval = setInterval(calculateQuota, 30000);

    return () => {
      window.removeEventListener('sanad_uploads_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(interval);
    };
  }, [currentUser, todayDateStr]);

  const usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(1));
  const remainingMb = Math.max(0, parseFloat((DAILY_STORAGE_LIMIT_MB - usedMb).toFixed(1)));
  const remainingFiles = Math.max(0, DAILY_FILES_LIMIT - uploadsCount);
  const filePercentage = Math.min(100, Math.round((uploadsCount / DAILY_FILES_LIMIT) * 100));
  const storagePercentage = Math.min(100, Math.round((usedMb / DAILY_STORAGE_LIMIT_MB) * 100));

  // Determine smart severity level
  const isLimitReached = uploadsCount >= DAILY_FILES_LIMIT || usedMb >= DAILY_STORAGE_LIMIT_MB;
  const isCritical = (remainingFiles <= 2 || remainingMb <= 30 || isLimitReached) && uploadsCount > 0;
  const isApproaching = (remainingFiles <= 10 || filePercentage >= 75) && !isCritical && uploadsCount > 0;

  return (
    <div className={`relative inline-block ${className}`} id="user-upload-quota-container">
      {/* Trigger Button / Badge */}
      <button
        id="user-upload-quota-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-2xs cursor-pointer select-none min-h-[36px] ${
          isLimitReached
            ? 'bg-rose-50 text-rose-950 border-rose-300 hover:bg-rose-100/80 hover:border-rose-400'
            : isCritical
            ? 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100 hover:border-rose-400 animate-pulse'
            : isApproaching
            ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100/80 hover:border-amber-400'
            : 'bg-emerald-50/70 text-emerald-950 border-emerald-200/80 hover:bg-emerald-100/80 hover:border-emerald-300'
        }`}
        title="حصة الرفع والمساحة التخزينية اليومية"
      >
        {/* Status Indicator Icon */}
        <div className="shrink-0 flex items-center justify-center">
          {isLimitReached ? (
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          ) : isCritical ? (
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
          ) : isApproaching ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <FileUp className="w-3.5 h-3.5 text-emerald-700" />
          )}
        </div>

        {/* Text Content */}
        <div className="flex items-center gap-1.5 text-right">
          {isApproaching ? (
            <span className="inline-flex items-center gap-1 text-amber-800 font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              <span>اقتربت من الحد ({uploadsCount}/{DAILY_FILES_LIMIT})</span>
            </span>
          ) : isCritical ? (
            <span className="inline-flex items-center gap-1 text-rose-800 font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>{isLimitReached ? 'اكتملت الحصة' : 'أوشكت الحصة'} ({uploadsCount}/{DAILY_FILES_LIMIT})</span>
            </span>
          ) : (
            <span className="text-zinc-800">
              <span className="font-semibold text-emerald-900">{uploadsCount}</span>
              <span className="text-zinc-400 text-[10px]">/{DAILY_FILES_LIMIT}</span>
              <span className="text-[10px] text-zinc-600 mr-0.5">ملف اليوم</span>
            </span>
          )}

          {/* Remaining Storage Badge */}
          <span
            className={`hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-mono border ${
              isCritical
                ? 'bg-rose-100 text-rose-900 border-rose-200'
                : isApproaching
                ? 'bg-amber-100 text-amber-900 border-amber-200'
                : 'bg-emerald-100/70 text-emerald-800 border-emerald-200/60'
            }`}
          >
            <HardDrive className="w-2.5 h-2.5 shrink-0" />
            <span>{remainingMb} MB متبقية</span>
          </span>
        </div>

        {/* Mini Micro-Progress Bar */}
        <div className="hidden sm:block w-8 bg-zinc-200 h-1.5 rounded-full overflow-hidden shrink-0 border border-zinc-300/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCritical ? 'bg-rose-500' : isApproaching ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.max(5, filePercentage)}%` }}
          />
        </div>

        <ChevronDown
          className={`w-3 h-3 text-zinc-400 group-hover:text-zinc-700 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Detailed Popover Card */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          <div
            id="upload-quota-details-popover"
            className="absolute left-0 sm:left-auto right-auto sm:right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-zinc-300/80 p-4 z-50 text-right text-zinc-800 animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    isCritical
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : isApproaching
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 leading-none">
                    حصة الرفع والمساحة اليومية
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    تتجدد تلقائياً كل 24 ساعة (12:00 ص)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Smart Alert Message Banner if Approaching or Critical */}
            {isApproaching && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">تنبيه: اقتربت من بلوغ الحد اليومي!</span>
                  <span>
                    لقد رفعت <strong>{uploadsCount}</strong> ملفاً من أصل <strong>{DAILY_FILES_LIMIT}</strong>. متبقي لك <strong>{remainingFiles}</strong> ملفات فقط اليوم.
                  </span>
                </div>
              </div>
            )}

            {isCritical && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    {isLimitReached ? '⛔ تم استهلاك الحصة اليومية بالكامل' : '⚠️ أوشكت الحصة على النفاد تماماً!'}
                  </span>
                  <span>
                    {isLimitReached
                      ? 'وصلت إلى الحد الأقصى (40 ملفاً/يوم). ستتمكن من رفع ملفات جديدة عند منتصف الليل.'
                      : `متبقي لك ${remainingFiles} ملف فقط ومساحة ${remainingMb} MB. تجنب تجاوز الحد لتفادي الرفض التلقائي.`}
                  </span>
                </div>
              </div>
            )}

            {!isApproaching && !isCritical && (
              <div className="mb-3.5 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>حالتك ممتازة، لديك متسع كافٍ لرفع واقتراح القوانين اليوم.</span>
              </div>
            )}

            {/* 1. Files Quota Progress */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 flex items-center gap-1">
                  <FileUp className="w-3.5 h-3.5 text-emerald-700" />
                  عدد الملفات المرفوعة اليوم:
                </span>
                <span className="font-bold text-zinc-900">
                  {uploadsCount} <span className="text-zinc-400 font-normal">/ {DAILY_FILES_LIMIT} ملف</span>
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCritical ? 'bg-rose-600' : isApproaching ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.max(4, filePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>المستهلك: {filePercentage}%</span>
                <span>المتبقي: {remainingFiles} ملف</span>
              </div>
            </div>

            {/* 2. Storage Quota Progress */}
            <div className="space-y-1.5 mb-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-600" />
                  المساحة التخزينية اليومية:
                </span>
                <span className="font-bold text-zinc-900">
                  {usedMb} <span className="text-zinc-400 font-normal">/ {DAILY_STORAGE_LIMIT_MB} MB</span>
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storagePercentage > 85 ? 'bg-rose-600' : storagePercentage > 65 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.max(4, storagePercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>المستهلك: {usedMb} ميجابايت</span>
                <span className="font-bold text-emerald-700">المتبقي: {remainingMb} ميجابايت</span>
              </div>
            </div>

            {/* Information note */}
            <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-200 text-[10px] text-zinc-600 space-y-1 mb-3">
              <div className="flex items-center gap-1 text-zinc-700 font-semibold">
                <Info className="w-3 h-3 text-emerald-700" />
                <span>ضوابط رفع القوانين والمستندات:</span>
              </div>
              <p>• الحد الأقصى للملف الواحد: 40 ميجابايت (PDF أو نصوص).</p>
              <p>• يتم تدقيق المستندات المرفوعة من قبل المشرفين قبل إدراجها بالقاعدة.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {onOpenSubmitLaw && (
                <button
                  id="popover-submit-law-action-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSubmitLaw();
                  }}
                  disabled={isLimitReached}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    isLimitReached
                      ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                      : 'bg-emerald-900 hover:bg-emerald-800 text-white active:bg-emerald-950'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>اقتراح أو رفع قانون جديد</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
