import React, { useState, useEffect } from 'react';
import { Header, ActiveView } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminPortal } from './components/AdminPortal';
import { ChatPortal } from './components/ChatPortal';
import { HomeLandingView } from './components/HomeLandingView';
import { SupervisorsView } from './components/SupervisorsView';
import { RelatedSitesView } from './components/RelatedSitesView';
import { PartnersView } from './components/PartnersView';
import { AboutPlatformView } from './components/AboutPlatformView';
import { ContactUsView } from './components/ContactUsView';
import { SanadWelcomeModal } from './components/SanadWelcomeModal';
import { User, SystemBranding, PlatformAboutData, ContactInfo } from './types';
import { Scale, ShieldAlert, Clock, LogOut, ArrowRight, BookOpen } from 'lucide-react';
import { initGlobalSync, useSync } from './utils/sync';

export default function App() {
  const [branding, setBranding] = useState<SystemBranding | undefined>(undefined);
  const [platformAbout, setPlatformAbout] = useState<PlatformAboutData | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
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

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      const savedAdmin = localStorage.getItem('pal_tax_admin');
      if (savedAdmin) return 'admin-portal';

      const savedUser = localStorage.getItem('pal_tax_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.status === 'approved') return 'chat';
      }
    } catch {}
    return 'home';
  });

  const [lawsCount, setLawsCount] = useState<number>(3);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);

  const handleQuestionFromWelcomeModal = (questionText: string) => {
    if (!questionText.trim()) return;
    try {
      sessionStorage.setItem('sanad_initial_prompt', questionText.trim());
    } catch {}

    if (currentUser && currentUser.status === 'approved') {
      setActiveView('chat');
    } else {
      setAuthInitialMode('login');
      setActiveView('auth');
    }
  };

  // Fetch Laws count
  const fetchLawsCount = async () => {
    try {
      const res = await fetch('/api/laws');
      const data = await res.json();
      if (res.ok && data.laws) {
        setLawsCount(data.laws.length);
      }
    } catch (err) {
      console.warn('Failed to load laws count:', err);
    }
  };

  // Fetch System Branding
  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/system/branding');
      const data = await res.json();
      if (res.ok && data) {
        setBranding(data);
        if (data.systemName) {
          document.title = data.systemName;
        }
      }
    } catch (err) {
      console.warn('Failed to load branding:', err);
    }
  };

  // Fetch Platform About
  const fetchPlatformAbout = async () => {
    try {
      const res = await fetch('/api/system/about');
      const data = await res.json();
      if (res.ok && data) {
        setPlatformAbout(data);
      }
    } catch (err) {
      console.warn('Failed to load platform about:', err);
    }
  };

  // Fetch Contact Info
  const fetchContactInfo = async () => {
    try {
      const res = await fetch('/api/system/contact');
      const data = await res.json();
      if (res.ok && data && data.contactInfo) {
        setContactInfo(data.contactInfo);
      }
    } catch (err) {
      console.warn('Failed to load contact info:', err);
    }
  };

  const fetchCurrentUser = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/by-username/${encodeURIComponent(currentUser.username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('pal_tax_user', JSON.stringify(data.user));
          
          // Redirect pending users to chat if they just got approved
          if (activeView === 'auth' && data.user.status === 'approved') {
            setActiveView('chat');
          }
          // Redirect active users out of chat if they got frozen or rejected
          if (activeView === 'chat' && data.user.status !== 'approved') {
            setActiveView('auth');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to sync current user', e);
    }
  };

  useEffect(() => {
    const cleanupSync = initGlobalSync();
    
    // Fetch initial data in the background without blocking the UI
    fetchLawsCount();
    fetchBranding();
    fetchPlatformAbout();
    fetchContactInfo();
    
    return () => cleanupSync();
  }, []);

  useSync(['users'], () => {
    fetchCurrentUser();
  });

  useSync(['laws', 'system_settings'], () => {
    fetchLawsCount();
    fetchBranding();
    fetchPlatformAbout();
    fetchContactInfo();
  });

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
    setActiveView('home');
  };

  const isFullChatView =
    activeView === 'chat' &&
    currentUser !== null &&
    currentUser.status === 'approved' &&
    currentUser.subscriptionStatus !== 'frozen' &&
    !currentUser.isFrozen;

  return (
    <div
      className={`bg-[#f4f7f5] text-slate-900 flex flex-col font-['IBM_Plex_Sans_Arabic',sans-serif] ${
        isFullChatView ? 'h-screen max-h-screen w-full overflow-hidden' : 'min-h-screen w-full'
      }`}
    >
      {/* Official State Header */}
      <Header
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setActiveView('auth');
        }}
        onLogout={handleLogout}
        lawsCount={lawsCount}
        branding={branding}
      />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col ${isFullChatView ? 'min-h-0 overflow-hidden p-0' : 'justify-center py-2 sm:py-4'}`}>
        {/* VIEW 0: Public Landing Page (عن الموقع والمؤسس وزرارين تسجيل دخول وإنشاء حساب) */}
        {activeView === 'home' && (
          <div className="w-full">
            <HomeLandingView
              branding={branding}
              onNavigateToAuth={(mode) => {
                setAuthInitialMode(mode);
                setActiveView('auth');
              }}
              onNavigateToSupervisors={() => setActiveView('supervisors')}
              onNavigateToRelatedSites={() => setActiveView('related-sites')}
              onNavigateToPartners={() => setActiveView('partners')}
              onOpenAbout={() => setActiveView('about')}
              onOpenContact={() => setActiveView('contact')}
              onOpenSanadIntro={() => setShowWelcomeModal(true)}
              onNavigateToChat={() => {
                if (currentUser && currentUser.status === 'approved') {
                  setActiveView('chat');
                } else if (currentUser) {
                  setActiveView('chat');
                } else {
                  setAuthInitialMode('login');
                  setActiveView('auth');
                }
              }}
              currentUser={currentUser}
              lawsCount={lawsCount}
            />
          </div>
        )}

        {/* VIEW 0.1: Public Supervisors Page (المشرفين) */}
        {activeView === 'supervisors' && (
          <div className="w-full">
            <SupervisorsView
              onBackToHome={() => setActiveView('home')}
              onNavigateToAuth={(mode) => {
                setAuthInitialMode(mode);
                setActiveView('auth');
              }}
            />
          </div>
        )}

        {/* VIEW 0.2: Public Related Sites Page (مواقع ذات صلة) */}
        {activeView === 'related-sites' && (
          <div className="w-full">
            <RelatedSitesView
              onBackToHome={() => setActiveView('home')}
            />
          </div>
        )}

        {/* VIEW 0.25: Public Partners Page (شركاؤنا) */}
        {activeView === 'partners' && (
          <div className="w-full">
            <PartnersView
              onBackToHome={() => setActiveView('home')}
            />
          </div>
        )}

        {/* VIEW 0.3: Public About Platform Page (الرؤية والرسالة) */}
        {activeView === 'about' && (
          <div className="w-full">
            <AboutPlatformView
              aboutData={platformAbout}
            />
          </div>
        )}

        {/* VIEW 0.4: Public Contact Us Page (اتصل بنا) */}
        {activeView === 'contact' && (
          <div className="w-full">
            <ContactUsView
              contactData={contactInfo}
              onBackToHome={() => setActiveView('home')}
            />
          </div>
        )}

        {/* VIEW 1: Regular User Login / Register */}
        {activeView === 'auth' && (
          <div className="w-full">
            <AuthModal
              onLoginSuccess={handleUserLoginSuccess}
              onGoToAdminLogin={() => setActiveView('admin-login')}
              initialMode={authInitialMode}
              onBackToHome={() => setActiveView('home')}
            />
          </div>
        )}

        {/* VIEW 2: Separate Admin Login */}
        {activeView === 'admin-login' && (
          <div className="w-full">
            <AdminLogin
              onAdminLoginSuccess={handleAdminLoginSuccess}
              onBackToUserAuth={() => {
                setAuthInitialMode('login');
                setActiveView('auth');
              }}
            />
          </div>
        )}

        {/* VIEW 3: Admin Portal */}
        {activeView === 'admin-portal' && (
          <div>
            {currentAdmin ? (
              <AdminPortal
                onLawsUpdated={fetchLawsCount}
                onBrandingUpdated={(newBranding) => {
                  setBranding(newBranding);
                  if (newBranding.systemName) {
                    document.title = newBranding.systemName;
                  }
                }}
                onAboutUpdated={(newAbout) => {
                  setPlatformAbout(newAbout);
                }}
                onContactUpdated={(newContact) => {
                  setContactInfo(newContact);
                }}
              />
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
          <div className={isFullChatView ? 'h-full w-full min-h-0 overflow-hidden flex flex-col' : ''}>
            {currentUser && (currentUser.status === 'frozen' || currentUser.subscriptionStatus === 'frozen') ? (
              /* Frozen user: trial expired or frozen by admin */
              <div className="max-w-lg mx-auto my-14 p-6 sm:p-8 bg-white rounded-2xl border border-purple-200 text-center shadow-md">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4 border border-purple-300 shadow-xs">
                  <span className="text-3xl">❄️</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 mb-3">
                  <span>تم تجميد الحساب لانتهاء الفترة التجريبية</span>
                </div>
                <h3 className="text-lg font-bold text-gray-950">انتهت الفترة التجريبية لحسابك</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                  أهلاً بك <strong className="text-gray-900">{currentUser.fullName || currentUser.username}</strong>. انتهت المهلة التجريبية المحددة لحسابك دون تسجيل اشتراك. تم تجميد صلاحية الدخول للمستشار الذكي مؤقتاً لحين تجديد أو تفعيل الاشتراك.
                </p>

                <div className="mt-6 p-4 bg-purple-50/80 rounded-xl border border-purple-200 text-right text-xs space-y-2 text-purple-950">
                  <div className="font-bold flex items-center gap-1.5 text-purple-900">
                    <span>👑 لتفعيل الاشتراك وفك التجميد:</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    يرجى التواصل مع إدارة المنظومة أو مسؤول النظام لاعتماد الاشتراك وتفعيل حسابك بشكل دائم أو تمديد فترتك التجريبية.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 rounded-xl hover:bg-red-100 flex items-center gap-1.5 border border-red-200 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    تسجيل الخروج
                  </button>
                  <button
                    onClick={async () => {
                      // Quick re-check status in case admin just approved/unfroze
                      try {
                        const res = await fetch(`/api/users/by-username/${encodeURIComponent(currentUser.username)}`);
                        if (res.ok) {
                          const data = await res.json();
                          if (data.user) {
                            setCurrentUser(data.user);
                            localStorage.setItem('pal_tax_user', JSON.stringify(data.user));
                            if (data.user.status === 'approved' && !data.user.isFrozen) {
                              window.location.reload();
                            }
                          }
                        }
                      } catch {}
                    }}
                    className="px-4 py-2 text-xs font-bold text-[#12281e] bg-gray-100 rounded-xl hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
                  >
                    🔄 تحديث حالة الحساب
                  </button>
                </div>
              </div>
            ) : currentUser && currentUser.status === 'approved' ? (
              <ChatPortal currentUser={currentUser} lawsCount={lawsCount} branding={branding} onLogout={handleLogout} />
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

      {/* Official Palestinian Governmental Footer (Only shown on standard non-chat pages) */}
      {!isFullChatView && (
        <footer className="bg-[#0f241a] text-[#8aa997] border-t border-[#1a3829] py-4 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#d4af37]" />
              <span className="font-semibold text-white">
                منظومة الاستعلام الجمركي والضريبي الذكية • دولة فلسطين
              </span>
            </div>
            <div className="text-[11px] text-[#6b8b79]">
              تم تطوير وتصميم هذه المنصة الذكية باحترافية عالية بواسطة{' '}
              <a
                href="https://wa.me/201034859313"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#d4af37] font-bold hover:text-[#e2bd40] transition-colors"
              >
                شركة Fox Tech
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Interactive Sanad Welcome Dialog (النافذة المنبثقة: اسأل سند + من هو سند) */}
      <SanadWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onQuestionAsked={handleQuestionFromWelcomeModal}
      />
    </div>
  );
}
