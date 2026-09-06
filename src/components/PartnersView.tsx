import React, { useState, useEffect } from 'react';
import {
  Handshake,
  ExternalLink,
  ShieldCheck,
  Search,
  ArrowRight,
  Building2,
  GraduationCap,
  Briefcase,
  Landmark,
  BadgeCheck,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Partner } from '../types';
import { useSync } from '../utils/sync';

interface PartnersViewProps {
  onBackToHome: () => void;
  onGoToAdminPortal?: () => void;
  isAdmin?: boolean;
}

export const PartnersView: React.FC<PartnersViewProps> = ({
  onBackToHome,
  onGoToAdminPortal,
  isAdmin,
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partners');
      const data = await res.json();
      if (res.ok && data.partners) {
        setPartners(data.partners);
      }
    } catch (err) {
      console.error('Failed to load partners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useSync(['partners'], () => {
    fetchPartners();
  });

  const categories = Array.from(
    new Set(partners.map((p) => p.category).filter(Boolean))
  ) as string[];

  const filteredPartners = partners
    .filter((p) => p.isActive !== false)
    .filter((partner) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (partner.name && partner.name.toLowerCase().includes(q)) ||
        (partner.description && partner.description.toLowerCase().includes(q)) ||
        (partner.category && partner.category.toLowerCase().includes(q)) ||
        (partner.partnershipType && partner.partnershipType.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' || partner.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('جامع') || category.includes('أكاديم')) {
      return <GraduationCap className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (category.includes('بنك') || category.includes('مالي')) {
      return <Landmark className="w-3.5 h-3.5 text-amber-600" />;
    }
    if (category.includes('نقاب') || category.includes('اتحاد')) {
      return <Briefcase className="w-3.5 h-3.5 text-emerald-600" />;
    }
    return <Building2 className="w-3.5 h-3.5 text-slate-600" />;
  };

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#12281e] to-emerald-950 text-white flex items-center justify-center font-bold shadow-sm border border-emerald-500/20 shrink-0">
              <Handshake className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                  شركاؤنا المؤسسيون
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#d4af37]/15 text-[#917117] border border-[#d4af37]/30">
                  شبكة التعاون الوطني
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                المؤسسات، والنقابات، والجامعات، والغرف التجارية، والجهات الشريكة في إثراء المعرفة ودعم قطاع الأعمال الفلسطيني
              </p>
            </div>
          </div>
        </div>

        {isAdmin && onGoToAdminPortal && (
          <button
            onClick={onGoToAdminPortal}
            className="px-4 py-2 bg-[#12281e] text-white text-xs font-bold rounded-xl hover:bg-[#1a3a2d] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 border border-emerald-500/30"
          >
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span>إدارة الشركاء في لوحة التحكم</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المؤسسة، نوع الشراكة، أو المجال..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category Filter - All Partners Only */}
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll overscroll-x-contain w-full md:w-auto pb-1.5 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-emerald-800 text-white shadow-xs cursor-pointer"
          >
            جميع الشركاء ({partners.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">جارٍ تحميل قائمة الشركاء المؤسسيين...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Handshake className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لم يتم العثور على شركاء مطابقين</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery ? 'جرّب تعديل كلمات البحث أو اختيار تصنيف آخر.' : 'لم تتم إضافة شركاء بعد.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              إعادة ضبط البحث
            </button>
          )}
        </div>
      ) : (
        /* Partners Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => {
            const hasCustomImage = partner.logoUrl && !imageErrors[partner.id];

            return (
              <div
                key={partner.id}
                className="group bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Row: Logo & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {hasCustomImage ? (
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          onError={() => handleImageError(partner.id)}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center text-emerald-800 font-extrabold text-lg border border-emerald-200/60">
                          {partner.name ? partner.name.slice(0, 2) : 'ش'}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {partner.partnershipType && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#d4af37]/15 text-[#917117] border border-[#d4af37]/30">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{partner.partnershipType}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                        {getCategoryIcon(partner.category)}
                        <span>{partner.category}</span>
                      </span>
                    </div>
                  </div>

                  {/* Partner Name & Description */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors leading-snug">
                      {partner.name}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {partner.description}
                    </p>
                  </div>
                </div>

                {/* Footer: Action Button */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {partner.websiteUrl ? (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 group-hover:underline cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>زيارة الموقع الرسمي</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 transition-colors" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>شريك معتمد</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Strategic Collaboration Banner */}
      <div className="bg-gradient-to-br from-[#12281e] via-[#1a3a2d] to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-right">
            <div className="inline-flex items-center gap-1.5 text-[#d4af37] text-xs font-bold">
              <Handshake className="w-4 h-4" />
              <span>انضم إلى شبكة شركاء «سَنَد»</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              هل تمثل مؤسسة، نقابة، أو جهة أكاديمية ترغب في الشراكة؟
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              نرحب بالتعاون مع كافة المؤسسات الوطنية، ومكاتب التدقيق، والجامعات لتبادل الخبرات وتطوير أدوات وحلول ذكية تخدم المجتمع الاقتصادي والضريبي في فلسطين.
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => {
                const contactBtn = document.getElementById('header-nav-contact-btn');
                if (contactBtn) contactBtn.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08d24] text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>طلب انضمام كشريك</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
