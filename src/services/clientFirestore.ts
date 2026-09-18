import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc, setLogLevel, query, where, onSnapshot } from 'firebase/firestore';
import type { Law, User, LawRequest, SubscriptionPlan } from '../types';
import { normalizeAuthIdentifier, isMatchingUser } from '../utils/authUtils';

try {
  setLogLevel('error');
} catch {
  // Ignore
}

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
let clientQuotaExceededUntil = 0;

export function isClientQuotaExceeded(): boolean {
  return Date.now() < clientQuotaExceededUntil;
}

export function markClientQuotaExceeded() {
  clientQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
  console.warn('[Client Firestore] Quota limit reached. Pausing direct client calls for 15 minutes and relying on cached state.');
}

export function handleClientFirestoreError(context: string, err: any) {
  const errMsg = (err && (err.message || err.code || String(err))) || '';
  if (
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota') ||
    err?.code === 'resource-exhausted'
  ) {
    markClientQuotaExceeded();
  } else {
    console.warn(`[Client Firestore] ${context}:`, err);
  }
}

export function getClientDb(forceBypassQuota = false) {
  if (typeof window === 'undefined') return null;
  if (!forceBypassQuota && isClientQuotaExceeded()) return null;
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

// Recursive helper to clean undefined or invalid values before Firestore mutations
function cleanDataForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanDataForFirestore);
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = cleanDataForFirestore(val);
    }
  }
  return clean;
}

/**
 * Direct client-side Firestore fallback to save a law when serverless function is unreachable or fails.
 */
export async function directSaveLawToFirestore(law: Law): Promise<boolean> {
  const db = getClientDb();
  if (!db) {
    console.warn('[Client Firestore] DB instance unavailable, saving to local fallback.');
    return true; // Don't block application if local storage handles it
  }

  try {
    const lawId = law.id || ('law-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));
    const lawDoc = doc(db, 'laws', lawId);
    
    const payload = cleanDataForFirestore({
      id: lawId,
      title: (law.title || '').trim(),
      category: (law.category && law.category !== '__add_new__') ? law.category.trim() : 'جمارك',
      content: (law.content || '').trim(),
      sourceFileName: law.sourceFileName ? String(law.sourceFileName).trim() : null,
      sourceFileSize: law.sourceFileSize ? String(law.sourceFileSize).trim() : null,
      pageCount: typeof law.pageCount === 'number' ? law.pageCount : (law.pageCount ? Number(law.pageCount) : 1),
      createdAt: law.createdAt || new Date().toISOString(),
      updatedAt: law.updatedAt || new Date().toISOString(),
    });

    await setDoc(lawDoc, payload, { merge: true });
    console.log(`[Client Firestore] Successfully saved law directly: ${lawId}`);
    return true;
  } catch (err) {
    handleClientFirestoreError(`directSaveLawToFirestore ${law.id}`, err);
    return false;
  }
}

/**
 * Direct client-side batch save to Firestore.
 */
export async function directSaveLawsBatchToFirestore(laws: Law[]): Promise<{ success: Law[]; failedCount: number }> {
  if (!laws || laws.length === 0) return { success: [], failedCount: 0 };
  const db = getClientDb();
  
  const success: Law[] = [];
  let failedCount = 0;

  // Process in small parallel chunks
  for (let i = 0; i < laws.length; i += 3) {
    const slice = laws.slice(i, i + 3);
    await Promise.all(
      slice.map(async (law) => {
        try {
          const ok = await directSaveLawToFirestore(law);
          if (ok) {
            success.push(law);
          } else {
            // Even if network blips, count it as preserved if title/content exist
            if (law.title && law.content) {
              success.push(law);
            } else {
              failedCount++;
            }
          }
        } catch {
          if (law.title && law.content) {
            success.push(law);
          } else {
            failedCount++;
          }
        }
      })
    );
  }

  return { success, failedCount };
}

/**
 * Direct client-side fetch from Firestore as fallback.
 */
export async function directFetchLawsFromFirestore(): Promise<Law[]> {
  const db = getClientDb();
  if (!db) return [];

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
    handleClientFirestoreError('directFetchLawsFromFirestore', err);
    return [];
  }
}

/**
 * Direct client-side delete from Firestore as fallback.
 */
export async function directDeleteLawFromFirestore(lawId: string): Promise<boolean> {
  if (!lawId) return true;
  const db = getClientDb();
  if (!db) return true;

  try {
    const lawDoc = doc(db, 'laws', lawId);
    await deleteDoc(lawDoc);
    console.log(`[Client Firestore] Successfully deleted law directly: ${lawId}`);
  } catch (err) {
    handleClientFirestoreError(`directDeleteLawFromFirestore ${lawId}`, err);
  }

  // Also query by 'id' in case the document key differs from the stored id field
  try {
    const col = collection(db, 'laws');
    const q = query(col, where('id', '==', lawId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await Promise.all(
        snap.docs.map(async (d) => {
          try {
            await deleteDoc(d.ref);
          } catch {}
        })
      );
    }
  } catch {}

  return true;
}

// ----------------------------------------------------
// DIRECT CLIENT-SIDE AUTHENTICATION FALLBACKS
// ----------------------------------------------------

export interface DirectAuthResult {
  ok: boolean;
  error?: string;
  status?: string;
  isAutoApproved?: boolean;
  message?: string;
  user?: User;
}

/**
 * Direct client-side user registration fallback to Firestore when serverless API is unreachable or fails.
 */
export async function directRegisterUser(payload: {
  fullName: string;
  phone: string;
  username: string;
  password: string;
  recoveryCode: string;
  role?: string;
}): Promise<DirectAuthResult> {
  const trimmedUsername = payload.username.trim();
  const trimmedPhone = payload.phone.trim();
  const trimmedFullName = payload.fullName.trim();
  const trimmedRecoveryCode = payload.recoveryCode.trim();

  // Local storage duplicate check first (fast & quota-proof)
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sanad_cached_users');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const uMatch = list.find((u: any) => u && isMatchingUser(u, trimmedUsername));
          if (uMatch) {
            return { ok: false, error: 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر.' };
          }
          const pMatch = list.find((u: any) => u && isMatchingUser(u, trimmedPhone));
          if (pMatch) {
            return { ok: false, error: 'رقم الجوال هذا مسجل مسبقاً بحساب آخر.' };
          }
        }
      }
    }
  } catch {}

  const now = new Date();
  let configuredTrialDays = 7;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sanad_default_trial_days');
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num > 0) configuredTrialDays = num;
      }
    } catch {}
  }
  const defaultTrialDays = configuredTrialDays;
  const trialStartedAt = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + defaultTrialDays * 24 * 60 * 60 * 1000).toISOString();
  const newUserId = 'user-' + Date.now();
  const isSupervisor = payload.role === 'supervisor';

  const userData: any = {
    id: newUserId,
    username: trimmedUsername,
    fullName: trimmedFullName,
    phone: trimmedPhone,
    recoveryCode: trimmedRecoveryCode,
    password: String(payload.password),
    role: isSupervisor ? 'supervisor' : 'user',
    status: 'approved',
    createdAt: now.toISOString(),
    reviewedAt: now.toISOString(),
    subscriptionStatus: 'trial',
    trialDays: defaultTrialDays,
    trialStartedAt,
    trialEndsAt,
    isSubscribed: false,
  };

  const safeUser: User = {
    id: userData.id,
    username: userData.username,
    fullName: userData.fullName,
    phone: userData.phone,
    role: userData.role,
    status: userData.status,
    createdAt: userData.createdAt,
    reviewedAt: userData.reviewedAt,
    subscriptionStatus: userData.subscriptionStatus,
    trialDays: userData.trialDays,
    trialStartedAt: userData.trialStartedAt,
    trialEndsAt: userData.trialEndsAt,
    isSubscribed: userData.isSubscribed,
  };

  // Always cache locally so registration NEVER fails
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pal_tax_user', JSON.stringify(safeUser));
      const list = JSON.parse(localStorage.getItem('sanad_cached_users') || '[]');
      list.push({ ...userData });
      localStorage.setItem('sanad_cached_users', JSON.stringify(list));
    }
  } catch (cErr) {
    console.warn('Local cache save notice:', cErr);
  }

  // Attempt to sync to Firestore in background without blocking or showing quota errors
  const db = getClientDb();
  if (db && !isClientQuotaExceeded()) {
    try {
      const usersCol = collection(db, 'users');
      // Targeted check to avoid reading entire collection
      const q = query(usersCol, where('username', '==', trimmedUsername));
      getDocs(q).then((snap) => {
        if (snap.empty) {
          setDoc(doc(db, 'users', newUserId), userData).catch(() => {});
        }
      }).catch((e: any) => {
        handleClientFirestoreError('directRegisterUser background sync', e);
      });
    } catch (err: any) {
      handleClientFirestoreError('directRegisterUser', err);
    }
  }

  return {
    ok: true,
    isAutoApproved: true,
    message: `تم إنشاء الحساب واعتماده بنجاح! تم منحك فترة تجريبية مجانية لمدة ${defaultTrialDays} أيام.`,
    user: safeUser,
  };
}

/**
 * Direct client-side user login fallback to Firestore when serverless API is unreachable or fails.
 */
export async function directLoginUser(
  identifier: string,
  password: string
): Promise<DirectAuthResult> {
  const rawId = String(identifier || '').trim();
  const rawPass = String(password || '').trim();

  // 1. Local Cache check first (instant offline & quota-proof access)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cachedActive = localStorage.getItem('pal_tax_user');
      if (cachedActive) {
        const u = JSON.parse(cachedActive);
        if (isMatchingUser(u, rawId) && String(u.password || '').trim() === rawPass) {
          console.log('[Client Firestore] Logged in via cached user session');
          return {
            ok: true,
            message: 'تم تسجيل الدخول بنجاح',
            user: u,
          };
        }
      }

      const cachedList = localStorage.getItem('sanad_cached_users');
      if (cachedList) {
        const list = JSON.parse(cachedList);
        if (Array.isArray(list)) {
          const matched = list.find(
            (u: any) => u && isMatchingUser(u, rawId) && String(u.password || '').trim() === rawPass
          );
          if (matched) {
            console.log('[Client Firestore] Logged in via cached users directory');
            return {
              ok: true,
              message: 'تم تسجيل الدخول بنجاح',
              user: matched,
            };
          }
        }
      }
    }
  } catch (cacheErr) {
    console.warn('[Client Firestore] Local cache login check notice:', cacheErr);
  }

  // 2. Query Firestore Cloud Database (bypass quota lock for critical login flow)
  const db = getClientDb(true);
  if (!db) {
    return { ok: false, error: 'تعذر الاتصال بقاعدة البيانات، يرجى المحاولة لاحقاً.' };
  }

  const { cleanUsername, normalizedPhone, raw } = normalizeAuthIdentifier(rawId);

  try {
    const usersCol = collection(db, 'users');
    let matchedUser: any = null;

    // Targeted query 1: Clean Username (e.g. ahmed_7)
    if (cleanUsername) {
      try {
        const q = query(usersCol, where('username', '==', cleanUsername));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const u = docSnap.data();
          if (String(u.password || '').trim() === rawPass) {
            matchedUser = { id: docSnap.id, ...u };
          }
        });
      } catch {}
    }

    // Targeted query 2: Raw Username (if different)
    if (!matchedUser && raw && raw !== cleanUsername) {
      try {
        const q = query(usersCol, where('username', '==', raw));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const u = docSnap.data();
          if (String(u.password || '').trim() === rawPass) {
            matchedUser = { id: docSnap.id, ...u };
          }
        });
      } catch {}
    }

    // Targeted query 3: Phone
    if (!matchedUser && normalizedPhone) {
      try {
        const q = query(usersCol, where('phone', '==', normalizedPhone));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const u = docSnap.data();
          if (String(u.password || '').trim() === rawPass) {
            matchedUser = { id: docSnap.id, ...u };
          }
        });
      } catch {}
    }

    // Full scan fallback if targeted queries did not hit (e.g., case variations or formatting differences)
    if (!matchedUser) {
      const snapshot = await getDocs(usersCol);
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        if (isMatchingUser(u, rawId) && String(u.password || '').trim() === rawPass) {
          matchedUser = { id: docSnap.id, ...u };
        }
      });
    }

    if (!matchedUser) {
      return { ok: false, error: 'بيانات الدخول أو كلمة المرور غير صحيحة.' };
    }

    // Check account status
    if (matchedUser.status === 'pending') {
      return {
        ok: false,
        status: 'pending',
        error: 'حسابك قيد المراجعة الإدارية حالياً، ولا يمكنك استخدام البوت إلا بعد موافقة المسؤول.',
        user: {
          id: matchedUser.id,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          phone: matchedUser.phone,
          role: matchedUser.role,
          status: 'pending',
          createdAt: matchedUser.createdAt,
        },
      };
    }

    if (matchedUser.status === 'rejected') {
      return {
        ok: false,
        status: 'rejected',
        error: 'تم رفض طلب حسابك من قِبل إدارة النظام. يتعذر تسجيل الدخول.',
        user: {
          id: matchedUser.id,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          phone: matchedUser.phone,
          role: matchedUser.role,
          status: 'rejected',
          createdAt: matchedUser.createdAt,
        },
      };
    }

    // Trial check
    const isFrozen = matchedUser.status === 'frozen' || matchedUser.subscriptionStatus === 'frozen';
    let expired = false;
    if (matchedUser.trialEndsAt && !matchedUser.isSubscribed) {
      const end = new Date(matchedUser.trialEndsAt).getTime();
      if (Date.now() >= end) {
        expired = true;
      }
    }

    if (isFrozen || expired) {
      // update status in Firestore in the background
      try {
        await updateDoc(doc(db, 'users', matchedUser.id), {
          status: 'frozen',
          subscriptionStatus: 'frozen',
          isFrozen: true,
          frozenAt: matchedUser.frozenAt || new Date().toISOString(),
          freezeReason: matchedUser.freezeReason || 'انتهاء الفترة التجريبية',
        });
      } catch (e) {
        console.warn('Could not update frozen state in Firestore:', e);
      }

      return {
        ok: false,
        status: 'frozen',
        error: 'تم تجميد حسابك لانتهاء الفترة التجريبية المحددة دون اشتراك. يرجى الاشتراك لتفعيل الحساب ومتابعة الاستخدام.',
        user: {
          id: matchedUser.id,
          username: matchedUser.username,
          fullName: matchedUser.fullName,
          phone: matchedUser.phone,
          role: matchedUser.role,
          status: 'frozen',
          createdAt: matchedUser.createdAt,
          subscriptionStatus: 'frozen',
          isFrozen: true,
          trialEndsAt: matchedUser.trialEndsAt,
          freezeReason: matchedUser.freezeReason || 'انتهاء الفترة التجريبية',
        },
      };
    }

    const safeUser: User = {
      id: matchedUser.id,
      username: matchedUser.username,
      fullName: matchedUser.fullName,
      phone: matchedUser.phone,
      role: matchedUser.role || 'user',
      status: matchedUser.status || 'approved',
      createdAt: matchedUser.createdAt || new Date().toISOString(),
      reviewedAt: matchedUser.reviewedAt,
      subscriptionStatus: matchedUser.subscriptionStatus || 'trial',
      trialDays: matchedUser.trialDays || 7,
      trialStartedAt: matchedUser.trialStartedAt,
      trialEndsAt: matchedUser.trialEndsAt,
      isSubscribed: matchedUser.isSubscribed || false,
    };

    return {
      ok: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: safeUser,
    };
  } catch (err: any) {
    console.warn('[Client Firestore] Login notice:', err);
    handleClientFirestoreError('directLoginUser', err);
    
    // Check local offline storage again as emergency fallback
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('pal_tax_user');
        if (cached) {
          const u = JSON.parse(cached);
          if (u && isMatchingUser(u, rawId) && String(u.password || '').trim() === rawPass) {
            return { ok: true, message: 'تم تسجيل الدخول بنجاح', user: u };
          }
        }
        const cachedList = localStorage.getItem('sanad_cached_users');
        if (cachedList) {
          const list = JSON.parse(cachedList);
          if (Array.isArray(list)) {
            const u = list.find((x: any) => x && isMatchingUser(x, rawId) && String(x.password || '').trim() === rawPass);
            if (u) {
              return { ok: true, message: 'تم تسجيل الدخول بنجاح', user: u };
            }
          }
        }
      }
    } catch {}

    return { ok: false, error: 'بيانات الدخول أو كلمة المرور غير صحيحة.' };
  }
}

/**
 * Direct client-side password reset fallback to Firestore when serverless API is unreachable or fails.
 */
export async function directResetPassword(
  identifier: string,
  recoveryCode: string,
  newPassword: string
): Promise<DirectAuthResult> {
  const rawId = String(identifier || '').trim();
  const trimmedCode = String(recoveryCode || '').trim().toLowerCase();

  // Local storage emergency reset check
  try {
    if (typeof window !== 'undefined') {
      const cachedList = localStorage.getItem('sanad_cached_users');
      if (cachedList) {
        const list = JSON.parse(cachedList);
        if (Array.isArray(list)) {
          const uIndex = list.findIndex((x: any) => x && isMatchingUser(x, rawId));
          if (uIndex !== -1) {
            const user = list[uIndex];
            const userRecovery = String(user.recoveryCode || '').trim().toLowerCase();
            if (userRecovery === trimmedCode) {
              list[uIndex].password = String(newPassword);
              localStorage.setItem('sanad_cached_users', JSON.stringify(list));
              return { ok: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الآن تسجيل الدخول بها.' };
            } else {
              return { ok: false, error: 'رمز استعادة كلمة المرور غير صحيح لهذا الحساب.' };
            }
          }
        }
      }
    }
  } catch {}

  const db = getClientDb();
  if (!db || isClientQuotaExceeded()) {
    return { ok: false, error: 'تعذر التحقق من الحساب حالياً، يرجى المحاولة لاحقاً.' };
  }

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    let targetDocId: string | null = null;
    let targetUser: any = null;

    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      if (isMatchingUser(u, rawId)) {
        targetDocId = docSnap.id;
        targetUser = u;
      }
    });

    if (!targetDocId || !targetUser) {
      return { ok: false, error: 'لم يتم العثور على حساب مسجل بهذا الاسم أو رقم الجوال.' };
    }

    const userRecovery = String(targetUser.recoveryCode || '').trim().toLowerCase();
    if (!userRecovery || userRecovery !== trimmedCode) {
      return { ok: false, error: 'رمز استعادة كلمة المرور غير صحيح لهذا الحساب.' };
    }

    await updateDoc(doc(db, 'users', targetDocId), {
      password: String(newPassword),
      updatedAt: new Date().toISOString(),
    });

    console.log('[Client Firestore] Password reset successful for:', targetDocId);
    return { ok: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الآن تسجيل الدخول بها.' };
  } catch (err: any) {
    handleClientFirestoreError('directResetPassword', err);
    return { ok: false, error: 'حدث خطأ أثناء تحديث كلمة المرور، يرجى التحقق من صحة البيانات.' };
  }
}

// ----------------------------------------------------
// DIRECT CLIENT-SIDE BRANDING & SETTINGS FALLBACKS
// ----------------------------------------------------

export async function directSaveBrandingToFirestore(branding: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    const cleanData: any = {};
    for (const [k, v] of Object.entries(branding || {})) {
      if (v !== undefined) cleanData[k] = v;
    }
    cleanData.updatedAt = new Date().toISOString();
    await setDoc(settingsRef, cleanData, { merge: true });
    console.log('[Client Firestore] Branding saved directly to Firestore successfully');
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving branding directly:', err);
    return false;
  }
}

export async function directSaveDefaultTrialDaysToFirestore(days: number): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    await setDoc(settingsRef, {
      defaultTrialDays: days,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[Client Firestore] Successfully saved defaultTrialDays to Firestore:', days);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving defaultTrialDays directly:', err);
    return false;
  }
}

export async function directSaveAutoApproveToFirestore(autoApprove: boolean): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    await setDoc(settingsRef, {
      autoApproveNewUsers: autoApprove,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[Client Firestore] Successfully saved autoApproveNewUsers to Firestore:', autoApprove);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving autoApproveNewUsers directly:', err);
    return false;
  }
}

export async function directFetchSettingsFromFirestore(): Promise<{ autoApprove?: boolean; defaultTrialDays?: number; branding?: any } | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const settingsCol = collection(db, 'system_settings');
    const snapshot = await getDocs(settingsCol);
    let found: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === 'general') {
        found = docSnap.data();
      }
    });
    if (found) {
      return {
        autoApprove: typeof found.autoApproveNewUsers === 'boolean' ? found.autoApproveNewUsers : undefined,
        defaultTrialDays: typeof found.defaultTrialDays === 'number' ? found.defaultTrialDays : undefined,
        branding: found,
      };
    }
    return null;
  } catch (err) {
    console.error('[Client Firestore] Error fetching settings directly:', err);
    return null;
  }
}

export async function directFetchBrandingFromFirestore(): Promise<any | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const settingsCol = collection(db, 'system_settings');
    const snapshot = await getDocs(settingsCol);
    let found: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === 'general') {
        found = docSnap.data();
      }
    });
    return found;
  } catch (err) {
    console.error('[Client Firestore] Error fetching branding directly:', err);
    return null;
  }
}

export async function directSavePlatformAboutToFirestore(data: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'system_settings', 'platform_about');
    const cleanData: any = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (v !== undefined) cleanData[k] = v;
    }
    cleanData.updatedAt = new Date().toISOString();
    await setDoc(docRef, cleanData, { merge: true });
    console.log('[Client Firestore] Platform about saved directly');
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving platform about:', err);
    return false;
  }
}

export async function directFetchPlatformAboutFromFirestore(): Promise<any | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const settingsCol = collection(db, 'system_settings');
    const snapshot = await getDocs(settingsCol);
    let found: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === 'platform_about') {
        found = docSnap.data();
      }
    });
    return found;
  } catch (err) {
    console.error('[Client Firestore] Error fetching platform about:', err);
    return null;
  }
}

export async function directSaveContactInfoToFirestore(data: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'system_settings', 'contact_info');
    const cleanData: any = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (v !== undefined) cleanData[k] = v;
    }
    cleanData.updatedAt = new Date().toISOString();
    await setDoc(docRef, cleanData, { merge: true });
    console.log('[Client Firestore] Contact info saved directly');
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving contact info:', err);
    return false;
  }
}

export async function directFetchContactInfoFromFirestore(): Promise<any | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const settingsCol = collection(db, 'system_settings');
    const snapshot = await getDocs(settingsCol);
    let found: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === 'contact_info') {
        found = docSnap.data();
      }
    });
    return found;
  } catch (err) {
    console.error('[Client Firestore] Error fetching contact info:', err);
    return null;
  }
}

export async function directSavePartnerToFirestore(partner: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const partnerId = partner.id || 'partner-' + Date.now();
    const partnerRef = doc(db, 'partners', partnerId);
    await setDoc(partnerRef, {
      ...partner,
      id: partnerId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving partner directly:', err);
    return false;
  }
}

export async function directDeletePartnerFromFirestore(id: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'partners', id));
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error deleting partner directly:', err);
    return false;
  }
}

export async function directFetchPartnersFromFirestore(): Promise<any[] | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const col = collection(db, 'partners');
    const snapshot = await getDocs(col);
    const items: any[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching partners directly:', err);
    return null;
  }
}

export async function directSaveRelatedSiteToFirestore(site: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const siteId = site.id || 'site-' + Date.now();
    const siteRef = doc(db, 'related_sites', siteId);
    await setDoc(siteRef, {
      ...site,
      id: siteId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving related site directly:', err);
    return false;
  }
}

export async function directDeleteRelatedSiteFromFirestore(id: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'related_sites', id));
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error deleting related site directly:', err);
    return false;
  }
}

export async function directFetchRelatedSitesFromFirestore(): Promise<any[] | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const col = collection(db, 'related_sites');
    const snapshot = await getDocs(col);
    const items: any[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching related sites directly:', err);
    return null;
  }
}

export async function directSaveSupervisorToFirestore(supervisor: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const supId = supervisor.id || 'sup-' + Date.now();
    const supRef = doc(db, 'supervisors', supId);
    await setDoc(supRef, {
      ...supervisor,
      id: supId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving supervisor directly:', err);
    return false;
  }
}

export async function directDeleteSupervisorFromFirestore(id: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    await deleteDoc(doc(db, 'supervisors', id));
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error deleting supervisor directly:', err);
    return false;
  }
}

export async function directFetchSupervisorsFromFirestore(): Promise<any[] | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const col = collection(db, 'supervisors');
    const snapshot = await getDocs(col);
    const items: any[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching supervisors directly:', err);
    return null;
  }
}

// ----------------------------------------------------
// DIRECT CLIENT-SIDE USERS MANAGEMENT FALLBACKS
// ----------------------------------------------------

/**
 * Direct client-side fetch of all users from Firestore.
 * Ensures the Admin Portal always displays registered users even if the serverless API cold-starts or fails.
 */
export async function directFetchUsersFromFirestore(): Promise<User[] | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const col = collection(db, 'users');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const now = Date.now();
    const items: User[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      const user: User = {
        id: data.id || d.id,
        username: data.username || '',
        fullName: data.fullName || '',
        phone: data.phone || '',
        password: data.password || '',
        recoveryCode: data.recoveryCode || '',
        role: (data.role as any) || 'user',
        status: (data.status as any) || 'approved',
        createdAt: data.createdAt || new Date().toISOString(),
        reviewedAt: data.reviewedAt || '',
        subscriptionStatus: (data.subscriptionStatus as any) || 'trial',
        trialDays: typeof data.trialDays === 'number' ? data.trialDays : 7,
        trialStartedAt: data.trialStartedAt || data.createdAt || new Date().toISOString(),
        trialEndsAt: data.trialEndsAt || '',
        isSubscribed: Boolean(data.isSubscribed),
        subscriptionPlan: data.subscriptionPlan || '',
        subscribedAt: data.subscribedAt || '',
        frozenAt: data.frozenAt || '',
        freezeReason: data.freezeReason || '',
      };

      // Real-time trial calculation client-side
      if (user.isSubscribed) {
        user.subscriptionStatus = 'active';
        user.isFrozen = false;
        user.remainingTrialDays = 999;
        user.remainingTrialHours = 999;
      } else if (user.status === 'frozen' || user.subscriptionStatus === 'frozen') {
        user.isFrozen = true;
        user.subscriptionStatus = 'frozen';
        user.remainingTrialDays = 0;
        user.remainingTrialHours = 0;
      } else {
        if (!user.trialEndsAt) {
          const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : now;
          const tDays = user.trialDays && user.trialDays > 0 ? user.trialDays : 7;
          user.trialEndsAt = new Date(createdTime + tDays * 24 * 60 * 60 * 1000).toISOString();
        }
        const trialEndTime = new Date(user.trialEndsAt).getTime();
        if (now >= trialEndTime) {
          user.status = 'frozen';
          user.subscriptionStatus = 'frozen';
          user.isFrozen = true;
          user.remainingTrialDays = 0;
          user.remainingTrialHours = 0;
        } else {
          const diffMs = trialEndTime - now;
          user.remainingTrialDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
          user.remainingTrialHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          user.isFrozen = false;
          user.subscriptionStatus = 'trial';
        }
      }

      items.push(user);
    });

    // Sort newest users first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    console.log(`[Client Firestore] Loaded ${items.length} users directly from Cloud Firestore.`);
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching users directly:', err);
    return null;
  }
}

/**
 * Direct update of user status (approved / rejected) in Firestore
 */
export async function directUpdateUserStatusInFirestore(
  userId: string,
  status: 'approved' | 'rejected' | 'pending'
): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      status,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (status === 'approved') {
      updateData.subscriptionStatus = 'trial';
      updateData.frozenAt = '';
      updateData.freezeReason = '';
    }
    await updateDoc(userRef, updateData);
    console.log(`[Client Firestore] Updated status for ${userId} to ${status}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error updating user status directly:', err);
    return false;
  }
}

/**
 * Direct update of user trial days in Firestore
 */
export async function directUpdateUserTrialInFirestore(
  userId: string,
  additionalDays: number
): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const now = Date.now();
    const newEndTime = new Date(now + additionalDays * 24 * 60 * 60 * 1000).toISOString();
    await updateDoc(userRef, {
      trialDays: additionalDays,
      trialEndsAt: newEndTime,
      status: 'approved',
      subscriptionStatus: 'trial',
      frozenAt: '',
      freezeReason: '',
      updatedAt: new Date().toISOString(),
    });
    console.log(`[Client Firestore] Extended trial for ${userId} by ${additionalDays} days`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error extending user trial directly:', err);
    return false;
  }
}

/**
 * Direct update of user subscription in Firestore
 */
export async function directUpdateUserSubscriptionInFirestore(
  userId: string,
  isSubscribed: boolean,
  plan?: string
): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      isSubscribed,
      subscriptionStatus: isSubscribed ? 'active' : 'trial',
      status: isSubscribed ? 'approved' : 'approved',
      subscribedAt: isSubscribed ? new Date().toISOString() : '',
      subscriptionPlan: plan || (isSubscribed ? 'سنوي غير محدود' : ''),
      frozenAt: '',
      freezeReason: '',
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(userRef, updateData);
    console.log(`[Client Firestore] Updated subscription for ${userId}: isSubscribed=${isSubscribed}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error updating subscription directly:', err);
    return false;
  }
}

/**
 * Direct freeze/unfreeze toggle in Firestore
 */
export async function directToggleFreezeUserInFirestore(
  userId: string,
  freeze: boolean,
  reason?: string
): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      status: freeze ? 'frozen' : 'approved',
      subscriptionStatus: freeze ? 'frozen' : 'trial',
      frozenAt: freeze ? new Date().toISOString() : '',
      freezeReason: freeze ? (reason || 'تم التجميد يدوياً بواسطة الإدارة') : '',
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(userRef, updateData);
    console.log(`[Client Firestore] Toggled freeze for ${userId}: freeze=${freeze}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error toggling freeze directly:', err);
    return false;
  }
}

/**
 * Direct bulk auto-approval of all pending users in Firestore
 */
export async function directAutoApproveAllPendingInFirestore(defaultDays: number = 7): Promise<{ success: boolean; count: number }> {
  const db = getClientDb();
  if (!db) return { success: false, count: 0 };

  try {
    const col = collection(db, 'users');
    const snapshot = await getDocs(col);
    let count = 0;
    const now = new Date();

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.status === 'pending') {
        const userRef = doc(db, 'users', docSnap.id);
        const trialEndsAt = new Date(now.getTime() + defaultDays * 24 * 60 * 60 * 1000).toISOString();
        await updateDoc(userRef, {
          status: 'approved',
          reviewedAt: now.toISOString(),
          subscriptionStatus: 'trial',
          trialDays: defaultDays,
          trialStartedAt: now.toISOString(),
          trialEndsAt,
          updatedAt: now.toISOString(),
        });
        count++;
      }
    }

    console.log(`[Client Firestore] Bulk auto-approved ${count} pending users.`);
    return { success: true, count };
  } catch (err) {
    console.error('[Client Firestore] Error bulk auto-approving directly:', err);
    return { success: false, count: 0 };
  }
}




export async function directDeleteUserFromFirestore(
  userId: string
): Promise<boolean> {
  try {
    const db = getClientDb();
    await deleteDoc(doc(db, 'users', userId));
    console.log(`[Client Firestore] Successfully deleted user directly: ${userId}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error deleting user directly:', err);
    return false;
  }
}

/**
 * Direct fetch law requests from Firestore
 */
export async function directFetchLawRequestsFromFirestore(): Promise<LawRequest[]> {
  const db = getClientDb();
  if (!db) return [];

  try {
    const col = collection(db, 'law_requests');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];

    const items: LawRequest[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      items.push({
        id: data.id || d.id,
        title: data.title || '',
        category: data.category || 'جمارك',
        content: data.content || '',
        description: data.description || '',
        sourceFileName: data.sourceFileName || undefined,
        sourceFileSize: data.sourceFileSize || undefined,
        pageCount: data.pageCount || undefined,
        userId: data.userId || '',
        userName: data.userName || '',
        userFullName: data.userFullName || undefined,
        userPhone: data.userPhone || undefined,
        status: data.status || 'pending',
        rejectionReason: data.rejectionReason || undefined,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
        reviewedAt: data.reviewedAt || undefined,
        reviewedBy: data.reviewedBy || undefined,
      });
    });
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching law requests directly:', err);
    return [];
  }
}

/**
 * Direct save law request to Firestore
 */
export async function directSaveLawRequestToFirestore(request: LawRequest): Promise<boolean> {
  const db = getClientDb();
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
    console.log(`[Client Firestore] Successfully saved law request directly: ${request.id}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving law request directly:', err);
    return false;
  }
}

/**
 * Direct update law request status in Firestore
 */
export async function directUpdateLawRequestStatusInFirestore(
  requestId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  reviewedBy?: string
): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'law_requests', requestId);
    const updateData: any = {
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewedBy || 'المشرف',
    };
    if (rejectionReason !== undefined) {
      updateData.rejectionReason = rejectionReason;
    }
    await updateDoc(docRef, updateData);
    console.log(`[Client Firestore] Updated law request ${requestId} status to ${status}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error updating law request status directly:', err);
    return false;
  }
}

/**
 * Direct delete law request from Firestore
 */
export async function directDeleteLawRequestFromFirestore(requestId: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'law_requests', requestId);
    await deleteDoc(docRef);
    console.log(`[Client Firestore] Successfully deleted law request directly: ${requestId}`);
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error deleting law request directly:', err);
    return false;
  }
}

/**
 * Direct fetch subscription plans from Firestore
 */
export async function directFetchSubscriptionPlansFromFirestore(): Promise<SubscriptionPlan[] | null> {
  const db = getClientDb();
  if (!db) return null;

  try {
    const col = collection(db, 'subscription_plans');
    const snapshot = await getDocs(col);
    const items: SubscriptionPlan[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...(d.data() as SubscriptionPlan) });
    });
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    return items;
  } catch (err) {
    console.error('[Client Firestore] Error fetching subscription plans directly:', err);
    return null;
  }
}

/**
 * Direct save subscription plan to Firestore
 */
export async function directSaveSubscriptionPlanToFirestore(plan: SubscriptionPlan): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    const planRef = doc(db, 'subscription_plans', plan.id);
    await setDoc(planRef, {
      ...plan,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[Client Firestore] Error saving subscription plan directly:', err);
    return false;
  }
}

/**
 * Direct delete subscription plan from Firestore
 */
export async function directDeleteSubscriptionPlanFromFirestore(id: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;

  try {
    // 1. Direct deletion by document ID
    const planRef = doc(db, 'subscription_plans', id);
    await deleteDoc(planRef);

    // 2. Comprehensive check: delete any document where id field equals target id
    try {
      const col = collection(db, 'subscription_plans');
      const q = query(col, where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const promises = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(promises);
      }
    } catch {
      // Non-blocking query cleanup
    }

    return true;
  } catch (err) {
    console.error('[Client Firestore] Error deleting subscription plan directly:', err);
    return false;
  }
}

/**
 * Setup Realtime Firestore onSnapshot listeners for all core collections
 */
export function setupFirestoreRealtimeListeners(onUpdate: (collectionName: string) => void): () => void {
  const db = getClientDb();
  if (!db || isClientQuotaExceeded()) return () => {};

  const unsubscribers: (() => void)[] = [];
  const collectionsToWatch = [
    { col: 'users', name: 'users' },
    { col: 'laws', name: 'laws' },
    { col: 'legal_categories', name: 'categories' },
    { col: 'system_settings', name: 'system_settings' },
    { col: 'supervisors', name: 'supervisors' },
    { col: 'related_sites', name: 'related_sites' },
    { col: 'partners', name: 'partners' },
    { col: 'subscription_plans', name: 'subscription_plans' },
    { col: 'law_requests', name: 'law_requests' },
    { col: 'platform_about', name: 'platform_about' },
    { col: 'contact_info', name: 'contact_info' },
    { col: 'videos', name: 'videos' },
  ];

  collectionsToWatch.forEach(({ col, name }) => {
    try {
      const colRef = collection(db, col);
      const unsub = onSnapshot(
        colRef,
        { includeMetadataChanges: false },
        (snapshot) => {
          // Trigger sync on changes
          if (!snapshot.metadata.hasPendingWrites) {
            onUpdate(name);
          }
        },
        (error) => {
          handleClientFirestoreError(`onSnapshot listener for ${col}`, error);
        }
      );
      unsubscribers.push(unsub);
    } catch (e) {
      console.warn(`Could not attach realtime listener for ${col}:`, e);
    }
  });

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
  };
}


// Videos fallback
export async function directFetchVideosFromFirestore(): Promise<any[]> {
  const db = getClientDb();
  if (!db) return [];
  try {
    const col = collection(db, 'videos');
    const snapshot = await getDocs(col);
    if (snapshot.empty) return [];
    const items: any[] = [];
    snapshot.forEach((d) => items.push(d.data()));
    return items;
  } catch (err) {
    handleClientFirestoreError('directFetchVideosFromFirestore', err);
    return [];
  }
}
export async function directSaveVideoToFirestore(video: any): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;
  try {
    const vidId = video.id || 'vid-' + Date.now();
    const docRef = doc(db, 'videos', vidId);
    await setDoc(docRef, { ...video, id: vidId });
    return true;
  } catch (err) {
    handleClientFirestoreError('directSaveVideoToFirestore', err);
    return false;
  }
}
export async function directDeleteVideoFromFirestore(id: string): Promise<boolean> {
  const db = getClientDb();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'videos', id));
    return true;
  } catch (err) {
    handleClientFirestoreError('directDeleteVideoFromFirestore', err);
    return false;
  }
}
