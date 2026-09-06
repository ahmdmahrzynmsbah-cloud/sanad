import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  Phone,
  Calendar,
  Clock,
  Shield,
  KeyRound,
  User as UserIcon,
  Crown,
  Snowflake,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ExternalLink,
  Lock,
  Hash,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { User } from '../../types';

interface UserDetailsModalProps {
  user: User | null;
  onClose: () => void;
  onToggleSubscription?: (user: User) => void;
  onOpenExtendTrial?: (user: User) => void;
  onToggleFreeze?: (user: User) => void;
  onUpdateStatus?: (userId: string, status: 'approved' | 'rejected') => void;
  defaultTrialDays?: number;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onClose,
  onToggleSubscription,
  onOpenExtendTrial,
  onToggleFreeze,
  onUpdateStatus,
  defaultTrialDays = 7,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!user) return null;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const isUserFrozen = user.status === 'frozen' || user.subscriptionStatus === 'frozen';

  // Format full date and time in Arabic with seconds
  const formatFullDateTime = (dateStr?: string) => {
    if (!dateStr) return 'غير متوفر';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'غير متوفر';
      return d.toLocaleString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Format relative time (e.g., منذ 3 ساعات)
  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'منذ يوم';
      if (diffDays === 2) return 'منذ يومين';
      if (diffDays <= 10) return `منذ ${diffDays} أيام`;
      return `منذ ${diffDays} يوماً`;
    } catch {
      return '';
    }
  };

  // WhatsApp clean link
  const cleanPhone = (user.phone || '').replace(/[^\d+]/g, '');
  const whatsappNumber = cleanPhone.startsWith('+')
    ? cleanPhone.replace('+', '')
    : cleanPhone.startsWith('00')
    ? cleanPhone.replace(/^00/, '')
    : cleanPhone.startsWith('0')
    ? `970${cleanPhone.slice(1)}` // default Palestine prefix if local 059...
    : cleanPhone;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/65 backdrop-blur-sm">
        {/* Backdrop motion click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-white rounded-2xl sm:rounded-3xl border border-gray-200/90 shadow-2xl w-full max-w-2xl overflow-hidden z-10 my-auto text-right max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0d2116] via-[#143224] to-[#0d2116] text-white px-5 sm:px-6 py-4 sm:py-5 shrink-0 border-b border-white/10 relative overflow-hidden">
            {/* Background luxury accent */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {/* User Avatar Initials */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1b5e3a] to-[#0f3420] border-2 border-emerald-400/40 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                  {(user.fullName || user.username).slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      {user.fullName || user.username}
                    </h2>
                    {user.isSubscribed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        <Crown className="w-3 h-3 text-amber-300" />
                        مشترك دائم
                      </span>
                    )}
                    {isUserFrozen && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40">
                        <Snowflake className="w-3 h-3 text-purple-300" />
                        حساب مجمد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-300 font-mono mt-0.5 flex items-center gap-1.5">
                    <span>@{user.username}</span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/70 font-sans text-[11px]">
                      {user.role === 'admin' ? 'مشرف إدارة مركزية' : 'مكلف / مراجع جمركي'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                id="close-user-details-modal"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {/* Section 1: بيانات الدخول والاعتماد الحساسة (Credentials) */}
            <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>بيانات الدخول والاعتماد (خاص بالإدارة)</span>
                </div>
                <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  سرّي ومحمي
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password Field */}
                <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1.5">
                    <span className="font-bold flex items-center gap-1 text-gray-700">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      كلمة المرور المسجلة:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>إخفاء</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>إظهار</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-amber-50/70 px-3 py-2 rounded-lg border border-amber-200/70 font-mono text-xs">
                    <span className="font-bold text-gray-900 tracking-wider">
                      {user.password ? (
                        showPassword ? user.password : '••••••••••••'
                      ) : (
                        <span className="text-gray-400 font-sans text-[11px]">غير مسجلة (تسجيل خارجي)</span>
                      )}
                    </span>
                    {user.password && (
                      <button
                        type="button"
                        onClick={() => handleCopy(user.password || '', 'password')}
                        className="p-1 rounded-md hover:bg-amber-200/60 text-amber-800 transition-colors cursor-pointer"
                        title="نسخ كلمة المرور"
                      >
                        {copiedKey === 'password' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                            تم النسخ
                          </span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Username Field */}
                <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1.5">
                    <span className="font-bold flex items-center gap-1 text-gray-700">
                      <UserIcon className="w-3.5 h-3.5 text-amber-600" />
                      اسم المستخدم (الدخول):
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-amber-50/70 px-3 py-2 rounded-lg border border-amber-200/70 font-mono text-xs">
                    <span className="font-bold text-gray-900">@{user.username}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user.username, 'username')}
                      className="p-1 rounded-md hover:bg-amber-200/60 text-amber-800 transition-colors cursor-pointer"
                      title="نسخ اسم المستخدم"
                    >
                      {copiedKey === 'username' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          تم النسخ
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Recovery Code (if present) */}
                {user.recoveryCode && (
                  <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs sm:col-span-2">
                    <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1.5">
                      <span className="font-bold flex items-center gap-1 text-gray-700">
                        <Shield className="w-3.5 h-3.5 text-amber-600" />
                        كود أمان استرداد الحساب (Recovery Code):
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-amber-50/70 px-3 py-2 rounded-lg border border-amber-200/70 font-mono text-xs">
                      <span className="font-bold text-amber-900 tracking-widest">{user.recoveryCode}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(user.recoveryCode || '', 'recoveryCode')}
                        className="p-1 rounded-md hover:bg-amber-200/60 text-amber-800 transition-colors cursor-pointer"
                        title="نسخ كود الاسترداد"
                      >
                        {copiedKey === 'recoveryCode' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                            تم النسخ
                          </span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: البيانات الشخصية ومعلومات الاتصال (Personal & Contact) */}
            <div className="bg-gray-50/90 border border-gray-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-xs">
                  <UserIcon className="w-4 h-4 text-emerald-700" />
                  <span>البيانات الشخصية ووسائل الاتصال</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-[11px] text-gray-400 block mb-1">الاسم الكامل:</span>
                  <span className="font-bold text-gray-900 text-sm block">
                    {user.fullName || 'غير محدد'}
                  </span>
                </div>

                {/* Account ID */}
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>معرف الحساب (ID):</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user.id, 'userId')}
                      className="text-gray-500 hover:text-gray-800 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'userId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      نسخ
                    </button>
                  </div>
                  <span className="font-mono text-gray-700 text-[11px] block truncate" title={user.id}>
                    {user.id}
                  </span>
                </div>

                {/* Phone Number with actions */}
                <div className="bg-white p-3 rounded-xl border border-gray-200 sm:col-span-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                    <span className="flex items-center gap-1 text-gray-700 font-bold">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      رقم الجوال المسجل:
                    </span>
                    {user.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(user.phone || '', 'phone')}
                        className="text-emerald-800 hover:text-emerald-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'phone' ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> تم النسخ
                          </span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ الرقم</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <span className="font-mono font-bold text-gray-900 text-sm" dir="ltr">
                      {user.phone || 'لم يتم إدخال رقم هاتف'}
                    </span>

                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>واتساب</span>
                        </a>
                        <a
                          href={`tel:${user.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>اتصال مباشر</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: السجل الزمني والتواريخ الدقيقة (Detailed Timestamps) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-blue-700" />
                  <span>السجل الزمني وتواريخ الحساب بالثواني</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Exact Registration Date */}
                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-gray-500 font-bold text-[11px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      تاريخ ووقت التسجيل في المنصة:
                    </span>
                    <p className="text-gray-900 font-bold text-xs font-mono">
                      {formatFullDateTime(user.createdAt)}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-800 font-bold shrink-0">
                    {getRelativeTime(user.createdAt)}
                  </span>
                </div>

                {/* Review & Approval Date (if present) */}
                {user.reviewedAt && (
                  <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-gray-500 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        تاريخ مراجعة واعتماد الحساب:
                      </span>
                      <p className="text-gray-900 font-bold text-xs font-mono">
                        {formatFullDateTime(user.reviewedAt)}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 font-bold shrink-0">
                      {getRelativeTime(user.reviewedAt)}
                    </span>
                  </div>
                )}

                {/* Subscription Start Date (if present) */}
                {user.subscribedAt && (
                  <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-gray-500 font-bold text-[11px] flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                        تاريخ تفعيل الاشتراك الدائم:
                      </span>
                      <p className="text-gray-900 font-bold text-xs font-mono">
                        {formatFullDateTime(user.subscribedAt)}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-800 font-bold shrink-0">
                      {getRelativeTime(user.subscribedAt)}
                    </span>
                  </div>
                )}

                {/* Frozen Date & Reason (if frozen) */}
                {isUserFrozen && (
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-900 font-bold text-[11px] flex items-center gap-1">
                        <Snowflake className="w-3.5 h-3.5 text-purple-600" />
                        تاريخ تجميد الحساب:
                      </span>
                      <span className="text-[10px] text-purple-700 font-mono">
                        {formatFullDateTime(user.frozenAt)}
                      </span>
                    </div>
                    {user.freezeReason && (
                      <p className="text-[11px] text-purple-800 bg-white/70 p-2 rounded-lg border border-purple-100">
                        <span className="font-bold">سبب التجميد: </span>
                        {user.freezeReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: وضع الاشتراك الحالي والفترة التجريبية (Subscription / Trial Status) */}
            <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-2.5">
              <span className="text-gray-500 font-bold text-[11px] block">
                ملخص الوضع الحالي للصلاحية والشات الذكي:
              </span>

              {user.isSubscribed ? (
                <div className="bg-emerald-100/60 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-950 text-xs">اشتراك دائم ومفتوح</h4>
                      <p className="text-[10px] text-emerald-800">الحساب يمتلك صلاحية كاملة لاستخدام المساعد الذكي دون قيود زمنية</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                    نشط دائماً
                  </span>
                </div>
              ) : isUserFrozen ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                      <Snowflake className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-950 text-xs">الحساب مجمد حالياً</h4>
                      <p className="text-[10px] text-red-800">تم حجب الوصول للشات لحين تفعيل الاشتراك الدائم أو التمديد</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-700 text-white">
                    مجمد
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-950 text-xs">فترة تجريبية سارية</h4>
                      <p className="text-[10px] text-amber-800">
                        متبقي {user.remainingTrialDays ?? user.trialDays ?? defaultTrialDays} يوم و{' '}
                        {user.remainingTrialHours ?? 0} ساعة
                      </p>
                    </div>
                  </div>
                  {user.trialEndsAt && (
                    <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded-md">
                      ينتهي: {new Date(user.trialEndsAt).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Quick Actions */}
          <div className="bg-gray-50 px-5 sm:px-6 py-3.5 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* If pending: quick accept/reject */}
              {user.status === 'pending' && onUpdateStatus && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(user.id, 'approved');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>قبول واعتماد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(user.id, 'rejected');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>رفض الحساب</span>
                  </button>
                </>
              )}

              {/* Toggle subscription */}
              {onToggleSubscription && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSubscription(user);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs ${
                    user.isSubscribed
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>{user.isSubscribed ? 'إلغاء الاشتراك' : 'تفعيل اشتراك دائم'}</span>
                </button>
              )}

              {/* Extend trial */}
              {onOpenExtendTrial && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenExtendTrial(user);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>تمديد التجربة</span>
                </button>
              )}

              {/* Toggle freeze */}
              {onToggleFreeze && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleFreeze(user);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isUserFrozen
                      ? 'bg-purple-700 hover:bg-purple-800 text-white'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>{isUserFrozen ? 'فك التجميد' : 'تجميد الحساب'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
