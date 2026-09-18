import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc as firebaseSetDoc,
  updateDoc as firebaseUpdateDoc,
  deleteDoc as firebaseDeleteDoc,
  query,
  where,
  Firestore,
  DocumentReference,
  setLogLevel,
} from 'firebase/firestore';

// Suppress internal Firestore connection state logs such as idle stream disconnects
try {
  setLogLevel('error');
} catch {
  // Ignore
}

// Filter console to ignore non-critical Firebase idle stream disconnect warnings
const originalWarn = console.warn;
const originalError = console.error;
const isIdleStreamNotice = (args: any[]): boolean => {
  const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  return (
    text.includes('Disconnecting idle stream') ||
    text.includes('Timed out waiting for new targets') ||
    (text.includes('GrpcConnection') && text.includes('CANCELLED'))
  );
};

console.warn = (...args: any[]) => {
  if (isIdleStreamNotice(args)) return;
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  if (isIdleStreamNotice(args)) return;
  originalError.apply(console, args);
};

export type ChangeCallback = (collectionName: string) => void;
const changeListeners: ChangeCallback[] = [];

// Recursive helper to remove undefined values before saving to Firestore
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(v => v !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export function onDatabaseChange(callback: ChangeCallback) {
  changeListeners.push(callback);
}

function notifyChange(collectionName: string) {
  changeListeners.forEach(cb => {
    try {
      cb(collectionName);
    } catch (e) {
      console.error('Error in changeListener callback:', e);
    }
  });
}

async function setDoc(docRef: DocumentReference<any, any>, data: any, options?: any) {
  const cleanData = cleanUndefined(data);
  const result = options ? await firebaseSetDoc(docRef, cleanData, options) : await firebaseSetDoc(docRef, cleanData);
  try {
    if (docRef?.parent?.id) {
      notifyChange(docRef.parent.id);
    }
  } catch (e) {
    console.error('notifyChange error in setDoc:', e);
  }
  return result;
}

async function updateDoc(docRef: DocumentReference<any, any>, data: any) {
  const cleanData = cleanUndefined(data);
  const result = await firebaseUpdateDoc(docRef, cleanData);
  try {
    if (docRef?.parent?.id) {
      notifyChange(docRef.parent.id);
    }
  } catch (e) {
    console.error('notifyChange error in updateDoc:', e);
  }
  return result;
}

async function deleteDoc(docRef: DocumentReference<any, any>) {
  const result = await firebaseDeleteDoc(docRef);
  try {
    if (docRef?.parent?.id) {
      notifyChange(docRef.parent.id);
    }
  } catch (e) {
    console.error('notifyChange error in deleteDoc:', e);
  }
  return result;
}

export interface StoredUser {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  recoveryCode?: string;
  password: string;
  role: 'user' | 'admin' | 'supervisor';
  status: 'pending' | 'approved' | 'rejected' | 'frozen';
  createdAt: string;
  reviewedAt?: string;

  // Subscription & Trial Policy
  subscriptionStatus?: 'trial' | 'active' | 'frozen';
  trialDays?: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isSubscribed?: boolean;
  subscriptionPlan?: string;
  subscribedAt?: string;
  frozenAt?: string;
  freezeReason?: string;
  remainingTrialDays?: number;
  remainingTrialHours?: number;
}

export interface StoredLaw {
  id: string;
  title: string;
  category: string;
  content: string;
  sourceFileName?: string;
  sourceFileSize?: string;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredLawRequest {
  id: string;
  title: string;
  category: string;
  content: string;
  description?: string;
  sourceFileName?: string;
  sourceFileSize?: string;
  pageCount?: number;
  userId?: string;
  userName?: string;
  userFullName?: string;
  userPhone?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface StoredCategory {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: string;
}

let firestoreDb: Firestore | null = null;
let isInitialized = false;

// Quota circuit-breaker: When Firestore free quota is exceeded, suspend cloud calls
// and cleanly fall back to local persistence for 15 minutes before retrying.
let isFirestoreQuotaExceeded = false;
let quotaExceededResetTime = 0;

export function isQuotaExceeded(): boolean {
  if (!isFirestoreQuotaExceeded) return false;
  if (Date.now() > quotaExceededResetTime) {
    // Reset circuit breaker to attempt again
    isFirestoreQuotaExceeded = false;
    quotaExceededResetTime = 0;
    console.log('🔄 Firestore quota cooldown elapsed. Re-enabling Firestore connection attempts.');
    return false;
  }
  return true;
}

export function handleFirestoreError(context: string, err: any): void {
  const errMsg = String(err?.message || err || '');
  const errCode = String(err?.code || '');
  if (
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('quota metric') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errCode === 'resource-exhausted'
  ) {
    if (!isFirestoreQuotaExceeded) {
      isFirestoreQuotaExceeded = true;
      // 15-minute cooldown before re-attempting cloud reads/writes
      quotaExceededResetTime = Date.now() + 15 * 60 * 1000;
      console.warn(`⚠️ [Firestore Free-Tier Quota] Daily quota limit reached during [${context}]. Gracefully activating local caching & fallback mode for 15 minutes.`);
    }
  } else {
    console.error(`Error in [${context}]:`, err);
  }
}

const DEFAULT_FIREBASE_CONFIG = {
  projectId: "pos1-d562e",
  appId: "1:607061495520:web:86e73b21063ba9c494ca85",
  apiKey: "AIzaSyCmeCCutt5Q9NLuILm8i_XtM1QCSV4_aUo",
  authDomain: "pos1-d562e.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605",
  storageBucket: "pos1-d562e.firebasestorage.app",
  messagingSenderId: "607061495520",
};

export function initFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    let config = DEFAULT_FIREBASE_CONFIG;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (parsed && parsed.apiKey && parsed.projectId) {
          config = parsed;
        }
      }
    } catch {
      // Ignore file error and fallback to DEFAULT_FIREBASE_CONFIG
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreDb = getFirestore(app, config.firestoreDatabaseId || undefined);
    isInitialized = true;
    console.log('✅ Firestore Database connected successfully to project:', config.projectId, 'Database ID:', config.firestoreDatabaseId);
    return firestoreDb;
  } catch (err) {
    console.error('❌ Failed to initialize Firestore:', err);
    return null;
  }
}

export async function fetchUsersFromFirestore(): Promise<StoredUser[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    if (snapshot.empty) {
      return [];
    }

    const users: StoredUser[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StoredUser;
      users.push({
        id: docSnap.id,
        ...data,
      });
    });
    return users;
  } catch (err) {
    handleFirestoreError('fetchUsersFromFirestore', err);
    return null;
  }
}

export async function saveUserToFirestore(user: StoredUser): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      id: user.id,
      username: user.username,
      fullName: user.fullName || '',
      phone: user.phone || '',
      recoveryCode: user.recoveryCode || '',
      password: user.password,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      reviewedAt: user.reviewedAt || '',
      subscriptionStatus: user.subscriptionStatus || 'trial',
      trialDays: typeof user.trialDays === 'number' ? user.trialDays : 7,
      trialStartedAt: user.trialStartedAt || user.createdAt,
      trialEndsAt: user.trialEndsAt || '',
      isSubscribed: Boolean(user.isSubscribed),
      subscriptionPlan: user.subscriptionPlan || '',
      subscribedAt: user.subscribedAt || '',
      frozenAt: user.frozenAt || '',
      freezeReason: user.freezeReason || '',
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveUserToFirestore ${user.id}`, err);
    return false;
  }
}

export interface StoredSettings {
  autoApproveNewUsers: boolean;
  defaultTrialDays: number;
  trialPolicyEnabled?: boolean;
  systemName?: string;
  systemSubtitle?: string;
  systemBadge?: string;
  logoType?: 'preset' | 'url' | 'upload';
  logoPreset?: string;
  logoUrl?: string;
  logoAccentColor?: string;

  // Founder & Site Overview
  founderName?: string;
  founderTitle?: string;
  founderBio?: string;
  founderPhotoUrl?: string;
  founderQuote?: string;
  siteOverview?: string;

  // Auth Portal Dynamic Texts
  authPortalHeaderTop?: string;
  authPortalHeaderBottom?: string;
  authPortalTitle?: string;
  authPortalSubtitle?: string;
  authPortalDescription?: string;
  authPortalFeature1?: string;
  authPortalFeature2?: string;
  authPortalFeature3?: string;
}

export async function fetchSettingsFromFirestore(): Promise<StoredSettings | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const settingsCol = collection(db, 'system_settings');
    const snapshot = await getDocs(settingsCol);
    if (snapshot.empty) {
      return null;
    }
    let found: StoredSettings | null = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === 'general') {
        found = docSnap.data() as StoredSettings;
      }
    });
    return found;
  } catch (err) {
    handleFirestoreError('fetchSettingsFromFirestore', err);
    return null;
  }
}

export async function saveSettingsToFirestore(settings: StoredSettings): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    // Strip undefined values to prevent Firestore errors
    const cleanSettings = Object.fromEntries(Object.entries(settings).filter(([_, v]) => v !== undefined));
    await setDoc(settingsRef, cleanSettings, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError('saveSettingsToFirestore', err);
    return false;
  }
}

export async function updateUserInFirestore(
  userId: string,
  partial: Partial<StoredUser>
): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, partial as any, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(`updateUserInFirestore ${userId}`, err);
    return false;
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) {
    console.error(`Error deleting user ${userId} from Firestore: DB not initialized.`);
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    console.log(`Successfully deleted user ${userId} from Firestore.`);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteUserFromFirestore ${userId}`, err);
    throw err; // Re-throw to allow the route handler to catch it
  }
}

export async function fetchLawsFromFirestore(): Promise<StoredLaw[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const lawsCol = collection(db, 'laws');
    const snapshot = await getDocs(lawsCol);
    if (snapshot.empty) {
      return [];
    }

    const laws: StoredLaw[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StoredLaw;
      laws.push({
        id: docSnap.id,
        ...data,
      });
    });
    return laws;
  } catch (err) {
    handleFirestoreError('fetchLawsFromFirestore', err);
    return null;
  }
}

export async function saveLawToFirestore(law: StoredLaw): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const lawRef = doc(db, 'laws', law.id);
    await setDoc(lawRef, {
      id: law.id,
      title: law.title,
      category: law.category,
      content: law.content,
      sourceFileName: law.sourceFileName || '',
      sourceFileSize: law.sourceFileSize || '',
      pageCount: law.pageCount || 0,
      createdAt: law.createdAt,
      updatedAt: law.updatedAt,
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveLawToFirestore ${law.id}`, err);
    return false;
  }
}

export async function updateLawInFirestore(
  lawId: string,
  partial: Partial<StoredLaw>
): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const lawRef = doc(db, 'laws', lawId);
    await updateDoc(lawRef, partial as any);
    return true;
  } catch (err) {
    handleFirestoreError(`updateLawInFirestore ${lawId}`, err);
    return false;
  }
}

export async function deleteLawFromFirestore(lawId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const lawRef = doc(db, 'laws', lawId);
    await deleteDoc(lawRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteLawFromFirestore ${lawId}`, err);
    return false;
  }
}

export async function fetchLawRequestsFromFirestore(): Promise<StoredLawRequest[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'law_requests');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }

    const requests: StoredLawRequest[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StoredLawRequest;
      requests.push({
        id: docSnap.id,
        ...data,
      });
    });
    return requests;
  } catch (err) {
    handleFirestoreError('fetchLawRequestsFromFirestore', err);
    return null;
  }
}

export async function saveLawRequestToFirestore(request: StoredLawRequest): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'law_requests', request.id);
    await setDoc(docRef, {
      id: request.id,
      title: request.title,
      category: request.category || 'جمارك',
      content: request.content || '',
      description: request.description || '',
      sourceFileName: request.sourceFileName || null,
      sourceFileSize: request.sourceFileSize || null,
      pageCount: request.pageCount || null,
      userId: request.userId || '',
      userName: request.userName || '',
      userFullName: request.userFullName || '',
      userPhone: request.userPhone || '',
      status: request.status || 'pending',
      rejectionReason: request.rejectionReason || '',
      createdAt: request.createdAt || new Date().toISOString(),
      reviewedAt: request.reviewedAt || null,
      reviewedBy: request.reviewedBy || null,
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveLawRequestToFirestore ${request.id}`, err);
    return false;
  }
}

export async function updateLawRequestInFirestore(
  requestId: string,
  partial: Partial<StoredLawRequest>
): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'law_requests', requestId);
    await updateDoc(docRef, partial as any);
    return true;
  } catch (err) {
    handleFirestoreError(`updateLawRequestInFirestore ${requestId}`, err);
    return false;
  }
}

export async function deleteLawRequestFromFirestore(requestId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'law_requests', requestId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteLawRequestFromFirestore ${requestId}`, err);
    return false;
  }
}

export async function fetchCategoriesFromFirestore(): Promise<StoredCategory[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const catCol = collection(db, 'legal_categories');
    const snapshot = await getDocs(catCol);
    if (snapshot.empty) {
      return [];
    }

    const categories: StoredCategory[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StoredCategory;
      categories.push({
        id: docSnap.id,
        ...data,
      });
    });
    return categories;
  } catch (err) {
    handleFirestoreError('fetchCategoriesFromFirestore', err);
    return null;
  }
}

export async function saveCategoryToFirestore(category: StoredCategory): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const catRef = doc(db, 'legal_categories', category.id);
    await setDoc(catRef, {
      id: category.id,
      name: category.name,
      isDefault: category.isDefault ?? false,
      createdAt: category.createdAt,
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveCategoryToFirestore ${category.id}`, err);
    return false;
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const catRef = doc(db, 'legal_categories', categoryId);
    await deleteDoc(catRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteCategoryFromFirestore ${categoryId}`, err);
    return false;
  }
}

// ----------------------------------------------------
// Supervisors Management (إدارة المشرفين)
// ----------------------------------------------------
export interface StoredSupervisor {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  department?: string;
  order?: number;
  createdAt: string;
}

export async function fetchSupervisorsFromFirestore(): Promise<StoredSupervisor[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'supervisors');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: StoredSupervisor[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...(docSnap.data() as StoredSupervisor),
      });
    });
    // sort by order if present
    items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    return items;
  } catch (err) {
    handleFirestoreError('fetchSupervisorsFromFirestore', err);
    return null;
  }
}

export async function saveSupervisorToFirestore(supervisor: StoredSupervisor): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'supervisors', supervisor.id);
    await setDoc(docRef, {
      id: supervisor.id,
      name: supervisor.name,
      title: supervisor.title,
      bio: supervisor.bio,
      photoUrl: supervisor.photoUrl || '',
      email: supervisor.email || '',
      phone: supervisor.phone || '',
      department: supervisor.department || '',
      order: typeof supervisor.order === 'number' ? supervisor.order : 1,
      createdAt: supervisor.createdAt || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveSupervisorToFirestore ${supervisor.id}`, err);
    return false;
  }
}

export async function deleteSupervisorFromFirestore(supervisorId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'supervisors', supervisorId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteSupervisorFromFirestore ${supervisorId}`, err);
    return false;
  }
}

// ----------------------------------------------------
// Related Sites Management (مواقع ذات صلة)
// ----------------------------------------------------
export interface StoredRelatedSite {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  iconType?: string;
  isOfficial?: boolean;
  createdAt: string;
}

export async function fetchRelatedSitesFromFirestore(): Promise<StoredRelatedSite[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'related_sites');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: StoredRelatedSite[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...(docSnap.data() as StoredRelatedSite),
      });
    });
    return items;
  } catch (err) {
    handleFirestoreError('fetchRelatedSitesFromFirestore', err);
    return null;
  }
}

export async function saveRelatedSiteToFirestore(site: StoredRelatedSite): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'related_sites', site.id);
    await setDoc(docRef, {
      id: site.id,
      title: site.title,
      description: site.description,
      url: site.url,
      category: site.category || 'مواقع رسمية',
      iconType: site.iconType || 'landmark',
      isOfficial: site.isOfficial ?? true,
      createdAt: site.createdAt || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveRelatedSiteToFirestore ${site.id}`, err);
    return false;
  }
}

export async function deleteRelatedSiteFromFirestore(siteId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'related_sites', siteId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteRelatedSiteFromFirestore ${siteId}`, err);
    return false;
  }
}

// ----------------------------------------------------
// Partners Management (شركاؤنا - المؤسسات الشريكة)
// ----------------------------------------------------
export interface StoredPartner {
  id: string;
  name: string;
  description: string;
  category: string;
  partnershipType?: string;
  logoUrl?: string;
  websiteUrl?: string;
  order?: number;
  isActive?: boolean;
  createdAt: string;
}

export const DEFAULT_PARTNERS: StoredPartner[] = [
  {
    id: 'partner-1',
    name: 'نقابة مدققي الحسابات القانونيين الفلسطينية (PACPA)',
    description: 'تعاون مهني ومعرفي لاعتماد المنظومة كمرجع ذكي موثوق لمدققي الحسابات والمحاسبين القانونيين في فلسطين في تدقيق الضرائب والبيانات المالية.',
    category: 'نقابات وجمعيات مهنية',
    partnershipType: 'شريك مهني وتدريبي',
    logoUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.pacpa.ps',
    order: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'partner-2',
    name: 'اتحاد الغرف التجارية الصناعية الزراعية الفلسطينية',
    description: 'شراكة استراتيجية لتمكين قطاع التجار والمستوردين وأصحاب الأعمال من فهم التعريفة الجمركية والامتثال الضريبي وتسهيل المعاملات التجارية.',
    category: 'اتحادات وقطاع خاص',
    partnershipType: 'شريك استراتيجي',
    logoUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.pal-chambers.org',
    order: 2,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'partner-3',
    name: 'جمعية البنوك في فلسطين (ABP)',
    description: 'تنسيق وتكامل حول المعايير والسياسات الضريبية والائتمانية المنظمة للعمليات المصرفية والتحويلات المالية والتسهيلات البنكية.',
    category: 'بنوك ومؤسسات مالية',
    partnershipType: 'شريك مالي واستشاري',
    logoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.abp.ps',
    order: 3,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'partner-4',
    name: 'معهد أبحاث السياسات الاقتصادية الفلسطيني (ماس - MAS)',
    description: 'تعاون بحثي وعلمي في مجال تحليل السياسات المالية العامة، والتشريعات الاقتصادية، ودراسة الآثار التنموية للضرائب والجمارك.',
    category: 'مراكز أبحاث ودراسات',
    partnershipType: 'شريك بحثي وأكاديمي',
    logoUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.mas.ps',
    order: 4,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'partner-5',
    name: 'جامعة بيرزيت - كلية الأعمال والاقتصاد',
    description: 'شراكة أكاديمية لتدريب طلبة المحاسبة والعلوم المالية وتأهيلهم على المنظومات الذكية للتشريعات الضريبية والجمركية وتطبيقاتها العملية.',
    category: 'جامعات ومؤسسات أكاديمية',
    partnershipType: 'اعتماد أكاديمي وتدريب',
    logoUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=300&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.birzeit.edu',
    order: 5,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'partner-6',
    name: 'ملتقى رجال الأعمال الفلسطيني',
    description: 'دعم وتمكين الشركات الوطنية والمستثمرين في الاستفادة من الحوافز الاستثمارية وقوانين تشجيع الاستثمار والامتثال للأنظمة الضريبية.',
    category: 'اتحادات وقطاع خاص',
    partnershipType: 'شريك قطاع الأعمال',
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80',
    websiteUrl: 'https://www.pbf.ps',
    order: 6,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function fetchPartnersFromFirestore(): Promise<StoredPartner[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'partners');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: StoredPartner[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...(docSnap.data() as StoredPartner),
      });
    });
    return items;
  } catch (err) {
    handleFirestoreError('fetchPartnersFromFirestore', err);
    return null;
  }
}

export async function savePartnerToFirestore(partner: StoredPartner): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'partners', partner.id);
    await setDoc(docRef, {
      id: partner.id,
      name: partner.name,
      description: partner.description,
      category: partner.category || 'مؤسسات شريكة',
      partnershipType: partner.partnershipType || 'شريك استراتيجي',
      logoUrl: partner.logoUrl || '',
      websiteUrl: partner.websiteUrl || '',
      order: partner.order || 0,
      isActive: partner.isActive !== false,
      createdAt: partner.createdAt || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(`savePartnerToFirestore ${partner.id}`, err);
    return false;
  }
}

export async function deletePartnerFromFirestore(partnerId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'partners', partnerId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deletePartnerFromFirestore ${partnerId}`, err);
    return false;
  }
}

// --------------------------------------------------------------------------
// Subscription Plans (خطط وباقات الاشتراك)
// --------------------------------------------------------------------------
export interface StoredSubscriptionPlan {
  id: string;
  name: string;
  badge?: string;
  price: number | string;
  currency?: string;
  billingPeriod: string;
  description: string;
  features: string[];
  notIncludedFeatures?: string[];
  isPopular?: boolean;
  buttonText?: string;
  buttonActionType?: 'register' | 'contact' | 'whatsapp' | 'custom_url';
  buttonLink?: string;
  whatsappCustomMessage?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_SUBSCRIPTION_PLANS: StoredSubscriptionPlan[] = [
  {
    id: 'plan-trial',
    name: 'الخطة التجريبية (المجانية)',
    badge: 'تجربة مجانية',
    price: 0,
    currency: '₪',
    billingPeriod: 'لمدة 7 أيام',
    description: 'استكشف قوة الذكاء الاصطناعي التشريعي وسهولة الاستعلام عن القوانين الفلسطينية مجاناً.',
    features: [
      'الوصول لجميع نصوص القوانين والتشريعات (52+ قانون وقرار بقانون)',
      'استشارات ذكية وفورية مع المستشار القانوني سَنَد 24/7',
      'تخريج أرقام المواد والفقرات القانونية مع كل إجابة',
      'دعم العمل المزدوج عبر الهواتف الذكية وأجهزة الكمبيوتر',
    ],
    notIncludedFeatures: [
      'تصدير المذكرات والاستشارات بصيغ رسمية قابلة للطباعة',
      'دعم واستشارات مخصصة لملفات التدقيق والمقاصة المعقدة',
    ],
    isPopular: false,
    buttonText: 'ابدأ تجربتك المجانية الآن',
    buttonActionType: 'register',
    order: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-pro',
    name: 'الباقة الاحترافية (المحاسبون والمحامون)',
    badge: 'الأكثر طلباً',
    price: 99,
    currency: '₪',
    billingPeriod: 'شهرياً',
    description: 'الخيار الأمثل للمحاسبين القانونيين، المحامين، المستشارين الضريبيين، وأصحاب الأعمال.',
    features: [
      'استعلامات واستشارات غير محدودة على مدار الساعة',
      'تغطية شاملة لكافة قوانين الجمارك، ضريبة الدخل، وضريبة القيمة المضافة',
      'محاكاة حسابية فورية للضرائب والجمارك الفلسطينية بالشيكل',
      'تصدير وتوثيق المذكرات والاستشارات القانونية والضريبية',
      'إمكانية تقديم اقتراحات وإضافة قوانين ولوائح تنظيمية جديدة للمراجعة',
      'دعم فني واستشاري ذو أولوية عبر واتساب',
    ],
    notIncludedFeatures: [],
    isPopular: true,
    buttonText: 'اشترك الآن في الباقة الاحترافية',
    buttonActionType: 'whatsapp',
    whatsappCustomMessage: 'مرحباً، أرغب بالاشتراك في الباقة الاحترافية (المحاسبون والمحامون) في منصة مساعد الجمارك والضرائب الفلسطينية',
    order: 2,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-enterprise',
    name: 'باقة الشركات والمؤسسات الكبرى',
    badge: 'للشركات والمصانع',
    price: 249,
    currency: '₪',
    billingPeriod: 'شهرياً',
    description: 'حلول تشريعية وضريبية وجمركية متقدمة للشركات الكبرى، المصانع، والمكاتب الاستشارية متعددة الفروع.',
    features: [
      'كل مميزات الباقة الاحترافية مع صلاحيات وصول متعددة لفريق العمل',
      'استشارات متقدمة في التجارة الخارجية وملفات المقاصة والبيانات الجمركية',
      'أرشفة مركزية لتقارير واستفسارات الفريق مع سجل زمني كامل',
      'إسناد تشريعي لاتفاقيات التجارة الحرة والتعرفة الجمركية التفضيلية',
      'مدير حساب استشاري مخصص وجلسات تدريب وتأهيل لفريق المحاسبة',
    ],
    notIncludedFeatures: [],
    isPopular: false,
    buttonText: 'تواصل للاشتراك المؤسسي',
    buttonActionType: 'whatsapp',
    whatsappCustomMessage: 'مرحباً، نود الاستفسار عن باقة الشركات والمؤسسات الكبرى في منصة مساعد الجمارك والضرائب الفلسطينية',
    order: 3,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function fetchSubscriptionPlansFromFirestore(): Promise<StoredSubscriptionPlan[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'subscription_plans');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: StoredSubscriptionPlan[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...(docSnap.data() as StoredSubscriptionPlan),
      });
    });
    // Sort by order
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    return items;
  } catch (err) {
    handleFirestoreError('fetchSubscriptionPlansFromFirestore', err);
    return null;
  }
}

export async function saveSubscriptionPlanToFirestore(plan: StoredSubscriptionPlan): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'subscription_plans', plan.id);
    await setDoc(docRef, {
      id: plan.id,
      name: plan.name,
      badge: plan.badge || '',
      price: plan.price,
      currency: plan.currency || '₪',
      billingPeriod: plan.billingPeriod || 'شهرياً',
      description: plan.description || '',
      features: plan.features || [],
      notIncludedFeatures: plan.notIncludedFeatures || [],
      isPopular: plan.isPopular ?? false,
      buttonText: plan.buttonText || 'اشترك الآن',
      buttonActionType: plan.buttonActionType || 'register',
      buttonLink: plan.buttonLink || '',
      whatsappCustomMessage: plan.whatsappCustomMessage || '',
      order: plan.order || 0,
      isActive: plan.isActive !== false,
      createdAt: plan.createdAt || new Date().toISOString(),
      updatedAt: plan.updatedAt || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveSubscriptionPlanToFirestore ${plan.id}`, err);
    return false;
  }
}

export async function deleteSubscriptionPlanFromFirestore(planId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'subscription_plans', planId);
    await deleteDoc(docRef);

    try {
      const col = collection(db, 'subscription_plans');
      const q = query(col, where('id', '==', planId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const promises = snap.docs.map((d) => deleteDoc(d.ref as any));
        await Promise.all(promises);
      }
    } catch {
      // Non-blocking
    }

    return true;
  } catch (err) {
    handleFirestoreError(`deleteSubscriptionPlanFromFirestore ${planId}`, err);
    return false;
  }
}

// ----------------------------------------------------
// Platform About & Vision/Mission Management (عن المنصة والرؤية والرسالة)
// ----------------------------------------------------
export interface StoredAboutCard {
  id: string;
  title: string;
  content: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface StoredPlatformAbout {
  overviewTitle?: string;
  overviewContent: string;
  visionTitle?: string;
  visionContent: string;
  missionTitle?: string;
  missionContent: string;
  customSections?: StoredAboutCard[];
  updatedAt?: string;
}

export const DEFAULT_PLATFORM_ABOUT: StoredPlatformAbout = {
  overviewTitle: 'عن منصة «سَنَد»',
  overviewContent:
    '«سَنَد» هي منصتك القانونية والمالية الذكية الأولى في فلسطين، صُممت لتكون مرجعك الموثوق في الضرائب والقوانين والتشريعات والتحليل المالي والمساعدة في التدقيق. نحن نقدم أدوات ذكية وأنظمة متطورة لدعم المدققين والمحاسبين، وشركات التدقيق ومكاتب التدقيق والمحاسبة، والمدراء الماليين والمهتمين من القطاع الخاص، مع تحديثات مستمرة لتسهيل أعمالكم وتعزيز كفاءتكم التشغيلية.',
  visionTitle: 'رؤيتنا (Vision)',
  visionContent:
    'أن نكون المنظومة الذكية الأولى والرائدة في فلسطين والمنطقة، التي تربط التشريعات والقوانين بالحلول المالية والمحاسبية المتقدمة، لتمكين قطاع الأعمال والمحاسبين من اتخاذ قرارات دقيقة بكل ثقة.',
  missionTitle: 'رسالتنا (Mission)',
  missionContent:
    'تمكين المحاسبين، ومكاتب المحاسبة، والشركات، والقطاع الخاص من خلال توفير منصة ذكية تدمج قواعد المعرفة القانونية والضريبية بالذكاء الاصطناعي والأدوات المالية، لتوفير الوقت، وضمان الامتثال، وتبسيط أعقد الإجراءات الإدارية والقانونية بدقة متناهية ومصادر موثوقة.',
  customSections: [],
  updatedAt: new Date().toISOString(),
};

export async function fetchPlatformAboutFromFirestore(): Promise<StoredPlatformAbout | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const docSnap = await getDocs(collection(db, 'system_settings'));
    let found: StoredPlatformAbout | null = null;
    docSnap.forEach((snap) => {
      if (snap.id === 'platform_about') {
        found = snap.data() as StoredPlatformAbout;
      }
    });
    return found;
  } catch (err) {
    handleFirestoreError('fetchPlatformAboutFromFirestore', err);
    return null;
  }
}

export async function savePlatformAboutToFirestore(data: StoredPlatformAbout): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'system_settings', 'platform_about');
    await setDoc(docRef, {
      overviewTitle: data.overviewTitle || DEFAULT_PLATFORM_ABOUT.overviewTitle,
      overviewContent: data.overviewContent || DEFAULT_PLATFORM_ABOUT.overviewContent,
      visionTitle: data.visionTitle || DEFAULT_PLATFORM_ABOUT.visionTitle,
      visionContent: data.visionContent || DEFAULT_PLATFORM_ABOUT.visionContent,
      missionTitle: data.missionTitle || DEFAULT_PLATFORM_ABOUT.missionTitle,
      missionContent: data.missionContent || DEFAULT_PLATFORM_ABOUT.missionContent,
      customSections: data.customSections || [],
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving platform_about to Firestore:', err);
    return false;
  }
}

// ----------------------------------------------------
// Contact Us Info Management (بيانات التواصل واتساب وبريد إلكتروني)
// ----------------------------------------------------
export interface StoredContactWhatsappItem {
  id: string;
  name: string;
  number: string;
  description?: string;
}

export interface StoredContactPhoneItem {
  id: string;
  name: string;
  number: string;
}

export interface StoredContactInfo {
  whatsappNumbers: StoredContactWhatsappItem[];
  email: string;
  secondaryEmail?: string;
  phoneNumbers?: StoredContactPhoneItem[];
  workHours?: string;
  address?: string;
  notes?: string;
  updatedAt?: string;
}

export const DEFAULT_CONTACT_INFO: StoredContactInfo = {
  whatsappNumbers: [
    {
      id: 'wa-1',
      name: 'الدعم الفني والاستفسارات العامة',
      number: '0599123456',
      description: 'متاح للرد على المشاكل التقنية واستفسارات المنظومة والمكلفين',
    },
    {
      id: 'wa-2',
      name: 'خدمة المشتركين والمراجعات الجمركية',
      number: '0568987654',
      description: 'لتفعيل وتجديد الاشتراكات الدائمة والمتابعات التشريعية',
    },
  ],
  email: 'support@pal-customs.ps',
  secondaryEmail: 'info@customs.pmof.ps',
  phoneNumbers: [
    {
      id: 'ph-1',
      name: 'هاتف الإدارة العامة (رام الله)',
      number: '+970 2 297 8888',
    },
  ],
  workHours: 'الأحد - الخميس: 8:00 صباحاً - 3:30 مساءً (الاستجابة عبر الواتساب على مدار الساعة)',
  address: 'دولة فلسطين • رام الله والبيرة • مجمع الوزارات • وزارة المالية - الإدارة العامة للجمارك وضريبة القيمة المضافة',
  notes: 'فريق العمل والمستشارون متاحون للتواصل الفوري عبر قنوات الواتساب المباشرة أو البريد الإلكتروني الرسمي.',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function fetchContactInfoFromFirestore(): Promise<StoredContactInfo | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const docSnap = await getDocs(collection(db, 'system_settings'));
    let found: StoredContactInfo | null = null;
    docSnap.forEach((snap) => {
      if (snap.id === 'contact_info') {
        found = snap.data() as StoredContactInfo;
      }
    });
    return found;
  } catch (err) {
    handleFirestoreError('fetchContactInfoFromFirestore', err);
    return null;
  }
}

export async function saveContactInfoToFirestore(data: StoredContactInfo): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'system_settings', 'contact_info');
    await setDoc(docRef, {
      whatsappNumbers: Array.isArray(data.whatsappNumbers) ? data.whatsappNumbers : DEFAULT_CONTACT_INFO.whatsappNumbers,
      email: data.email || DEFAULT_CONTACT_INFO.email,
      secondaryEmail: data.secondaryEmail || '',
      phoneNumbers: Array.isArray(data.phoneNumbers) ? data.phoneNumbers : (DEFAULT_CONTACT_INFO.phoneNumbers || []),
      workHours: data.workHours || DEFAULT_CONTACT_INFO.workHours,
      address: data.address || DEFAULT_CONTACT_INFO.address,
      notes: data.notes || DEFAULT_CONTACT_INFO.notes,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError('saveContactInfoToFirestore', err);
    return false;
  }
}

// ----------------------------------------------------
// Conversations History Management (سجل المحادثات)
// ----------------------------------------------------
export interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: string;
    sources?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export async function fetchConversationsFromFirestore(userId?: string): Promise<StoredConversation[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'conversations');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: StoredConversation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StoredConversation;
      if (!userId || data.userId === userId) {
        items.push({
          id: docSnap.id,
          ...data,
        });
      }
    });
    // Sort descending by updatedAt
    items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return items;
  } catch (err) {
    handleFirestoreError('fetchConversationsFromFirestore', err);
    return null;
  }
}

export async function saveConversationToFirestore(conv: StoredConversation): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'conversations', conv.id);
    await setDoc(docRef, {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      messages: conv.messages || [],
      createdAt: conv.createdAt || new Date().toISOString(),
      updatedAt: conv.updatedAt || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(`saveConversationToFirestore ${conv.id}`, err);
    return false;
  }
}

export async function deleteConversationFromFirestore(convId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'conversations', convId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(`deleteConversationFromFirestore ${convId}`, err);
    return false;
  }
}

export async function clearUserConversationsFromFirestore(userId: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const col = collection(db, 'conversations');
    const snapshot = await getDocs(col);
    const deleteTasks: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StoredConversation;
      if (data.userId === userId) {
        deleteTasks.push(deleteDoc(docSnap.ref));
      }
    });
    await Promise.all(deleteTasks);
    return true;
  } catch (err) {
    handleFirestoreError(`clearUserConversationsFromFirestore ${userId}`, err);
    return false;
  }
}

let isAlreadySeeded = false;

/**
 * Seed initial laws, users, categories, supervisors, and related sites to Firestore if they do not already exist
 */
export async function seedFirestoreIfEmpty(
  initialUsers: StoredUser[],
  initialLaws: StoredLaw[],
  initialCategories: StoredCategory[],
  initialSupervisors?: StoredSupervisor[],
  initialRelatedSites?: StoredRelatedSite[],
  initialPartners?: StoredPartner[]
) {
  if (isAlreadySeeded) return;
  if (isQuotaExceeded()) return;
  const db = initFirestore();
  if (!db) return;

  try {
    const lawsCol = collection(db, 'laws');
    const usersCol = collection(db, 'users');
    const catCol = collection(db, 'legal_categories');
    const supCol = collection(db, 'supervisors');
    const sitesCol = collection(db, 'related_sites');
    const settingsCol = collection(db, 'system_settings');
    const partnersCol = collection(db, 'partners');
    const plansCol = collection(db, 'subscription_plans');

    // Check all collections in parallel
    const [lawSnap, userSnap, catSnap, supSnap, siteSnap, settingsSnap, partnersSnap, plansSnap] = await Promise.all([
      getDocs(lawsCol),
      getDocs(usersCol),
      getDocs(catCol),
      getDocs(supCol),
      getDocs(sitesCol),
      getDocs(settingsCol),
      getDocs(partnersCol),
      getDocs(plansCol),
    ]);

    const seedTasks: Promise<any>[] = [];

    let hasAbout = false;
    let hasContact = false;
    settingsSnap.forEach((docSnap) => {
      if (docSnap.id === 'platform_about') hasAbout = true;
      if (docSnap.id === 'contact_info') hasContact = true;
    });

    if (!hasAbout) {
      console.log('Seeding default platform_about to Firestore...');
      seedTasks.push(savePlatformAboutToFirestore(DEFAULT_PLATFORM_ABOUT));
    }

    if (!hasContact) {
      console.log('Seeding default contact_info to Firestore...');
      seedTasks.push(saveContactInfoToFirestore(DEFAULT_CONTACT_INFO));
    }

    if (lawSnap.empty) {
      console.log('Seeding initial laws to Firestore cloud database in parallel...');
      seedTasks.push(Promise.all(initialLaws.map((law) => saveLawToFirestore(law))));
    }

    // Do not seed fake/demo users - only real users who register will be stored in Firestore

    if (catSnap.empty) {
      console.log('Seeding default legal categories to Firestore cloud database in parallel...');
      seedTasks.push(Promise.all(initialCategories.map((cat) => saveCategoryToFirestore(cat))));
    }

    if (supSnap.empty && initialSupervisors && initialSupervisors.length > 0) {
      console.log('Seeding default supervisors to Firestore cloud database...');
      seedTasks.push(Promise.all(initialSupervisors.map((s) => saveSupervisorToFirestore(s))));
    }

    if (siteSnap.empty && initialRelatedSites && initialRelatedSites.length > 0) {
      console.log('Seeding default related sites to Firestore cloud database...');
      seedTasks.push(Promise.all(initialRelatedSites.map((s) => saveRelatedSiteToFirestore(s))));
    }

    if (partnersSnap.empty && initialPartners && initialPartners.length > 0) {
      console.log('Seeding default partners to Firestore cloud database...');
      seedTasks.push(Promise.all(initialPartners.map((p) => savePartnerToFirestore(p))));
    }

    if (plansSnap.empty) {
      console.log('Seeding default subscription plans to Firestore cloud database...');
      seedTasks.push(Promise.all(DEFAULT_SUBSCRIPTION_PLANS.map((plan) => saveSubscriptionPlanToFirestore(plan))));
    }

    if (seedTasks.length > 0) {
      await Promise.all(seedTasks);
      console.log('✅ Parallel Firestore database seeding completed.');
    }
    isAlreadySeeded = true;
  } catch (err) {
    handleFirestoreError('seedFirestoreIfEmpty', err);
  }
}

export async function fetchVideosFromFirestore(): Promise<any[] | null> {
  if (isQuotaExceeded()) return null;
  const db = initFirestore();
  if (!db) return null;

  try {
    const col = collection(db, 'videos');
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items: any[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data());
    });
    return items;
  } catch (err) {
    handleFirestoreError('fetchVideosFromFirestore', err);
    return null;
  }
}

export async function saveVideoToFirestore(video: any): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'videos', video.id);
    await setDoc(docRef, {
      id: video.id,
      title: video.title || '',
      description: video.description || '',
      url: video.url || '',
      thumbnailUrl: video.thumbnailUrl || '',
      order: Number(video.order) || 0,
      isActive: video.isActive !== false,
      createdAt: video.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    notifyChange('videos');
    return true;
  } catch (err) {
    handleFirestoreError(`saveVideoToFirestore ${video.id}`, err);
    return false;
  }
}

export async function deleteVideoFromFirestore(id: string): Promise<boolean> {
  if (isQuotaExceeded()) return false;
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'videos', id);
    await deleteDoc(docRef);
    notifyChange('videos');
    return true;
  } catch (err) {
    handleFirestoreError(`deleteVideoFromFirestore ${id}`, err);
    return false;
  }
}
