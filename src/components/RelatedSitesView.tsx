import React, { useState, useEffect } from 'react';
import {
  Globe,
  ExternalLink,
  ShieldCheck,
  Search,
  ArrowRight,
  Landmark,
  FileText,
  Building2,
  BookOpen,
  Sparkles,
  Link2
} from 'lucide-react';
import { RelatedSite } from '../types';
import { useSync } from '../utils/sync';

interface RelatedSitesViewProps {
  onBackToHome: () => void;
  onGoToAdminPortal?: () => void;
  isAdmin?: boolean;
}

export const RelatedSitesView: React.FC<RelatedSitesViewProps> = ({
  onBackToHome,
  onGoToAdminPortal,
  isAdmin,
}) => {
  const [sites, setSites] = useState<RelatedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/related-sites');
      const data = await res.json();
      if (res.ok && data.relatedSites) {
        setSites(data.relatedSites);
      }
    } catch (err) {
      console.error('Failed to load related sites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useSync(['related_sites'], () => {
    fetchSites();
  });

  const categories = Array.from(
    new Set(sites.map((s) => s.category).filter(Boolean))
  ) as string[];

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      (site.title && site.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.url && site.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.category && site.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || site.category === selectedCategory;

    return matchesSearch && matchesCategory;
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
            <div className="w-10 h-10 rounded-xl bg-blue-800 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Globe className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                دليل المواقع والمنصات ذات الصلة
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                بوابات حكومية، تشريعية، واقتصادية فلسطينية معتمدة تخدم المكلفين والتجار والمستوردين
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
            <span>إدارة المواقع في لوحة التحكم</span>
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
            placeholder="ابحث باسم الموقع، الخدمات، أو الرابط..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll overscroll-x-contain w-full md:w-auto pb-1.5 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع المواقع ({sites.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-12 h-12 border-3 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">جارٍ تحميل دليل المواقع ذات الصلة...</p>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Globe className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لم يتم العثور على مواقع مطابقة</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery ? 'جرّب تعديل كلمات البحث أو اختيار تصنيف آخر.' : 'لم تتم إضافة مواقع ذات صلة بعد.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-blue-800 hover:underline cursor-pointer"
            >
              إعادة ضبط البحث
            </button>
          )}
        </div>
      ) : (
        /* Sites Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site, idx) => (
            <div
              key={site.id || idx}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-6 space-y-3">
                {/* Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    {site.category || 'موقع رسمي'}
                  </span>
                  {site.isOfficial !== false && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      جهة رسمية
                    </span>
                  )}
                </div>

                {/* Site Title */}
                <h3 className="text-base font-bold text-slate-950 group-hover:text-blue-800 transition-colors">
                  {site.title}
                </h3>

                {/* Site Description */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                  {site.description || 'بوابة رسمية متخصصة في الخدمات الحكومية والتشريعية في دولة فلسطين.'}
                </p>

                {/* Display URL */}
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono" dir="ltr">
                  <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{site.url.replace(/^https?:\/\//, '')}</span>
                </div>
              </div>

              {/* Card Footer: Direct Open Link Button */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-white hover:bg-blue-800 text-blue-900 hover:text-white border border-blue-200 hover:border-blue-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <span>زيارة الموقع الرسمي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
