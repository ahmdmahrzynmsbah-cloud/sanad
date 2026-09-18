import React from 'react';
import {
  Home,
  MessageSquare,
  CreditCard,
  Users,
  UserCheck,
  Shield,
  Sparkles
} from 'lucide-react';
import { ActiveView } from './Header';
import { User } from '../types';

interface MobileBottomNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentUser: User | null;
  currentAdmin: { username: string; role: string } | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  currentUser,
  currentAdmin,
  onOpenAuth,
}) => {
  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavToPlans = () => {
    if (activeView !== 'home') {
      setActiveView('home');
    }
    setTimeout(() => {
      const el = document.getElementById('subscription-plans-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 600, behavior: 'smooth' });
      }
    }, 120);
  };

  const handleChatNav = () => {
    if (currentUser && currentUser.status === 'approved') {
      handleNav('chat');
    } else if (currentUser) {
      handleNav('chat');
    } else {
      onOpenAuth('login');
    }
  };

  const handleUserNav = () => {
    if (currentAdmin) {
      handleNav('admin-portal');
    } else if (currentUser) {
      handleNav('chat');
    } else {
      onOpenAuth('login');
    }
  };

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      aria-label="شريط التنقل السفلي للأجهزة المحمولة"
      className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#091b16]/95 text-white border-t border-[#183d33] backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom,8px)] transition-transform duration-300"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center px-1 py-1.5 text-center">
        {/* 1. Home Button */}
        <button
          id="mobile-bottom-nav-home"
          onClick={() => handleNav('home')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeView === 'home'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeView === 'home' ? 'bg-emerald-500/20 text-emerald-300 scale-110' : ''
            }`}
          >
            <Home className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate w-full">الرئيسية</span>
        </button>

        {/* 2. Supervisors Button */}
        <button
          id="mobile-bottom-nav-supervisors"
          onClick={() => handleNav('supervisors')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeView === 'supervisors'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeView === 'supervisors' ? 'bg-emerald-500/20 text-emerald-300 scale-110' : ''
            }`}
          >
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate w-full">المشرفين</span>
        </button>

        {/* 3. CENTER BUTTON: Smart Advisor (المستشار الذكي) */}
        <button
          id="mobile-bottom-nav-chat"
          onClick={handleChatNav}
          className="flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] relative group"
        >
          <div
            className={`w-10 h-10 -mt-4 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-200 border ${
              activeView === 'chat'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-300 scale-110 shadow-emerald-900/60'
                : 'bg-gradient-to-br from-[#133c30] to-[#091b16] text-[#d4af37] border-[#296753] hover:scale-105'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-[#091b16]" />
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight font-bold truncate w-full ${
              activeView === 'chat' ? 'text-emerald-300' : 'text-[#f5d77f]'
            }`}
          >
            المستشار
          </span>
        </button>

        {/* 4. Plans Button */}
        <button
          id="mobile-bottom-nav-plans"
          onClick={handleNavToPlans}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeView === 'plans'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeView === 'plans' ? 'bg-emerald-500/20 text-emerald-300 scale-110' : ''
            }`}
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate w-full">الاشتراكات</span>
        </button>

        {/* 5. User / Admin / Auth Button */}
        <button
          id="mobile-bottom-nav-user"
          onClick={handleUserNav}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
            activeView === 'auth' || activeView === 'admin-portal' || activeView === 'admin-login'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeView === 'auth' || activeView === 'admin-portal'
                ? 'bg-emerald-500/20 text-emerald-300 scale-110'
                : ''
            }`}
          >
            {currentAdmin ? (
              <Shield className="w-4 h-4 text-amber-400" />
            ) : currentUser ? (
              <UserCheck className="w-4 h-4 text-emerald-300" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate w-full">
            {currentAdmin ? 'الإدارة' : currentUser ? 'حسابي' : 'دخول'}
          </span>
        </button>
      </div>
    </nav>
  );
};
