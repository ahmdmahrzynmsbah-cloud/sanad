import { Supervisor } from '../types';
import {
  directFetchSupervisorsFromFirestore,
  directFetchSupervisorsPaginatedFromFirestore,
  PaginatedSupervisorsResult,
} from './clientFirestore';

export const SUPERVISORS_CACHE_KEY = 'sanad_cached_supervisors';

/**
 * تنقية قائمة المشرفين والتحقق من صحة البيانات
 */
export function cleanSupervisorsList(list: any[]): Supervisor[] {
  if (!Array.isArray(list)) return [];
  // Ensure every item is a valid supervisor object with at least a name
  return list.filter((s) => s && typeof s === 'object' && (s.name || s.title));
}

/**
 * دالة قراءة فورية من الـ LocalStorage (0 مللي ثانية)
 */
export function getCachedSupervisors(): Supervisor[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(SUPERVISORS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = cleanSupervisorsList(parsed);
          return cleaned.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      }
    } catch (e) {
      console.warn('[supervisorsService] Error reading cached supervisors:', e);
    }
  }
  return [];
}

/**
 * دالة تحديث متزامن للـ LocalStorage
 */
export function syncSupervisorsToLocalStorage(supervisors: Supervisor[]): void {
  if (typeof window !== 'undefined' && Array.isArray(supervisors)) {
    try {
      const cleaned = cleanSupervisorsList(supervisors);
      const sorted = [...cleaned].sort((a, b) => (a.order || 0) - (b.order || 0));
      localStorage.setItem(SUPERVISORS_CACHE_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.warn('[supervisorsService] Error syncing supervisors to localStorage:', e);
    }
  }
}

/**
 * دالة 'fetchSupervisors' موحدة لجلب المشرفين مباشرة من Firestore
 * وتحديث الـ LocalStorage بشكل متزامن وفوري عند أي تغيير
 */
export async function fetchSupervisors(options?: { preferCacheFirst?: boolean }): Promise<Supervisor[]> {
  let items: Supervisor[] = [];

  // 1. محاولة الجلب المباشر من Google Cloud Firestore
  try {
    const cloudItems = await directFetchSupervisorsFromFirestore();
    if (cloudItems && Array.isArray(cloudItems) && cloudItems.length > 0) {
      items = cloudItems as Supervisor[];
    }
  } catch (err) {
    console.warn('[supervisorsService] Direct Firestore fetch failed:', err);
  }

  // 2. إذا لم تتوفر السحابة أو أعادت فارغاً، الجلب السريع من الخادم عبر API
  if (items.length === 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`/api/supervisors?t=${Date.now()}`, {
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        if (data.supervisors && Array.isArray(data.supervisors) && data.supervisors.length > 0) {
          items = data.supervisors;
        }
      }
    } catch (apiErr) {
      console.warn('[supervisorsService] Fallback API fetch failed:', apiErr);
    }
  }

  // 3. تنقية واستبعاد المشرفين الوهميين والفرز حسب حقل الترتيب order
  if (items.length > 0) {
    items = cleanSupervisorsList(items);
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
  } else {
    items = getCachedSupervisors();
  }

  // 4. تحديث الـ LocalStorage متزامناً مع النتائج الحقيقية المجلوبة
  syncSupervisorsToLocalStorage(items);

  return items;
}

/**
 * دالة جلب مجزأ ومباشر (Paginated Lazy Load) للمشرفين من Firestore
 * لتخفيض حجم البيانات المجلوبة ووحدات القراءة السحابية
 */
export async function fetchSupervisorsPaginated(options: {
  pageSize?: number;
  lastDoc?: any;
  department?: string;
}): Promise<PaginatedSupervisorsResult> {
  try {
    const res = await directFetchSupervisorsPaginatedFromFirestore(options);
    const cleaned = cleanSupervisorsList(res.items);
    return {
      items: cleaned,
      lastDoc: res.lastDoc,
      hasMore: res.hasMore,
    };
  } catch (err) {
    console.warn('[supervisorsService] Paginated fetch failed:', err);
    return { items: [], lastDoc: null, hasMore: false };
  }
}
