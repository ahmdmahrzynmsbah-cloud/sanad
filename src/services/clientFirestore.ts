import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import type { Law } from '../types';

const firebaseConfig = {
  projectId: 'pos1-d562e',
  appId: '1:607061495520:web:86e73b21063ba9c494ca85',
  apiKey: 'AIzaSyCmeCCutt5Q9NLuILm8i_XtM1QCSV4_aUo',
  authDomain: 'pos1-d562e.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605',
  storageBucket: 'pos1-d562e.firebasestorage.app',
  messagingSenderId: '607061495520',
};

let dbInstance: any = null;

export function getClientDb() {
  if (typeof window === 'undefined') return null;
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    if (!dbInstance) {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
    return dbInstance;
  } catch (err) {
    console.warn('[Client Firestore] Could not initialize:', err);
    return null;
  }
}

/**
 * Direct client-side Firestore fallback to save a law when serverless function is unreachable or fails.
 */
export async function directSaveLawToFirestore(law: Law): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const lawDoc = doc(db, 'laws', law.id);
    await setDoc(lawDoc, {
      id: law.id,
      title: law.title,
      category: law.category || 'جمارك',
      content: law.content,
      sourceFileName: law.sourceFileName || null,
      sourceFileSize: law.sourceFileSize || null,
      pageCount: law.pageCount || null,
      createdAt: law.createdAt || new Date().toISOString(),
      updatedAt: law.updatedAt || new Date().toISOString(),
    });
    console.log(`[Client Firestore] Successfully saved law directly: ${law.id}`);
    return true;
  } catch (err) {
    console.error(`[Client Firestore] Error saving law directly:`, err);
    return false;
  }
}

/**
 * Direct client-side batch save to Firestore.
 */
export async function directSaveLawsBatchToFirestore(laws: Law[]): Promise<{ success: Law[]; failedCount: number }> {
  const db = getClientDb();
  if (!db) return { success: [], failedCount: laws.length };

  const success: Law[] = [];
  let failedCount = 0;

  // Process in small batches of 5 to avoid browser network congestion
  for (let i = 0; i < laws.length; i += 5) {
    const slice = laws.slice(i, i + 5);
    await Promise.all(
      slice.map(async (law) => {
        const ok = await directSaveLawToFirestore(law);
        if (ok) {
          success.push(law);
        } else {
          failedCount++;
        }
      })
    );
  }

  return { success, failedCount };
}

/**
 * Direct client-side fetch from Firestore as fallback.
 */
export async function directFetchLawsFromFirestore(): Promise<Law[] | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const col = collection(db, 'laws');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const items: Law[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      items.push({
        id: data.id || d.id,
        title: data.title || '',
        category: data.category || 'جمارك',
        content: data.content || '',
        sourceFileName: data.sourceFileName || undefined,
        sourceFileSize: data.sourceFileSize || undefined,
        pageCount: data.pageCount || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching laws directly:', err);
    return null;
  }
}

/**
 * Direct client-side delete from Firestore as fallback.
 */
export async function directDeleteLawFromFirestore(lawId: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const lawDoc = doc(db, 'laws', lawId);
    await deleteDoc(lawDoc);
    console.log(`[Client Firestore] Successfully deleted law directly: ${lawId}`);
    return true;
  } catch (err) {
    console.error(`[Client Firestore] Error deleting law directly:`, err);
    return false;
  }
}

