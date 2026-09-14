import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Law, User } from '../types';

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
  const db = getClientDb();
  if (!db) {
    return { ok: false, error: 'تعذر الاتصال بقاعدة البيانات السحابية، يرجى المحاولة لاحقاً.' };
  }

  const trimmedUsername = payload.username.trim();
  const trimmedPhone = payload.phone.trim();
  const trimmedFullName = payload.fullName.trim();
  const trimmedRecoveryCode = payload.recoveryCode.trim();

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    let usernameExists = false;
    let phoneExists = false;

    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      if (u.username && String(u.username).trim().toLowerCase() === trimmedUsername.toLowerCase()) {
        usernameExists = true;
      }
      if (trimmedPhone && u.phone && String(u.phone).trim() === trimmedPhone) {
        phoneExists = true;
      }
    });

    if (usernameExists) {
      return { ok: false, error: 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر.' };
    }

    if (phoneExists) {
      return { ok: false, error: 'رقم الجوال هذا مسجل مسبقاً بحساب آخر.' };
    }

    const now = new Date();
    const defaultTrialDays = 7;
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

    const userDoc = doc(db, 'users', newUserId);
    await setDoc(userDoc, userData);

    console.log('[Client Firestore] Successfully registered user directly:', newUserId);

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

    return {
      ok: true,
      isAutoApproved: true,
      message: `تم إنشاء الحساب واعتماده بنجاح! تم منحك فترة تجريبية مجانية لمدة ${defaultTrialDays} أيام.`,
      user: safeUser,
    };
  } catch (err: any) {
    console.error('[Client Firestore] Registration error:', err);
    return { ok: false, error: err?.message || 'حدث خطأ أثناء حفظ الحساب في قاعدة البيانات السحابية.' };
  }
}

/**
 * Direct client-side user login fallback to Firestore when serverless API is unreachable or fails.
 */
export async function directLoginUser(
  identifier: string,
  password: string
): Promise<DirectAuthResult> {
  const db = getClientDb();
  if (!db) {
    return { ok: false, error: 'تعذر الاتصال بقاعدة البيانات السحابية.' };
  }

  const trimmed = identifier.trim().toLowerCase();

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    let matchedUser: any = null;

    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      const uName = String(u.username || '').trim().toLowerCase();
      const uPhone = String(u.phone || '').trim().toLowerCase();
      if ((uName === trimmed || (uPhone && uPhone === trimmed)) && String(u.password) === String(password)) {
        matchedUser = { id: docSnap.id, ...u };
      }
    });

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
    console.error('[Client Firestore] Login error:', err);
    return { ok: false, error: err?.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية.' };
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
  const db = getClientDb();
  if (!db) {
    return { ok: false, error: 'تعذر الاتصال بقاعدة البيانات السحابية.' };
  }

  const trimmedId = identifier.trim().toLowerCase();
  const trimmedCode = recoveryCode.trim().toLowerCase();

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    let targetDocId: string | null = null;
    let targetUser: any = null;

    snapshot.forEach((docSnap) => {
      const u = docSnap.data();
      const uName = String(u.username || '').trim().toLowerCase();
      const uPhone = String(u.phone || '').trim().toLowerCase();
      if (uName === trimmedId || (uPhone && uPhone === trimmedId)) {
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
    console.error('[Client Firestore] Reset password error:', err);
    return { ok: false, error: err?.message || 'حدث خطأ أثناء تحديث كلمة المرور في قاعدة البيانات السحابية.' };
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



