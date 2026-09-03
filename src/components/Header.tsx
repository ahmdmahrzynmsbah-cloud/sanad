import React from 'react';
import { Shield, UserCheck, Lock, LogOut, MessageSquare, Scale } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  currentAdmin: { username: string; role: string } | null;
  activeView: 'chat' | 'auth' | 'admin-login' | 'admin-portal';
  setActiveView: (view: 'chat' | 'auth' | 'admin-login' | 'admin-portal') => void;
  onLogout: () => void;
  lawsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentAdmin,
  activeView,
  setActiveView,
  onLogout,
  lawsCount,
}) => {
  return (
    <header className="bg-[#0b1f1a] text-white border-b border-[#183d33] sticky top-0 z-40 shadow-xs backdrop-blur-md">
      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Logo & Official Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#163a30] to-[#0d2620] border border-[#235748] flex items-center justify-center shadow-inner text-[#d4af37]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  مساعد الجمارك والضرائب
                  <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/25">
                    فلسطين
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-300/80 font-light">
                دولة فلسطين • وزارة المالية • الإدارة العامة للجمارك وضريبة الدخل
              </p>
            </div>
          </div>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher buttons */}
            {currentUser && currentUser.status === 'approved' && (
              <button
                id="header-nav-chat-btn"
                onClick={() => setActiveView('chat')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeView === 'chat'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                المساعد الذكي
              </button>
            )}

            {currentAdmin ? (
              <button
                id="header-nav-admin-portal-btn"
                onClick={() => setActiveView('admin-portal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeView === 'admin-portal'
                    ? 'bg-[#b08d24] text-white shadow-sm'
                    : 'bg-amber-950/40 text-amber-200 hover:bg-amber-950/70 border border-amber-500/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-300" />
                لوحة تحكم المسؤول
              </button>
            ) : (
              <button
                id="header-nav-admin-login-btn"
                onClick={() => setActiveView('admin-login')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeView === 'admin-login'
                    ? 'bg-amber-950/70 text-amber-200 border border-amber-500/40'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
                title="بوابة دخول المسؤول الثابتة"
              >
                <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>دخول المسؤول</span>
              </button>
            )}

            {/* Current user badge */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-200 font-medium">{currentUser.username}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  معتمد
                </span>
                <button
                  id="header-user-logout-btn"
                  onClick={onLogout}
                  className="text-red-300 hover:text-red-200 p-0.5 mr-1 transition-colors"
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
                  className="text-red-300 hover:text-red-200 p-0.5 mr-1 transition-colors"
                  title="تسجيل الخروج من لوحة الإدارة"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!currentUser && !currentAdmin && activeView !== 'auth' && (
              <button
                id="header-nav-user-login-btn"
                onClick={() => setActiveView('auth')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs flex items-center gap-1.5 transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                تسجيل دخول المستفيدين
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
