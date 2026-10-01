import { Supervisor } from '../types';
import { directFetchSupervisorsFromFirestore } from './clientFirestore';
import { SEED_SUPERVISORS } from '../data/seedData';

export const SUPERVISORS_CACHE_KEY = 'sanad_cached_supervisors';

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
          return parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      }
    } catch (e) {
      console.warn('[supervisorsService] Error reading cached supervisors:', e);
    }
  }
  return (SEED_SUPERVISORS as unknown as Supervisor[]) || [];
}

/**
 * دالة تحديث متزامن للـ LocalStorage
 */
export function syncSupervisorsToLocalStorage(supervisors: Supervisor[]): void {
  if (typeof window !== 'undefined' && Array.isArray(supervisors)) {
    try {
      const sorted = [...supervisors].sort((a, b) => (a.order || 0) - (b.order || 0));
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

  // 3. الفرز حسب حقل الترتيب order
  if (items.length > 0) {
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
  } else {
    // استرجاع الكاش المحلي كحماية من انقطاع الاتصال
    items = getCachedSupervisors();
  }

  // 4. تحديث الـ LocalStorage متزامناً مع النتائج المجلوبة
  if (items.length > 0) {
    syncSupervisorsToLocalStorage(items);
  }

  return items;
}
