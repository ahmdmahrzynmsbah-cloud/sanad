import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  Lock,
  LogOut,
  MessageSquare,
  Scale,
  Crown,
  Snowflake,
  Clock,
  Landmark,
  FileText,
  BookOpen,
  Users,
  Globe,
  Handshake,
  Home,
  Menu,
  X,
  ChevronLeft,
  Sparkles,
  Settings,
  Target,
  Eye,
  PhoneCall
} from 'lucide-react';
import { User, SystemBranding } from '../types';

export type ActiveView = 'home' | 'supervisors' | 'related-sites' | 'partners' | 'about' | 'contact' | 'chat' | 'auth' | 'admin-login' | 'admin-portal';

interface HeaderProps {
  currentUser: User | null;
  currentAdmin: { username: string; role: string } | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onOpenAbout?: () => void;
  onLogout: () => void;
  lawsCount: number;
  branding?: SystemBranding;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentAdmin,
  activeView,
  setActiveView,
  onOpenAuth,
  onOpenAbout,
  onLogout,
  lawsCount,
  branding,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fallback defaults
  const systemName = branding?.systemName || 'مساعد الجمارك والضرائب';
  const systemBadge = branding?.systemBadge ?? 'فلسطين';
  const systemSubtitle =
    branding?.systemSubtitle ??
    'دولة فلسطين • وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل';
  const logoType = branding?.logoType || 'preset';
  const logoPreset = branding?.logoPreset || 'scale';
  const logoUrl = branding?.logoUrl;
  const logoAccentColor = branding?.logoAccentColor || '#d4af37';

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const handleOpenLogin = () => {
    if (onOpenAuth) {
      onOpenAuth('login');
    } else {
      setActiveView('auth');
    }
    setIsMobileMenuOpen(false);
  };

  const handleOpenRegister = () => {
    if (onOpenAuth) {
      onOpenAuth('register');
    } else {
      setActiveView('auth');
    }
    setIsMobileMenuOpen(false);
  };

  const renderIcon = () => {
    if ((logoType === 'url' || logoType === 'upload') && logoUrl && !imageError) {
      return (
        <img
          src={logoUrl}
          alt={systemName}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain p-0.5 rounded-lg"
        />
      );
    }

    switch (logoPreset) {
      case 'shield':
        return <Shield className="w-5 h-5" style={{ color: logoAccentColor }} />;
      case 'landmark':
        return <Landmark className="w-5 h-5" style={{ color: logoAccentColor }} />;
      case 'scroll':
      case 'file':
        return <FileText className="w-5 h-5" style={{ color: logoAccentColor }} />;
      case 'book':
        return <BookOpen className="w-5 h-5" style={{ color: logoAccentColor }} />;
      case 'scale':
      default:
        return <Scale className="w-5 h-5" style={{ color: logoAccentColor }} />;
    }
  };

  return (
    <header className="bg-[#0b1f1a]/95 text-white border-b border-[#183d33] sticky top-0 z-50 shadow-xs backdrop-blur-md shrink-0 w-full">
      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-2 relative">
          {/* Logo & Official Branding */}
          <div className="flex-1 flex items-center justify-start min-w-0 z-10">
            <div
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0"
              title={systemName}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#163a30] to-[#0d2620] border border-[#235748] flex items-center justify-center shadow-inner overflow-hidden shrink-0 group-hover:border-[#d4af37]/60 transition-colors">
                {renderIcon()}
              </div>
              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 group-hover:text-emerald-300 transition-colors truncate">
                    <span className="truncate">{systemName}</span>
                    {systemBadge && (
                      <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/25 shrink-0">
                        {systemBadge}
                      </span>
                    )}
                  </h1>
                </div>
                {systemSubtitle && (
                  <p className="text-[10px] sm:text-[11px] text-slate-300/80 font-light truncate max-w-[200px] sm:max-w-md hidden xs:block">
                    {systemSubtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center Navigation Controls (الرئيسية + المشرفين + مواقع ذات صلة + الرؤية) */}
          <div className="hidden lg:flex flex-shrink-0 items-center justify-center gap-2 z-0">
            <button
              id="header-nav-home-btn"
              onClick={() => handleNav('home')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'home'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>الرئيسية</span>
            </button>

            {currentUser && (
              <button
                id="header-nav-chat-btn"
                onClick={() => handleNav('chat')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'chat'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60 hover:text-white border border-emerald-500/30'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>المستشار الذكي</span>
              </button>
            )}

            <button
              id="header-nav-supervisors-btn"
              onClick={() => handleNav('supervisors')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'supervisors'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>المشرفين</span>
            </button>

            <button
              id="header-nav-related-sites-btn"
              onClick={() => handleNav('related-sites')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'related-sites'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>مواقع ذات صلة</span>
            </button>

            <button
              id="header-nav-partners-btn"
              onClick={() => handleNav('partners')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'partners'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Handshake className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>شركاؤنا</span>
            </button>

            <button
              id="header-nav-about-btn"
              onClick={() => handleNav('about')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'about'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-[#d4af37]/30 hover:border-[#d4af37]/60'
              }`}
              title="الرؤية والرسالة"
            >
              <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>الرؤية</span>
            </button>

            <button
              id="header-nav-contact-btn"
              onClick={() => handleNav('contact')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'contact'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white border border-emerald-500/30 hover:border-emerald-500/60'
              }`}
              title="اتصل بنا وتواصل مباشر"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>اتصل بنا</span>
            </button>
          </div>

          {/* Right Controls (دخول المسؤول + بيانات المستخدم) */}
          <div className="flex-1 flex items-center justify-end gap-2 z-10">
            <div className="hidden md:flex items-center gap-2">
              {currentAdmin ? (
              <button
                id="header-nav-admin-portal-btn"
                onClick={() => handleNav('admin-portal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'admin-portal'
                    ? 'bg-[#b08d24] text-white shadow-sm'
                    : 'bg-amber-950/40 text-amber-200 hover:bg-amber-950/70 border border-amber-500/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                <span>لوحة التحكم</span>
              </button>
            ) : (
              <button
                id="header-nav-admin-login-btn"
                onClick={() => handleNav('admin-login')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'admin-login'
                    ? 'bg-amber-950/70 text-amber-200 border border-amber-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
                title="بوابة دخول المسؤول"
              >
                <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>المسؤول</span>
              </button>
            )}

            {/* Current user badge */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentUser.isSubscribed
                      ? 'bg-amber-400'
                      : currentUser.status === 'frozen' || currentUser.subscriptionStatus === 'frozen'
                      ? 'bg-purple-400'
                      : 'bg-emerald-400'
                  }`}
                ></span>
                <span className="text-slate-200 font-medium truncate max-w-[120px]">
                  {currentUser.fullName || currentUser.username}
                </span>

                {currentUser.isSubscribed ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 font-bold">
                    <Crown className="w-2.5 h-2.5" />
                    مشترك دائم
                  </span>
                ) : currentUser.status === 'frozen' || currentUser.subscriptionStatus === 'frozen' ? (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1 font-bold">
                    <Snowflake className="w-2.5 h-2.5" />
                    مجمد
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    تجريبي
                  </span>
                )}

                <button
                  id="header-user-logout-btn"
                  onClick={onLogout}
                  className="text-red-300 hover:text-red-200 p-0.5 mr-1 transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Current admin badge */}
            {currentAdmin && (
              <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-amber-200 font-medium">مسؤول النظام</span>
                <button
                  id="header-admin-logout-btn"
                  onClick={onLogout}
                  className="text-red-300 hover:text-red-200 p-0.5 mr-1 transition-colors cursor-pointer"
                  title="تسجيل الخروج من لوحة الإدارة"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!currentUser && !currentAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  id="header-nav-user-login-btn"
                  onClick={handleOpenLogin}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>

                <button
                  id="header-nav-user-register-btn"
                  onClick={handleOpenRegister}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#f5d77f]" />
                  <span>إنشاء حساب</span>
                </button>
              </div>
            )}
            </div>

            {/* Mobile Right Controls: Hamburger Menu */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                id="mobile-menu-toggle-btn"
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-label="القائمة الرئيسية"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] shrink-0"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-300" /> : <Menu className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#1d473a] bg-[#0c221c] animate-in slide-in-from-top-2 duration-200 px-4 py-4 space-y-3 shadow-2xl max-h-[calc(100vh-64px)] overflow-y-auto overscroll-contain touch-scroll">
          {/* User Status Card (if logged in) */}
          {currentUser && (
            <div className="bg-[#14362b] border border-[#235b48] rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-900 border border-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {currentUser.fullName ? currentUser.fullName.slice(0, 2) : currentUser.username.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.fullName || currentUser.username}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    {currentUser.isSubscribed ? (
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        مشترك دائم
                      </span>
                    ) : currentUser.status === 'frozen' || currentUser.subscriptionStatus === 'frozen' ? (
                      <span className="text-purple-300 font-bold flex items-center gap-1">
                        <Snowflake className="w-3 h-3 text-purple-400" />
                        حساب مجمد
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-300" />
                        تجريبي ({currentUser.remainingTrialDays ?? currentUser.trialDays ?? 7} يوم)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}

          {/* Admin Status Card (if logged in) */}
          {currentAdmin && (
            <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-200 text-xs font-bold">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>مسؤول النظام ({currentAdmin.username})</span>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="px-3 py-1.5 bg-red-950/60 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}

          {/* Mobile Nav Links List */}
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <button
              onClick={() => handleNav('home')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                activeView === 'home'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-emerald-300" />
                <span>الصفحة الرئيسية (عن الموقع والمؤسس)</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>

            {currentUser && (
              <button
                onClick={() => handleNav('chat')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                  activeView === 'chat'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-500/30'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#d4af37]" />
                  <span>المستشار الذكي (الشات المباشر)</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-[#d4af37]" />
              </button>
            )}

            <button
              onClick={() => handleNav('supervisors')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                activeView === 'supervisors'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-300" />
                <span>هيئة المشرفين</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>

            <button
              id="header-nav-related-sites-mobile-btn"
              onClick={() => handleNav('related-sites')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                activeView === 'related-sites'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-300" />
                <span>مواقع ذات صلة</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>

            <button
              id="header-nav-partners-mobile-btn"
              onClick={() => handleNav('partners')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                activeView === 'partners'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Handshake className="w-4 h-4 text-[#d4af37]" />
                <span>شركاؤنا</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>

            <button
              id="header-nav-about-mobile-btn"
              onClick={() => handleNav('about')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                activeView === 'about'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-[#d4af37]/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-[#d4af37]" />
                <span>الرؤية</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-[#d4af37]" />
            </button>

            <button
              id="header-nav-contact-mobile-btn"
              onClick={() => handleNav('contact')}
              className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                activeView === 'contact'
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-emerald-500/30'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>اتصل بنا</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-emerald-400" />
            </button>

            {currentAdmin ? (
              <button
                onClick={() => handleNav('admin-portal')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                  activeView === 'admin-portal'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-950/40 text-amber-200 border border-amber-500/30'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-amber-300" />
                  <span>لوحة تحكم المسؤول المعتمد</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-amber-300" />
              </button>
            ) : (
              <button
                onClick={() => handleNav('admin-login')}
                className={`w-full p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all text-right cursor-pointer ${
                  activeView === 'admin-login'
                    ? 'bg-amber-950/80 text-amber-200 border border-amber-500/50'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-[#d4af37]" />
                  <span>دخول المسؤول المعتمد</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {!currentUser && !currentAdmin && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                <button
                  onClick={handleOpenLogin}
                  className="p-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
                <button
                  onClick={handleOpenRegister}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#f5d77f]" />
                  <span>إنشاء حساب</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};


