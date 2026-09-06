import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  Mail,
  Phone,
  Building2,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  UserCheck,
  Scale
} from 'lucide-react';
import { Supervisor } from '../types';
import { useSync } from '../utils/sync';

interface SupervisorsViewProps {
  onBackToHome: () => void;
  onGoToAdminPortal?: () => void;
  isAdmin?: boolean;
  onNavigateToAuth?: (mode: 'login' | 'register') => void;
}

export const SupervisorsView: React.FC<SupervisorsViewProps> = ({
  onBackToHome,
  onGoToAdminPortal,
  isAdmin,
  onNavigateToAuth,
}) => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const fetchSupervisors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supervisors');
      const data = await res.json();
      if (res.ok && data.supervisors) {
        setSupervisors(data.supervisors);
      }
    } catch (err) {
      console.error('Failed to load supervisors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  useSync(['supervisors'], () => {
    fetchSupervisors();
  });

  // Filter departments
  const departments = Array.from(
    new Set(supervisors.map((s) => s.department).filter(Boolean))
  ) as string[];

  const filteredSupervisors = supervisors.filter((s) => {
    const matchesSearch =
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.bio && s.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      selectedDept === 'all' || s.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-10 space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
        <div>
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors mb-2.5 sm:mb-3 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Users className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                هيئة المشرفين والخبراء القانونيين والضريبيين
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                نخبة من المستشارين والخبراء المعتمدين في فحص القوانين والأنظمة الجمركية والضريبية بدولة فلسطين
              </p>
            </div>
          </div>
        </div>

        {isAdmin && onGoToAdminPortal && (
          <button
            onClick={onGoToAdminPortal}
            className="px-4 py-2 bg-[#12281e] text-white text-xs font-bold rounded-xl hover:bg-[#1a3a2d] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span>إدارة المشرفين في لوحة التحكم</span>
          </button>
        )}
      </div>

      {/* Search & Department Filters Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، التخصص، أو الكلمات المفتاحية..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Department Chips */}
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll overscroll-x-contain w-full md:w-auto pb-1.5 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedDept === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع الأقسام ({supervisors.length})
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedDept === dept
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">جارٍ تحميل قائمة هيئة المشرفين المعتمدين...</p>
        </div>
      ) : filteredSupervisors.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لم يتم العثور على مشرفين مطابقين</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'جرّب تعديل كلمات البحث أو اختيار قسم آخر.'
              : 'لم تتم إضافة مشرفين بعد في النظام.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('all');
              }}
              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              إعادة ضبط البحث
            </button>
          )}
        </div>
      ) : (
        /* Supervisors Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSupervisors.map((sup, idx) => (
            <div
              key={sup.id || idx}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Top / Identity */}
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  {/* Supervisor Photo */}
                  <div className="relative shrink-0">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-emerald-800/20 shadow-xs group-hover:border-emerald-600 transition-colors">
                      {sup.photoUrl ? (
                        <img
                          src={sup.photoUrl}
                          alt={sup.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-[#0b1f1a] text-white flex items-center justify-center font-bold text-xl">
                          {sup.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-xs" title="معتمد رسمياً">
                      ✓
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="flex-1 min-w-0 text-right">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block mb-1">
                      {sup.department || 'إشراف قانوني'}
                    </span>
                    <h3 className="text-base font-bold text-slate-950 truncate group-hover:text-emerald-800 transition-colors">
                      {sup.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 line-clamp-2 mt-0.5">
                      {sup.title}
                    </p>
                  </div>
                </div>

                {/* Supervisor Bio */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-600 leading-relaxed text-right line-clamp-5">
                    {sup.bio || 'خبير ومستشار معتمد في منظومة القوانين والتشريعات الجمركية والضريبية الفلسطينية.'}
                  </p>
                </div>
              </div>

              {/* Card Footer / Contact Info */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  {sup.email && (
                    <a
                      href={`mailto:${sup.email}`}
                      className="hover:text-emerald-800 flex items-center gap-1 transition-colors"
                      title={sup.email}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-mono hidden sm:inline">{sup.email}</span>
                    </a>
                  )}
                  {sup.phone && (
                    <span className="flex items-center gap-1 font-mono text-[11px]" title={sup.phone}>
                      <Phone className="w-3.5 h-3.5" />
                      <span dir="ltr">{sup.phone}</span>
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-400">
                  معتمد
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
