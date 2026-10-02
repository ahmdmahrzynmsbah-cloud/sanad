import { ProfessionalTypeOption, DEFAULT_PROFESSIONAL_TYPES } from '../types';

export const PROFESSIONAL_TYPES_STORAGE_KEY = 'sanad_cached_professional_types';

/**
 * Get cached professional types from localStorage or fallback to defaults
 */
export function getCachedProfessionalTypes(): ProfessionalTypeOption[] {
  if (typeof window === 'undefined') return [...DEFAULT_PROFESSIONAL_TYPES];
  try {
    const raw = localStorage.getItem(PROFESSIONAL_TYPES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached professional types:', e);
  }
  return [...DEFAULT_PROFESSIONAL_TYPES];
}

/**
 * Sync professional types to local storage and dispatch event
 */
export function saveCachedProfessionalTypes(types: ProfessionalTypeOption[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = [...types].sort((a, b) => (a.order || 0) - (b.order || 0));
    localStorage.setItem(PROFESSIONAL_TYPES_STORAGE_KEY, JSON.stringify(sorted));
    window.dispatchEvent(new CustomEvent('sanad_professional_types_updated', { detail: sorted }));
  } catch (e) {
    console.warn('Failed to save cached professional types:', e);
  }
}

/**
 * Fetch professional types from API, Firestore, and localStorage
 */
export async function fetchProfessionalTypes(): Promise<ProfessionalTypeOption[]> {
  let types: ProfessionalTypeOption[] = getCachedProfessionalTypes();

  // 1. Try API fetch
  try {
    const res = await fetch(`/api/professionals/types?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.types && Array.isArray(data.types) && data.types.length > 0) {
        types = data.types.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        saveCachedProfessionalTypes(types);
        return types;
      }
    }
  } catch {}

  // 2. Try direct Firestore fetch
  try {
    const { directFetchProfessionalTypesFromFirestore } = await import('./clientFirestore');
    const firestoreTypes = await directFetchProfessionalTypesFromFirestore();
    if (firestoreTypes && Array.isArray(firestoreTypes) && firestoreTypes.length > 0) {
      types = firestoreTypes.sort((a, b) => (a.order || 0) - (b.order || 0));
      saveCachedProfessionalTypes(types);
      return types;
    }
  } catch {}

  return types;
}

/**
 * Save / Update professional types list to API and Firestore
 */
export async function saveProfessionalTypesList(types: ProfessionalTypeOption[]): Promise<boolean> {
  const sorted = [...types].sort((a, b) => (a.order || 0) - (b.order || 0));
  saveCachedProfessionalTypes(sorted);

  // Background API save
  try {
    fetch('/api/admin/professionals/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ types: sorted }),
    }).catch(() => {});
  } catch {}

  // Background Firestore save
  try {
    const { directSaveProfessionalTypesToFirestore } = await import('./clientFirestore');
    await directSaveProfessionalTypesToFirestore(sorted).catch(() => {});
  } catch {}

  return true;
}
