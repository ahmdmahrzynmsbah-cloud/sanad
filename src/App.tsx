import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminPortal } from './components/AdminPortal';
import { ChatPortal } from './components/ChatPortal';
import { User } from './types';
import { Scale, ShieldAlert, Clock, LogOut, ArrowRight, BookOpen } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('pal_tax_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentAdmin, setCurrentAdmin] = useState<{ username: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('pal_tax_admin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<'chat' | 'auth' | 'admin-login' | 'admin-portal'>(() => {
    try {
      const savedAdmin = localStorage.getItem('pal_tax_admin');
      if (savedAdmin) return 'admin-portal';

      const savedUser = localStorage.getItem('pal_tax_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.status === 'approved') return 'chat';
      }
    } catch {}
    return 'auth';
  });

  const [lawsCount, setLawsCount] = useState<number>(3);

  // Fetch Laws count
  const fetchLawsCount = async () => {
    try {
      const res = await fetch('/api/laws');
      const data = await res.json();
      if (res.ok && data.laws) {
        setLawsCount(data.laws.length);
      }
    } catch (err) {
      console.error('Failed to load laws count:', err);
    }
  };

  useEffect(() => {
    fetchLawsCount();
  }, []);

  const handleUserLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pal_tax_user', JSON.stringify(user));
    if (user.status === 'approved') {
      setActiveView('chat');
    } else {
      setActiveView('auth');
    }
  };

  const handleAdminLoginSuccess = (admin: { username: string; role: string }) => {
    setCurrentAdmin(admin);
    localStorage.setItem('pal_tax_admin', JSON.stringify(admin));
    setActiveView('admin-portal');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentAdmin(null);
    localStorage.removeItem('pal_tax_user');
    localStorage.removeItem('pal_tax_admin');
    setActiveView('auth');
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-900 flex flex-col font-['IBM_Plex_Sans_Arabic',sans-serif]">
      {/* Official State Header */}
      <Header
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={handleLogout}
        lawsCount={lawsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-2 sm:py-4">
        {/* VIEW 1: Regular User Login / Register */}
        {activeView === 'auth' && (
          <div className="w-full">
            <AuthModal
              onLoginSuccess={handleUserLoginSuccess}
              onGoToAdminLogin={() => setActiveView('admin-login')}
            />
          </div>
        )}

        {/* VIEW 2: Separate Admin Login */}
        {activeView === 'admin-login' && (
          <div className="w-full">
            <AdminLogin
              onAdminLoginSuccess={handleAdminLoginSuccess}
              onBackToUserAuth={() => setActiveView('auth')}
            />
          </div>
        )}

        {/* VIEW 3: Admin Portal */}
        {activeView === 'admin-portal' && (
          <div>
            {currentAdmin ? (
              <AdminPortal onLawsUpdated={fetchLawsCount} />
            ) : (
              <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl border border-red-200 text-center shadow-xs">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900">يتطلب تسجيل دخول المسؤول</h3>
                <p className="text-xs text-gray-600 mt-1 mb-4">
                  هذه الصفحة مخصصة فقط لمسؤول النظام المعتمد.
                </p>
                <button
                  onClick={() => setActiveView('admin-login')}
                  className="px-4 py-2 bg-[#12281e] text-white text-xs font-bold rounded-lg"
                >
                  الانتقال إلى تسجيل دخول المسؤول
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: Chat Portal for Approved Users */}
        {activeView === 'chat' && (
          <div>
            {currentUser && currentUser.status === 'approved' ? (
              <ChatPortal currentUser={currentUser} lawsCount={lawsCount} />
            ) : currentUser && currentUser.status === 'pending' ? (
              /* Blocked pending user trying to access chat directly */
              <div className="max-w-md mx-auto my-14 p-6 bg-white rounded-xl border border-amber-200 text-center shadow-md">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-gray-900">الحساب قيد المراجعة</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  حسابك مسجل ولكن لا يمكنك استخدام البوت إلا بعد مراجعته وقبوله من قِبل مسؤول النظام.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            ) : (
              /* Unauthenticated user trying to access chat */
              <div className="max-w-md mx-auto my-14 p-6 bg-white rounded-xl border border-gray-200 text-center shadow-xs">
                <Scale className="w-12 h-12 text-[#12281e] mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900">تسجيل الدخول مطلوب</h3>
                <p className="text-xs text-gray-600 mt-2 mb-4 leading-relaxed">
                  للاستفادة من مساعد الجمارك والضرائب الفلسطيني، يرجى تسجيل الدخول بحسابك المعتمد أو إنشاء حساب جديد.
                </p>
                <button
                  onClick={() => setActiveView('auth')}
                  className="px-5 py-2.5 bg-[#12281e] text-white text-xs font-bold rounded-lg hover:bg-[#1b3d2d] transition-colors inline-flex items-center gap-1.5"
                >
                  تسجيل الدخول / إنشاء حساب
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Official Palestinian Governmental Footer */}
      <footer className="bg-[#0f241a] text-[#8aa997] border-t border-[#1a3829] py-4 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#d4af37]" />
            <span className="font-semibold text-white">
              منظومة الاستعلام الجمركي والضريبي الذكية • دولة فلسطين
            </span>
          </div>
          <div className="text-[11px] text-[#6b8b79]">
            جميع البيانات مستندة إلى نصوص القوانين والقرارات بقانون الصادرة رسمياً • لأغراض استرشادية
          </div>
        </div>
      </footer>
    </div>
  );
}
