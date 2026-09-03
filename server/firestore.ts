import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';

export interface StoredUser {
  id: string;
  username: string;
  fullName?: string;
  phone?: string;
  recoveryCode?: string;
  password: string;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
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

export function initFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('⚠️ firebase-applet-config.json not found. Firestore will run in offline mode.');
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!config.apiKey || !config.projectId) {
      console.warn('⚠️ Invalid Firebase config. Firestore disabled.');
      return null;
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
    });
    return true;
  } catch (err) {
    console.error(`Error saving user ${user.id} to Firestore:`, err);
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

/**
 * Seed initial laws, users, and categories to Firestore if they do not already exist
 */
export async function seedFirestoreIfEmpty(
  initialUsers: StoredUser[],
  initialLaws: StoredLaw[],
  initialCategories: StoredCategory[]
) {
  const db = initFirestore();
  if (!db) return;

  try {
    const lawsCol = collection(db, 'laws');
    const usersCol = collection(db, 'users');
    const catCol = collection(db, 'legal_categories');

    // Check all collections in parallel
    const [lawSnap, userSnap, catSnap] = await Promise.all([
      getDocs(lawsCol),
      getDocs(usersCol),
      getDocs(catCol),
    ]);

    const seedTasks: Promise<any>[] = [];

    if (lawSnap.empty) {
      console.log('Seeding initial laws to Firestore cloud database in parallel...');
      seedTasks.push(Promise.all(initialLaws.map((law) => saveLawToFirestore(law))));
    }

    if (userSnap.empty) {
      console.log('Seeding demo users to Firestore cloud database in parallel...');
      seedTasks.push(Promise.all(initialUsers.map((user) => saveUserToFirestore(user))));
    }

    if (catSnap.empty) {
      console.log('Seeding default legal categories to Firestore cloud database in parallel...');
      seedTasks.push(Promise.all(initialCategories.map((cat) => saveCategoryToFirestore(cat))));
    }

    if (seedTasks.length > 0) {
      await Promise.all(seedTasks);
      console.log('✅ Parallel Firestore database seeding completed.');
    }
  } catch (err) {
    console.error('Error during Firestore database seeding:', err);
  }
}
