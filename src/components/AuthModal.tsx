import React, { useState } from 'react';
import {
  UserCheck,
  UserPlus,
  Clock,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RefreshCw,
  Phone,
  User as UserIcon,
  KeyRound,
  Eye,
  EyeOff,
  HelpCircle,
  Scale,
  ShieldCheck,
  BookOpen,
  Building2,
  FileCheck2,
  ArrowRight,
  Sparkles,
  Server
} from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
  onGoToAdminLogin: () => void;
  initialMode?: 'login' | 'register';
  onBackToHome?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onGoToAdminLogin,
  initialMode = 'login',
  onBackToHome,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Common fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register specific fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');

  // Forgot password specific fields
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetRecoveryCode, setResetRecoveryCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // UI status states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingStatusUser, setPendingStatusUser] = useState<{ username: string } | null>(null);
  const [rejectedUser, setRejectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetStates = () => {
    setError(null);
    setSuccessMessage(null);
    setPendingStatusUser(null);
    setRejectedUser(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();

    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم أو رقم الجوال، وكلمة المرور.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === 'pending') {
          setPendingStatusUser({ username: data.username || username });
        } else if (data.status === 'rejected') {
          setRejectedUser(data.username || username);
        } else {
          setError(data.error || 'فشل تسجيل الدخول، تأكد من صحة البيانات.');
        }
        return;
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();

    if (!fullName.trim()) {
      setError('يرجى إدخال الاسم الكامل الثلاثي أو الرباعي.');
      return;
    }

    if (!phone.trim()) {
      setError('يرجى إدخال رقم الجوال.');
      return;
    }

    if (!username.trim()) {
      setError('يرجى تحديد اسم مستخدم لتسجيل الدخول.');
      return;
    }

    if (username.trim().length < 3) {
      setError('يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل.');
      return;
    }

    if (!password || password.length < 4) {
      setError('يجب ألا تقل كلمة المرور عن 4 خانات.');
      return;
    }

    if (!recoveryCode.trim()) {
      setError('يرجى كتابة رمز سري لتعيين واستعادة كلمة المرور في حال نسيانها.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          username: username.trim(),
          password,
          recoveryCode: recoveryCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشل إنشاء الحساب، يرجى التحقق من البيانات.');
        return;
      }

      if (data.isAutoApproved) {
        setSuccessMessage(
          'تم إنشاء الحساب واعتماده تلقائياً بنجاح! تم حفظ وتأكيد بياناتك في السحابة، يمكنك الآن تسجيل الدخول مباشرة.'
        );
        setPassword('');
        setTimeout(() => {
          setMode('login');
        }, 1600);
      } else {
        setSuccessMessage(
          'تم تقديم طلب التسجيل بنجاح! تم حفظ بياناتك ورمز الأمان في قاعدة البيانات السحابية. حسابك حالياً في حالة "قيد المراجعة الإدارية".'
        );
        setPendingStatusUser({ username: username.trim() });
        setPassword('');
      }
    } catch (err: any) {
      setError('تعذر الاتصال بالخادم أثناء التسجيل.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();

    if (!resetIdentifier.trim()) {
      setError('يرجى إدخال اسم المستخدم أو رقم الجوال المسجل.');
      return;
    }

    if (!resetRecoveryCode.trim()) {
      setError('يرجى إدخال رمز الأمان واستعادة كلمة المرور الذي حددته عند التسجيل.');
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 4) {
      setError('يجب ألا تقل كلمة المرور الجديدة عن 4 خانات.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setError('كلمتا المرور غير متطابقتين، يرجى التحقق.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          recoveryCode: resetRecoveryCode.trim(),
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'فشلت عملية تعيين كلمة المرور، يرجى التأكد من صحة رمز الأمان.');
        return;
      }

      setSuccessMessage('تم تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بها.');
      setUsername(resetIdentifier.trim());
      setPassword('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setResetRecoveryCode('');
      setMode('login');
    } catch (err: any) {
      setError('تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-2 px-3 sm:px-6">
      {/* Split-Screen Enterprise Government Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        
        {/* RIGHT SIDE: Deep Olive Executive Brand Banner (LG: 5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0b1f1a] via-[#0f2a24] to-[#081814] text-white p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-l border-[#1a3f36]">
          {/* Subtle Ambient Glows & Grid Pattern */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* Top Brand Block */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg text-[#d4af37]">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-white">دولة فلسطين</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    رسمي
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-light mt-0.5">
                  وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
                بوابة المستفيدين <br />
                <span className="text-[#a7d9c0]">والاستعلام الجمركي والضريبي</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal">
                منظومة وطنية ذكية توفر فتاوى وحسابات مخصصة استناداً إلى قرارات بقانون واللوائح التنفيذية النافذة في فلسطين.
              </p>
            </div>

            {/* Value Points Pill Highlights */}
            <div className="mt-8 space-y-3 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span>تشريعات محيّنة ومفهرسة بنصوص المواد الرسمية</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>تدقيق واعتماد أمني ورقابي للحسابات المصرح لها</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <span>حفظ وتزامن سحابي فوري عبر Cloud Firestore</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              اتصال مشفر ومؤمّن
            </span>
            <span>بوابة المكلّفين والمراجعين</span>
          </div>
        </div>

        {/* LEFT SIDE: Clean Modern Auth Card (LG: 7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-9 flex flex-col justify-between">
          <div>
            {/* Header with Segmented Control Tab Switcher */}
            {mode !== 'forgot' ? (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {mode === 'login' ? 'تسجيل الدخول للنظام' : 'تقديم طلب حساب جديد'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {mode === 'login'
                        ? 'أدخل بيانات اعتمادك المعتمدة للمتابعة إلى المساعد الذكي'
                        : 'سجل بياناتك لإرسالها للتدقيق والموافقة من الإدارة'}
                    </p>
                  </div>
                  {onBackToHome && (
                    <button
                      type="button"
                      onClick={onBackToHome}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>الرئيسية</span>
                    </button>
                  )}
                </div>

                {/* Modern Pill / Segmented Control */}
                <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200/80">
                  <button
                    id="auth-tab-login"
                    type="button"
                    onClick={() => {
                      setMode('login');
                      resetStates();
                    }}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                      mode === 'login'
                        ? 'bg-white text-[#0f2a24] shadow-xs border border-slate-200/70'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    تسجيل الدخول
                  </button>
                  <button
                    id="auth-tab-register"
                    type="button"
                    onClick={() => {
                      setMode('register');
                      resetStates();
                    }}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                      mode === 'register'
                        ? 'bg-white text-[#0f2a24] shadow-xs border border-slate-200/70'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    إنشاء حساب جديد
                  </button>
                </div>
              </div>
            ) : (
              /* Forgot password header */
              <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#b08d24]" />
                    استعادة وتعيين كلمة المرور
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    أدخل بيانات التحقق ورمز الأمان لإعادة تعيين كلمة المرور
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    resetStates();
                  }}
                  className="text-xs text-slate-600 hover:text-[#0f2a24] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 transition-colors"
                >
                  العودة
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Context Notices & Status Messages */}
            {mode === 'register' && (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 mb-5 flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-emerald-950">إشعار نظام التدقيق المعتمد:</p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                    تدخل جميع الحسابات المسجلة فورياً في حالة <strong>"قيد المراجعة"</strong>، ويتم تفعيل الوصول بعد مصادقة المسؤول عبر لوحة التحكم.
                  </p>
                </div>
              </div>
            )}

            {/* Pending Status Alert */}
            {pendingStatusUser && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2.5">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-amber-950">الحساب قيد المراجعة والاعتماد</h3>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-md mx-auto">
                  عزيزي <strong>{pendingStatusUser.username}</strong>، طلبك محفوظ في قاعدة البيانات السحابية وهو الآن بانتظار اعتماد المشرف المعتمد.
                </p>
                <div className="mt-3 pt-3 border-t border-amber-200/70 flex justify-center">
                  <button
                    id="auth-refresh-status-btn"
                    type="button"
                    onClick={handleLogin}
                    className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1.5 py-1.5 px-3.5 bg-white rounded-lg border border-amber-300 shadow-2xs hover:bg-amber-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    إعادة فحص حالة الاعتماد الآن
                  </button>
                </div>
              </div>
            )}

            {/* Rejected Status Alert */}
            {rejectedUser && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-center">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-red-950">تم رفض طلب الاعتماد</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  عذراً <strong>{rejectedUser}</strong>، تم رفض طلب الحساب من قِبل إدارة النظام. يرجى التواصل مع الجهة المختصة.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && !pendingStatusUser && (
              <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* ================= MODE 1: LOGIN FORM ================= */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم المستخدم أو رقم الجوال
                  </label>
                  <div className="relative">
                    <input
                      id="auth-username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم أو رقم الجوال..."
                      className="w-full pl-3.5 pr-10 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                      required
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      كلمة المرور
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        resetStates();
                        setResetIdentifier(username);
                      }}
                      className="text-[11px] text-[#0f2a24] hover:text-emerald-800 font-bold hover:underline transition-colors"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور..."
                      className="w-full pl-10 pr-10 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 bg-[#0f2a24] hover:bg-[#153a32] active:bg-[#0b1f1a] text-white text-sm font-bold rounded-xl shadow-md shadow-[#0f2a24]/10 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارِ التحقق من الاعتماد...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>تسجيل الدخول للمنظومة</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================= MODE 2: REGISTER FORM ================= */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم الكامل (الثلاثي أو الرباعي) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-fullname-input"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد عبد الله خليل"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                      required
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الجوال <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-phone-input"
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0599000000 أو 0569000000"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all text-right"
                      required
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Username & Password in Grid on sm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المستخدم <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="register-username-input"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ahmad_khalil"
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                        required
                      />
                      <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="register-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Recovery Code (Key Request) */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-emerald-200/60">
                  <label className="block text-xs font-bold text-[#0f2a24] mb-1">
                    رمز استعادة كلمة المرور (رمز الأمان السري) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-recovery-code-input"
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="اكتب رمزاً سرياً تحفظه (مثال: 9988 أو كود خاص)..."
                      className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f2a24] transition-all"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-emerald-700 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                  <div className="flex items-start gap-1.5 mt-2 text-[11px] text-slate-600">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 text-emerald-700 mt-0.5" />
                    <span>
                      احفظ هذا الرمز جيداً؛ سيمكّنك من إعادة تعيين كلمة المرور ذاتياً في أي وقت دون الرجوع للإدارة.
                    </span>
                  </div>
                </div>

                <button
                  id="register-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 bg-[#0f2a24] hover:bg-[#153a32] active:bg-[#0b1f1a] text-white text-sm font-bold rounded-xl shadow-md shadow-[#0f2a24]/10 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 mt-3"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارِ إرسال طلب الحساب للسحابة...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إرسال طلب الحساب للاعتماد</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================= MODE 3: FORGOT PASSWORD FORM ================= */}
            {mode === 'forgot' && (
              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                  أدخل اسم المستخدم أو رقم الجوال المسجل، مع رمز الأمان الذي حددته، لتعيين كلمة مرور جديدة فوراً في السحابة.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المستخدم أو رقم الجوال <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-identifier-input"
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="اسم المستخدم أو رقم الجوال..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                      required
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز استعادة كلمة المرور (رمز الأمان) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-recovery-code-input"
                      type="text"
                      value={resetRecoveryCode}
                      onChange={(e) => setResetRecoveryCode(e.target.value)}
                      placeholder="أدخل الرمز السري الخاص بك..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                      required
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      كلمة المرور الجديدة <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reset-new-password-input"
                        type="password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="الجديدة (4 خانات+)..."
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reset-confirm-password-input"
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        placeholder="إعادة إدخال الجديدة..."
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    id="reset-submit-btn"
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-[#0f2a24] hover:bg-[#153a32] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      'جارِ التحديث في السحابة...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        تأكيد تعيين كلمة المرور
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      resetStates();
                    }}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
