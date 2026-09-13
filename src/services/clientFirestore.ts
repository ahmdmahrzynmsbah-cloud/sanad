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

    const userData: any = {
      id: newUserId,
      username: trimmedUsername,
      fullName: trimmedFullName,
      phone: trimmedPhone,
      recoveryCode: trimmedRecoveryCode,
      password: String(payload.password),
      role: 'user',
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


