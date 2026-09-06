import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc as firebaseSetDoc,
  updateDoc as firebaseUpdateDoc,
  deleteDoc as firebaseDeleteDoc,
  Firestore,
  DocumentReference,
} from 'firebase/firestore';

export type ChangeCallback = (collectionName: string) => void;
const changeListeners: ChangeCallback[] = [];

export function onDatabaseChange(callback: ChangeCallback) {
  changeListeners.push(callback);
}

function notifyChange(collectionName: string) {
  changeListeners.forEach(cb => cb(collectionName));
}

async function setDoc(docRef: DocumentReference<any, any>, data: any, options?: any) {
  const result = options ? await firebaseSetDoc(docRef, data, options) : await firebaseSetDoc(docRef, data);
  notifyChange(docRef.parent.id);
  return result;
}

async function updateDoc(docRef: DocumentReference<any, any>, data: any) {
  const result = await firebaseUpdateDoc(docRef, data);
  notifyChange(docRef.parent.id);
  return result;
}

async function deleteDoc(docRef: DocumentReference<any, any>) {
  const result = await firebaseDeleteDoc(docRef);
  notifyChange(docRef.parent.id);
  return result;
}

export interface StoredUser {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  recoveryCode?: string;
  password: string;
  role: 'user' | 'admin';
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

export interface StoredCategory {
  id: string;
  name: string;
  isDefault?: boolean;
  createdAt: string;
}

let firestoreDb: Firestore | null = null;
let isInitialized = false;

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

    const app = initializeApp(config);
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
    console.error('Error fetching users from Firestore:', err);
    return null;
  }
}

export async function saveUserToFirestore(user: StoredUser): Promise<boolean> {
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
    console.error(`Error saving user ${user.id} to Firestore:`, err);
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
}

export async function fetchSettingsFromFirestore(): Promise<StoredSettings | null> {
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
    console.error('Error fetching settings from Firestore:', err);
    return null;
  }
}

export async function saveSettingsToFirestore(settings: StoredSettings): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    await setDoc(settingsRef, settings, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
    return false;
  }
}

export async function updateUserInFirestore(
  userId: string,
  partial: Partial<StoredUser>
): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, partial as any, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error updating user ${userId} in Firestore:`, err);
    return false;
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return true;
  } catch (err) {
    console.error(`Error deleting user ${userId} from Firestore:`, err);
    return false;
  }
}

export async function fetchLawsFromFirestore(): Promise<StoredLaw[] | null> {
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
    console.error('Error fetching laws from Firestore:', err);
    return null;
  }
}

export async function saveLawToFirestore(law: StoredLaw): Promise<boolean> {
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
    console.error(`Error saving law ${law.id} to Firestore:`, err);
    return false;
  }
}

export async function updateLawInFirestore(
  lawId: string,
  partial: Partial<StoredLaw>
): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const lawRef = doc(db, 'laws', lawId);
    await updateDoc(lawRef, partial as any);
    return true;
  } catch (err) {
    console.error(`Error updating law ${lawId} in Firestore:`, err);
    return false;
  }
}

export async function deleteLawFromFirestore(lawId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const lawRef = doc(db, 'laws', lawId);
    await deleteDoc(lawRef);
    return true;
  } catch (err) {
    console.error(`Error deleting law ${lawId} from Firestore:`, err);
    return false;
  }
}

export async function fetchCategoriesFromFirestore(): Promise<StoredCategory[] | null> {
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
    console.error('Error fetching categories from Firestore:', err);
    return null;
  }
}

export async function saveCategoryToFirestore(category: StoredCategory): Promise<boolean> {
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
    console.error(`Error saving category ${category.id} to Firestore:`, err);
    return false;
  }
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const catRef = doc(db, 'legal_categories', categoryId);
    await deleteDoc(catRef);
    return true;
  } catch (err) {
    console.error(`Error deleting category ${categoryId} from Firestore:`, err);
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
    console.error('Error fetching supervisors from Firestore:', err);
    return null;
  }
}

export async function saveSupervisorToFirestore(supervisor: StoredSupervisor): Promise<boolean> {
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
    console.error(`Error saving supervisor ${supervisor.id} to Firestore:`, err);
    return false;
  }
}

export async function deleteSupervisorFromFirestore(supervisorId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'supervisors', supervisorId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting supervisor ${supervisorId} from Firestore:`, err);
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
    console.error('Error fetching related sites from Firestore:', err);
    return null;
  }
}

export async function saveRelatedSiteToFirestore(site: StoredRelatedSite): Promise<boolean> {
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
    console.error(`Error saving related site ${site.id} to Firestore:`, err);
    return false;
  }
}

export async function deleteRelatedSiteFromFirestore(siteId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'related_sites', siteId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting related site ${siteId} from Firestore:`, err);
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
    console.error('Error fetching partners from Firestore:', err);
    return null;
  }
}

export async function savePartnerToFirestore(partner: StoredPartner): Promise<boolean> {
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
    console.error(`Error saving partner ${partner.id} to Firestore:`, err);
    return false;
  }
}

export async function deletePartnerFromFirestore(partnerId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'partners', partnerId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting partner ${partnerId} from Firestore:`, err);
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
  const db = initFirestore();
  if (!db) return null;

  try {
    const docRef = doc(db, 'system_settings', 'platform_about');
    const docSnap = await getDocs(collection(db, 'system_settings'));
    let found: StoredPlatformAbout | null = null;
    docSnap.forEach((snap) => {
      if (snap.id === 'platform_about') {
        found = snap.data() as StoredPlatformAbout;
      }
    });
    return found;
  } catch (err) {
    console.error('Error fetching platform_about from Firestore:', err);
    return null;
  }
}

export async function savePlatformAboutToFirestore(data: StoredPlatformAbout): Promise<boolean> {
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
    console.error('Error fetching contact_info from Firestore:', err);
    return null;
  }
}

export async function saveContactInfoToFirestore(data: StoredContactInfo): Promise<boolean> {
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
    console.error('Error saving contact_info to Firestore:', err);
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
    console.error('Error fetching conversations from Firestore:', err);
    return null;
  }
}

export async function saveConversationToFirestore(conv: StoredConversation): Promise<boolean> {
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
    console.error(`Error saving conversation ${conv.id} to Firestore:`, err);
    return false;
  }
}

export async function deleteConversationFromFirestore(convId: string): Promise<boolean> {
  const db = initFirestore();
  if (!db) return false;

  try {
    const docRef = doc(db, 'conversations', convId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting conversation ${convId} from Firestore:`, err);
    return false;
  }
}

export async function clearUserConversationsFromFirestore(userId: string): Promise<boolean> {
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
    console.error(`Error clearing conversations for user ${userId} from Firestore:`, err);
    return false;
  }
}

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

    // Check all collections in parallel
    const [lawSnap, userSnap, catSnap, supSnap, siteSnap, settingsSnap, partnersSnap] = await Promise.all([
      getDocs(lawsCol),
      getDocs(usersCol),
      getDocs(catCol),
      getDocs(supCol),
      getDocs(sitesCol),
      getDocs(settingsCol),
      getDocs(partnersCol),
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

    if (seedTasks.length > 0) {
      await Promise.all(seedTasks);
      console.log('✅ Parallel Firestore database seeding completed.');
    }
  } catch (err) {
    console.error('Error during Firestore database seeding:', err);
  }
}
