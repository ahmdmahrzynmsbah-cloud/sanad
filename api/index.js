// server.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// server/firestore.ts
import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc as firebaseSetDoc,
  updateDoc as firebaseUpdateDoc,
  deleteDoc as firebaseDeleteDoc
} from "firebase/firestore";
var changeListeners = [];
function onDatabaseChange(callback) {
  changeListeners.push(callback);
}
function notifyChange(collectionName) {
  changeListeners.forEach((cb) => cb(collectionName));
}
async function setDoc(docRef, data, options) {
  const result = options ? await firebaseSetDoc(docRef, data, options) : await firebaseSetDoc(docRef, data);
  notifyChange(docRef.parent.id);
  return result;
}
async function updateDoc(docRef, data) {
  const result = await firebaseUpdateDoc(docRef, data);
  notifyChange(docRef.parent.id);
  return result;
}
async function deleteDoc(docRef) {
  const result = await firebaseDeleteDoc(docRef);
  notifyChange(docRef.parent.id);
  return result;
}
var firestoreDb = null;
var isInitialized = false;
var DEFAULT_FIREBASE_CONFIG = {
  projectId: "pos1-d562e",
  appId: "1:607061495520:web:86e73b21063ba9c494ca85",
  apiKey: "AIzaSyCmeCCutt5Q9NLuILm8i_XtM1QCSV4_aUo",
  authDomain: "pos1-d562e.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605",
  storageBucket: "pos1-d562e.firebasestorage.app",
  messagingSenderId: "607061495520"
};
function initFirestore() {
  if (firestoreDb) return firestoreDb;
  try {
    let config = DEFAULT_FIREBASE_CONFIG;
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (parsed && parsed.apiKey && parsed.projectId) {
          config = parsed;
        }
      }
    } catch {
    }
    const app2 = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreDb = getFirestore(app2, config.firestoreDatabaseId || void 0);
    isInitialized = true;
    console.log("\u2705 Firestore Database connected successfully to project:", config.projectId, "Database ID:", config.firestoreDatabaseId);
    return firestoreDb;
  } catch (err) {
    console.error("\u274C Failed to initialize Firestore:", err);
    return null;
  }
}
async function fetchUsersFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const usersCol = collection(db2, "users");
    const snapshot = await getDocs(usersCol);
    if (snapshot.empty) {
      return [];
    }
    const users = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        id: docSnap.id,
        ...data
      });
    });
    return users;
  } catch (err) {
    console.error("Error fetching users from Firestore:", err);
    return null;
  }
}
async function saveUserToFirestore(user) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const userRef = doc(db2, "users", user.id);
    await setDoc(userRef, {
      id: user.id,
      username: user.username,
      fullName: user.fullName || "",
      phone: user.phone || "",
      recoveryCode: user.recoveryCode || "",
      password: user.password,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      reviewedAt: user.reviewedAt || "",
      subscriptionStatus: user.subscriptionStatus || "trial",
      trialDays: typeof user.trialDays === "number" ? user.trialDays : 7,
      trialStartedAt: user.trialStartedAt || user.createdAt,
      trialEndsAt: user.trialEndsAt || "",
      isSubscribed: Boolean(user.isSubscribed),
      subscriptionPlan: user.subscriptionPlan || "",
      subscribedAt: user.subscribedAt || "",
      frozenAt: user.frozenAt || "",
      freezeReason: user.freezeReason || ""
    });
    return true;
  } catch (err) {
    console.error(`Error saving user ${user.id} to Firestore:`, err);
    return false;
  }
}
async function fetchSettingsFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const settingsCol = collection(db2, "system_settings");
    const snapshot = await getDocs(settingsCol);
    if (snapshot.empty) {
      return null;
    }
    let found = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === "general") {
        found = docSnap.data();
      }
    });
    return found;
  } catch (err) {
    console.error("Error fetching settings from Firestore:", err);
    return null;
  }
}
async function saveSettingsToFirestore(settings) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const settingsRef = doc(db2, "system_settings", "general");
    await setDoc(settingsRef, settings, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving settings to Firestore:", err);
    return false;
  }
}
async function updateUserInFirestore(userId, partial) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const userRef = doc(db2, "users", userId);
    await setDoc(userRef, partial, { merge: true });
    return true;
  } catch (err) {
    console.error(`Error updating user ${userId} in Firestore:`, err);
    return false;
  }
}
async function deleteUserFromFirestore(userId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const userRef = doc(db2, "users", userId);
    await deleteDoc(userRef);
    return true;
  } catch (err) {
    console.error(`Error deleting user ${userId} from Firestore:`, err);
    return false;
  }
}
async function fetchLawsFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const lawsCol = collection(db2, "laws");
    const snapshot = await getDocs(lawsCol);
    if (snapshot.empty) {
      return [];
    }
    const laws = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      laws.push({
        id: docSnap.id,
        ...data
      });
    });
    return laws;
  } catch (err) {
    console.error("Error fetching laws from Firestore:", err);
    return null;
  }
}
async function saveLawToFirestore(law) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const lawRef = doc(db2, "laws", law.id);
    await setDoc(lawRef, {
      id: law.id,
      title: law.title,
      category: law.category,
      content: law.content,
      sourceFileName: law.sourceFileName || "",
      sourceFileSize: law.sourceFileSize || "",
      pageCount: law.pageCount || 0,
      createdAt: law.createdAt,
      updatedAt: law.updatedAt
    });
    return true;
  } catch (err) {
    console.error(`Error saving law ${law.id} to Firestore:`, err);
    return false;
  }
}
async function updateLawInFirestore(lawId, partial) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const lawRef = doc(db2, "laws", lawId);
    await updateDoc(lawRef, partial);
    return true;
  } catch (err) {
    console.error(`Error updating law ${lawId} in Firestore:`, err);
    return false;
  }
}
async function deleteLawFromFirestore(lawId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const lawRef = doc(db2, "laws", lawId);
    await deleteDoc(lawRef);
    return true;
  } catch (err) {
    console.error(`Error deleting law ${lawId} from Firestore:`, err);
    return false;
  }
}
async function fetchCategoriesFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const catCol = collection(db2, "legal_categories");
    const snapshot = await getDocs(catCol);
    if (snapshot.empty) {
      return [];
    }
    const categories = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      categories.push({
        id: docSnap.id,
        ...data
      });
    });
    return categories;
  } catch (err) {
    console.error("Error fetching categories from Firestore:", err);
    return null;
  }
}
async function saveCategoryToFirestore(category) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const catRef = doc(db2, "legal_categories", category.id);
    await setDoc(catRef, {
      id: category.id,
      name: category.name,
      isDefault: category.isDefault ?? false,
      createdAt: category.createdAt
    });
    return true;
  } catch (err) {
    console.error(`Error saving category ${category.id} to Firestore:`, err);
    return false;
  }
}
async function deleteCategoryFromFirestore(categoryId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const catRef = doc(db2, "legal_categories", categoryId);
    await deleteDoc(catRef);
    return true;
  } catch (err) {
    console.error(`Error deleting category ${categoryId} from Firestore:`, err);
    return false;
  }
}
async function fetchSupervisorsFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const col = collection(db2, "supervisors");
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    return items;
  } catch (err) {
    console.error("Error fetching supervisors from Firestore:", err);
    return null;
  }
}
async function saveSupervisorToFirestore(supervisor) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "supervisors", supervisor.id);
    await setDoc(docRef, {
      id: supervisor.id,
      name: supervisor.name,
      title: supervisor.title,
      bio: supervisor.bio,
      photoUrl: supervisor.photoUrl || "",
      email: supervisor.email || "",
      phone: supervisor.phone || "",
      department: supervisor.department || "",
      order: typeof supervisor.order === "number" ? supervisor.order : 1,
      createdAt: supervisor.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
    return true;
  } catch (err) {
    console.error(`Error saving supervisor ${supervisor.id} to Firestore:`, err);
    return false;
  }
}
async function deleteSupervisorFromFirestore(supervisorId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "supervisors", supervisorId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting supervisor ${supervisorId} from Firestore:`, err);
    return false;
  }
}
async function fetchRelatedSitesFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const col = collection(db2, "related_sites");
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return items;
  } catch (err) {
    console.error("Error fetching related sites from Firestore:", err);
    return null;
  }
}
async function saveRelatedSiteToFirestore(site) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "related_sites", site.id);
    await setDoc(docRef, {
      id: site.id,
      title: site.title,
      description: site.description,
      url: site.url,
      category: site.category || "\u0645\u0648\u0627\u0642\u0639 \u0631\u0633\u0645\u064A\u0629",
      iconType: site.iconType || "landmark",
      isOfficial: site.isOfficial ?? true,
      createdAt: site.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
    return true;
  } catch (err) {
    console.error(`Error saving related site ${site.id} to Firestore:`, err);
    return false;
  }
}
async function deleteRelatedSiteFromFirestore(siteId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "related_sites", siteId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting related site ${siteId} from Firestore:`, err);
    return false;
  }
}
var DEFAULT_PARTNERS = [
  {
    id: "partner-1",
    name: "\u0646\u0642\u0627\u0628\u0629 \u0645\u062F\u0642\u0642\u064A \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u064A\u0646 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 (PACPA)",
    description: "\u062A\u0639\u0627\u0648\u0646 \u0645\u0647\u0646\u064A \u0648\u0645\u0639\u0631\u0641\u064A \u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u0643\u0645\u0631\u062C\u0639 \u0630\u0643\u064A \u0645\u0648\u062B\u0648\u0642 \u0644\u0645\u062F\u0642\u0642\u064A \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u064A\u0646 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646 \u0641\u064A \u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629.",
    category: "\u0646\u0642\u0627\u0628\u0627\u062A \u0648\u062C\u0645\u0639\u064A\u0627\u062A \u0645\u0647\u0646\u064A\u0629",
    partnershipType: "\u0634\u0631\u064A\u0643 \u0645\u0647\u0646\u064A \u0648\u062A\u062F\u0631\u064A\u0628\u064A",
    logoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.pacpa.ps",
    order: 1,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "partner-2",
    name: "\u0627\u062A\u062D\u0627\u062F \u0627\u0644\u063A\u0631\u0641 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629 \u0627\u0644\u0632\u0631\u0627\u0639\u064A\u0629 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629",
    description: "\u0634\u0631\u0627\u0643\u0629 \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0644\u062A\u0645\u0643\u064A\u0646 \u0642\u0637\u0627\u0639 \u0627\u0644\u062A\u062C\u0627\u0631 \u0648\u0627\u0644\u0645\u0633\u062A\u0648\u0631\u062F\u064A\u0646 \u0648\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0645\u0646 \u0641\u0647\u0645 \u0627\u0644\u062A\u0639\u0631\u064A\u0641\u0629 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u064A \u0648\u062A\u0633\u0647\u064A\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629.",
    category: "\u0627\u062A\u062D\u0627\u062F\u0627\u062A \u0648\u0642\u0637\u0627\u0639 \u062E\u0627\u0635",
    partnershipType: "\u0634\u0631\u064A\u0643 \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A",
    logoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.pal-chambers.org",
    order: 2,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "partner-3",
    name: "\u062C\u0645\u0639\u064A\u0629 \u0627\u0644\u0628\u0646\u0648\u0643 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646 (ABP)",
    description: "\u062A\u0646\u0633\u064A\u0642 \u0648\u062A\u0643\u0627\u0645\u0644 \u062D\u0648\u0644 \u0627\u0644\u0645\u0639\u0627\u064A\u064A\u0631 \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0648\u0627\u0644\u0627\u0626\u062A\u0645\u0627\u0646\u064A\u0629 \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0644\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0641\u064A\u0629 \u0648\u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062A\u0633\u0647\u064A\u0644\u0627\u062A \u0627\u0644\u0628\u0646\u0643\u064A\u0629.",
    category: "\u0628\u0646\u0648\u0643 \u0648\u0645\u0624\u0633\u0633\u0627\u062A \u0645\u0627\u0644\u064A\u0629",
    partnershipType: "\u0634\u0631\u064A\u0643 \u0645\u0627\u0644\u064A \u0648\u0627\u0633\u062A\u0634\u0627\u0631\u064A",
    logoUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.abp.ps",
    order: 3,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "partner-4",
    name: "\u0645\u0639\u0647\u062F \u0623\u0628\u062D\u0627\u062B \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0627\u0642\u062A\u0635\u0627\u062F\u064A\u0629 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A (\u0645\u0627\u0633 - MAS)",
    description: "\u062A\u0639\u0627\u0648\u0646 \u0628\u062D\u062B\u064A \u0648\u0639\u0644\u0645\u064A \u0641\u064A \u0645\u062C\u0627\u0644 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u0629\u060C \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0627\u0642\u062A\u0635\u0627\u062F\u064A\u0629\u060C \u0648\u062F\u0631\u0627\u0633\u0629 \u0627\u0644\u0622\u062B\u0627\u0631 \u0627\u0644\u062A\u0646\u0645\u0648\u064A\u0629 \u0644\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u062C\u0645\u0627\u0631\u0643.",
    category: "\u0645\u0631\u0627\u0643\u0632 \u0623\u0628\u062D\u0627\u062B \u0648\u062F\u0631\u0627\u0633\u0627\u062A",
    partnershipType: "\u0634\u0631\u064A\u0643 \u0628\u062D\u062B\u064A \u0648\u0623\u0643\u0627\u062F\u064A\u0645\u064A",
    logoUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=300&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.mas.ps",
    order: 4,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "partner-5",
    name: "\u062C\u0627\u0645\u0639\u0629 \u0628\u064A\u0631\u0632\u064A\u062A - \u0643\u0644\u064A\u0629 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0627\u0642\u062A\u0635\u0627\u062F",
    description: "\u0634\u0631\u0627\u0643\u0629 \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629 \u0644\u062A\u062F\u0631\u064A\u0628 \u0637\u0644\u0628\u0629 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629 \u0648\u0627\u0644\u0639\u0644\u0648\u0645 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u062A\u0623\u0647\u064A\u0644\u0647\u0645 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0627\u062A \u0627\u0644\u0630\u0643\u064A\u0629 \u0644\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0648\u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642\u0627\u062A\u0647\u0627 \u0627\u0644\u0639\u0645\u0644\u064A\u0629.",
    category: "\u062C\u0627\u0645\u0639\u0627\u062A \u0648\u0645\u0624\u0633\u0633\u0627\u062A \u0623\u0643\u0627\u062F\u064A\u0645\u064A\u0629",
    partnershipType: "\u0627\u0639\u062A\u0645\u0627\u062F \u0623\u0643\u0627\u062F\u064A\u0645\u064A \u0648\u062A\u062F\u0631\u064A\u0628",
    logoUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=300&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.birzeit.edu",
    order: 5,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "partner-6",
    name: "\u0645\u0644\u062A\u0642\u0649 \u0631\u062C\u0627\u0644 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A",
    description: "\u062F\u0639\u0645 \u0648\u062A\u0645\u0643\u064A\u0646 \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u062B\u0645\u0631\u064A\u0646 \u0641\u064A \u0627\u0644\u0627\u0633\u062A\u0641\u0627\u062F\u0629 \u0645\u0646 \u0627\u0644\u062D\u0648\u0627\u0641\u0632 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A\u0629 \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u062A\u0634\u062C\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0648\u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644 \u0644\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629.",
    category: "\u0627\u062A\u062D\u0627\u062F\u0627\u062A \u0648\u0642\u0637\u0627\u0639 \u062E\u0627\u0635",
    partnershipType: "\u0634\u0631\u064A\u0643 \u0642\u0637\u0627\u0639 \u0627\u0644\u0623\u0639\u0645\u0627\u0644",
    logoUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80",
    websiteUrl: "https://www.pbf.ps",
    order: 6,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
async function fetchPartnersFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const col = collection(db2, "partners");
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items = [];
    snapshot.forEach((docSnap) => {
      items.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return items;
  } catch (err) {
    console.error("Error fetching partners from Firestore:", err);
    return null;
  }
}
async function savePartnerToFirestore(partner) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "partners", partner.id);
    await setDoc(docRef, {
      id: partner.id,
      name: partner.name,
      description: partner.description,
      category: partner.category || "\u0645\u0624\u0633\u0633\u0627\u062A \u0634\u0631\u064A\u0643\u0629",
      partnershipType: partner.partnershipType || "\u0634\u0631\u064A\u0643 \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A",
      logoUrl: partner.logoUrl || "",
      websiteUrl: partner.websiteUrl || "",
      order: partner.order || 0,
      isActive: partner.isActive !== false,
      createdAt: partner.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
    return true;
  } catch (err) {
    console.error(`Error saving partner ${partner.id} to Firestore:`, err);
    return false;
  }
}
async function deletePartnerFromFirestore(partnerId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "partners", partnerId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting partner ${partnerId} from Firestore:`, err);
    return false;
  }
}
var DEFAULT_PLATFORM_ABOUT = {
  overviewTitle: "\u0639\u0646 \u0645\u0646\u0635\u0629 \xAB\u0633\u064E\u0646\u064E\u062F\xBB",
  overviewContent: "\xAB\u0633\u064E\u0646\u064E\u062F\xBB \u0647\u064A \u0645\u0646\u0635\u062A\u0643 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0630\u0643\u064A\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646\u060C \u0635\u064F\u0645\u0645\u062A \u0644\u062A\u0643\u0648\u0646 \u0645\u0631\u062C\u0639\u0643 \u0627\u0644\u0645\u0648\u062B\u0648\u0642 \u0641\u064A \u0627\u0644\u0636\u0631\u0627\u0626\u0628 \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0641\u064A \u0627\u0644\u062A\u062F\u0642\u064A\u0642. \u0646\u062D\u0646 \u0646\u0642\u062F\u0645 \u0623\u062F\u0648\u0627\u062A \u0630\u0643\u064A\u0629 \u0648\u0623\u0646\u0638\u0645\u0629 \u0645\u062A\u0637\u0648\u0631\u0629 \u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u062F\u0642\u0642\u064A\u0646 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0646\u060C \u0648\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0648\u0645\u0643\u0627\u062A\u0628 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629\u060C \u0648\u0627\u0644\u0645\u062F\u0631\u0627\u0621 \u0627\u0644\u0645\u0627\u0644\u064A\u064A\u0646 \u0648\u0627\u0644\u0645\u0647\u062A\u0645\u064A\u0646 \u0645\u0646 \u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u062E\u0627\u0635\u060C \u0645\u0639 \u062A\u062D\u062F\u064A\u062B\u0627\u062A \u0645\u0633\u062A\u0645\u0631\u0629 \u0644\u062A\u0633\u0647\u064A\u0644 \u0623\u0639\u0645\u0627\u0644\u0643\u0645 \u0648\u062A\u0639\u0632\u064A\u0632 \u0643\u0641\u0627\u0621\u062A\u0643\u0645 \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629.",
  visionTitle: "\u0631\u0624\u064A\u062A\u0646\u0627 (Vision)",
  visionContent: "\u0623\u0646 \u0646\u0643\u0648\u0646 \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u0627\u0644\u0630\u0643\u064A\u0629 \u0627\u0644\u0623\u0648\u0644\u0649 \u0648\u0627\u0644\u0631\u0627\u0626\u062F\u0629 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646 \u0648\u0627\u0644\u0645\u0646\u0637\u0642\u0629\u060C \u0627\u0644\u062A\u064A \u062A\u0631\u0628\u0637 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0628\u0627\u0644\u062D\u0644\u0648\u0644 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0627\u0644\u0645\u062A\u0642\u062F\u0645\u0629\u060C \u0644\u062A\u0645\u0643\u064A\u0646 \u0642\u0637\u0627\u0639 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0646 \u0645\u0646 \u0627\u062A\u062E\u0627\u0630 \u0642\u0631\u0627\u0631\u0627\u062A \u062F\u0642\u064A\u0642\u0629 \u0628\u0643\u0644 \u062B\u0642\u0629.",
  missionTitle: "\u0631\u0633\u0627\u0644\u062A\u0646\u0627 (Mission)",
  missionContent: "\u062A\u0645\u0643\u064A\u0646 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0646\u060C \u0648\u0645\u0643\u0627\u062A\u0628 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u0629\u060C \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u062A\u060C \u0648\u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u062E\u0627\u0635 \u0645\u0646 \u062E\u0644\u0627\u0644 \u062A\u0648\u0641\u064A\u0631 \u0645\u0646\u0635\u0629 \u0630\u0643\u064A\u0629 \u062A\u062F\u0645\u062C \u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0627\u0644\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629\u060C \u0644\u062A\u0648\u0641\u064A\u0631 \u0627\u0644\u0648\u0642\u062A\u060C \u0648\u0636\u0645\u0627\u0646 \u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644\u060C \u0648\u062A\u0628\u0633\u064A\u0637 \u0623\u0639\u0642\u062F \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0628\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629 \u0648\u0645\u0635\u0627\u062F\u0631 \u0645\u0648\u062B\u0648\u0642\u0629.",
  customSections: [],
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
async function fetchPlatformAboutFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const docRef = doc(db2, "system_settings", "platform_about");
    const docSnap = await getDocs(collection(db2, "system_settings"));
    let found = null;
    docSnap.forEach((snap) => {
      if (snap.id === "platform_about") {
        found = snap.data();
      }
    });
    return found;
  } catch (err) {
    console.error("Error fetching platform_about from Firestore:", err);
    return null;
  }
}
async function savePlatformAboutToFirestore(data) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "system_settings", "platform_about");
    await setDoc(docRef, {
      overviewTitle: data.overviewTitle || DEFAULT_PLATFORM_ABOUT.overviewTitle,
      overviewContent: data.overviewContent || DEFAULT_PLATFORM_ABOUT.overviewContent,
      visionTitle: data.visionTitle || DEFAULT_PLATFORM_ABOUT.visionTitle,
      visionContent: data.visionContent || DEFAULT_PLATFORM_ABOUT.visionContent,
      missionTitle: data.missionTitle || DEFAULT_PLATFORM_ABOUT.missionTitle,
      missionContent: data.missionContent || DEFAULT_PLATFORM_ABOUT.missionContent,
      customSections: data.customSections || [],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving platform_about to Firestore:", err);
    return false;
  }
}
var DEFAULT_CONTACT_INFO = {
  whatsappNumbers: [
    {
      id: "wa-1",
      name: "\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A \u0648\u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u0645\u0629",
      number: "0599123456",
      description: "\u0645\u062A\u0627\u062D \u0644\u0644\u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u062A\u0642\u0646\u064A\u0629 \u0648\u0627\u0633\u062A\u0641\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u0648\u0627\u0644\u0645\u0643\u0644\u0641\u064A\u0646"
    },
    {
      id: "wa-2",
      name: "\u062E\u062F\u0645\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u0643\u064A\u0646 \u0648\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629",
      number: "0568987654",
      description: "\u0644\u062A\u0641\u0639\u064A\u0644 \u0648\u062A\u062C\u062F\u064A\u062F \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0645\u0629 \u0648\u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0627\u062A \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A\u0629"
    }
  ],
  email: "support@pal-customs.ps",
  secondaryEmail: "info@customs.pmof.ps",
  phoneNumbers: [
    {
      id: "ph-1",
      name: "\u0647\u0627\u062A\u0641 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 (\u0631\u0627\u0645 \u0627\u0644\u0644\u0647)",
      number: "+970 2 297 8888"
    }
  ],
  workHours: "\u0627\u0644\u0623\u062D\u062F - \u0627\u0644\u062E\u0645\u064A\u0633: 8:00 \u0635\u0628\u0627\u062D\u0627\u064B - 3:30 \u0645\u0633\u0627\u0621\u064B (\u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0639\u0628\u0631 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0639\u0644\u0649 \u0645\u062F\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629)",
  address: "\u062F\u0648\u0644\u0629 \u0641\u0644\u0633\u0637\u064A\u0646 \u2022 \u0631\u0627\u0645 \u0627\u0644\u0644\u0647 \u0648\u0627\u0644\u0628\u064A\u0631\u0629 \u2022 \u0645\u062C\u0645\u0639 \u0627\u0644\u0648\u0632\u0627\u0631\u0627\u062A \u2022 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 - \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629",
  notes: "\u0641\u0631\u064A\u0642 \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0645\u0633\u062A\u0634\u0627\u0631\u0648\u0646 \u0645\u062A\u0627\u062D\u0648\u0646 \u0644\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0641\u0648\u0631\u064A \u0639\u0628\u0631 \u0642\u0646\u0648\u0627\u062A \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u0631\u0633\u0645\u064A.",
  updatedAt: "2026-01-01T00:00:00.000Z"
};
async function fetchContactInfoFromFirestore() {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const docSnap = await getDocs(collection(db2, "system_settings"));
    let found = null;
    docSnap.forEach((snap) => {
      if (snap.id === "contact_info") {
        found = snap.data();
      }
    });
    return found;
  } catch (err) {
    console.error("Error fetching contact_info from Firestore:", err);
    return null;
  }
}
async function saveContactInfoToFirestore(data) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "system_settings", "contact_info");
    await setDoc(docRef, {
      whatsappNumbers: Array.isArray(data.whatsappNumbers) ? data.whatsappNumbers : DEFAULT_CONTACT_INFO.whatsappNumbers,
      email: data.email || DEFAULT_CONTACT_INFO.email,
      secondaryEmail: data.secondaryEmail || "",
      phoneNumbers: Array.isArray(data.phoneNumbers) ? data.phoneNumbers : DEFAULT_CONTACT_INFO.phoneNumbers || [],
      workHours: data.workHours || DEFAULT_CONTACT_INFO.workHours,
      address: data.address || DEFAULT_CONTACT_INFO.address,
      notes: data.notes || DEFAULT_CONTACT_INFO.notes,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving contact_info to Firestore:", err);
    return false;
  }
}
async function fetchConversationsFromFirestore(userId) {
  const db2 = initFirestore();
  if (!db2) return null;
  try {
    const col = collection(db2, "conversations");
    const snapshot = await getDocs(col);
    if (snapshot.empty) {
      return [];
    }
    const items = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!userId || data.userId === userId) {
        items.push({
          id: docSnap.id,
          ...data
        });
      }
    });
    items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return items;
  } catch (err) {
    console.error("Error fetching conversations from Firestore:", err);
    return null;
  }
}
async function saveConversationToFirestore(conv) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "conversations", conv.id);
    await setDoc(docRef, {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      messages: conv.messages || [],
      createdAt: conv.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: conv.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
    });
    return true;
  } catch (err) {
    console.error(`Error saving conversation ${conv.id} to Firestore:`, err);
    return false;
  }
}
async function deleteConversationFromFirestore(convId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const docRef = doc(db2, "conversations", convId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error(`Error deleting conversation ${convId} from Firestore:`, err);
    return false;
  }
}
async function clearUserConversationsFromFirestore(userId) {
  const db2 = initFirestore();
  if (!db2) return false;
  try {
    const col = collection(db2, "conversations");
    const snapshot = await getDocs(col);
    const deleteTasks = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
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
var isAlreadySeeded = false;
async function seedFirestoreIfEmpty(initialUsers, initialLaws, initialCategories, initialSupervisors, initialRelatedSites, initialPartners) {
  if (isAlreadySeeded) return;
  const db2 = initFirestore();
  if (!db2) return;
  try {
    const lawsCol = collection(db2, "laws");
    const usersCol = collection(db2, "users");
    const catCol = collection(db2, "legal_categories");
    const supCol = collection(db2, "supervisors");
    const sitesCol = collection(db2, "related_sites");
    const settingsCol = collection(db2, "system_settings");
    const partnersCol = collection(db2, "partners");
    const [lawSnap, userSnap, catSnap, supSnap, siteSnap, settingsSnap, partnersSnap] = await Promise.all([
      getDocs(lawsCol),
      getDocs(usersCol),
      getDocs(catCol),
      getDocs(supCol),
      getDocs(sitesCol),
      getDocs(settingsCol),
      getDocs(partnersCol)
    ]);
    const seedTasks = [];
    let hasAbout = false;
    let hasContact = false;
    settingsSnap.forEach((docSnap) => {
      if (docSnap.id === "platform_about") hasAbout = true;
      if (docSnap.id === "contact_info") hasContact = true;
    });
    if (!hasAbout) {
      console.log("Seeding default platform_about to Firestore...");
      seedTasks.push(savePlatformAboutToFirestore(DEFAULT_PLATFORM_ABOUT));
    }
    if (!hasContact) {
      console.log("Seeding default contact_info to Firestore...");
      seedTasks.push(saveContactInfoToFirestore(DEFAULT_CONTACT_INFO));
    }
    if (lawSnap.empty) {
      console.log("Seeding initial laws to Firestore cloud database in parallel...");
      seedTasks.push(Promise.all(initialLaws.map((law) => saveLawToFirestore(law))));
    }
    if (catSnap.empty) {
      console.log("Seeding default legal categories to Firestore cloud database in parallel...");
      seedTasks.push(Promise.all(initialCategories.map((cat) => saveCategoryToFirestore(cat))));
    }
    if (supSnap.empty && initialSupervisors && initialSupervisors.length > 0) {
      console.log("Seeding default supervisors to Firestore cloud database...");
      seedTasks.push(Promise.all(initialSupervisors.map((s) => saveSupervisorToFirestore(s))));
    }
    if (siteSnap.empty && initialRelatedSites && initialRelatedSites.length > 0) {
      console.log("Seeding default related sites to Firestore cloud database...");
      seedTasks.push(Promise.all(initialRelatedSites.map((s) => saveRelatedSiteToFirestore(s))));
    }
    if (partnersSnap.empty && initialPartners && initialPartners.length > 0) {
      console.log("Seeding default partners to Firestore cloud database...");
      seedTasks.push(Promise.all(initialPartners.map((p) => savePartnerToFirestore(p))));
    }
    if (seedTasks.length > 0) {
      await Promise.all(seedTasks);
      console.log("\u2705 Parallel Firestore database seeding completed.");
    }
    isAlreadySeeded = true;
  } catch (err) {
    console.error("Error during Firestore database seeding:", err);
  }
}

// server.ts
dotenv.config();
var app = express();
var PORT = 3e3;
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-requested-with");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use((req, res, next) => {
  if (!req.url.startsWith("/api") && (req.url.startsWith("/auth") || req.url.startsWith("/laws") || req.url.startsWith("/categories") || req.url.startsWith("/settings") || req.url.startsWith("/admin") || req.url.startsWith("/ask") || req.url.startsWith("/export") || req.url.startsWith("/supervisors") || req.url.startsWith("/related-sites") || req.url.startsWith("/partners") || req.url.startsWith("/contact-info") || req.url.startsWith("/platform-about"))) {
    req.url = "/api" + req.url;
  }
  next();
});
var syncPromise = null;
var lastSyncTime = 0;
async function ensureDbSynced() {
  const now = Date.now();
  const isStale = lastSyncTime === 0 || now - lastSyncTime > 6e4;
  if (!syncPromise || isStale) {
    syncPromise = syncWithFirestore().then(() => {
      lastSyncTime = Date.now();
    }).catch((err) => {
      console.error("Sync failed:", err);
      lastSyncTime = Date.now();
    });
  }
  await Promise.race([
    syncPromise,
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]);
}
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/admin/login") {
    await ensureDbSynced();
  }
  next();
});
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large" || err?.status === 413) {
    return res.status(413).json({
      error: "\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u0623\u0648 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0644\u0629 \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B. \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0647\u0648 50 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A."
    });
  }
  next(err);
});
var syncClients = /* @__PURE__ */ new Set();
app.get("/api/sync", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  syncClients.add(res);
  req.on("close", () => {
    syncClients.delete(res);
  });
});
onDatabaseChange((collectionName) => {
  syncClients.forEach((client) => {
    client.write(`data: ${JSON.stringify({ type: "update", collection: collectionName })}

`);
  });
});
var DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? path2.join("/tmp", "data") : path2.join(process.cwd(), "data");
var DB_FILE = path2.join(DATA_DIR, "db.json");
var DEFAULT_CATEGORIES = [
  { id: "cat-customs", name: "\u062C\u0645\u0627\u0631\u0643", isDefault: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "cat-income-tax", name: "\u0636\u0631\u064A\u0628\u0629 \u062F\u062E\u0644", isDefault: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "cat-vat", name: "\u0636\u0631\u064A\u0628\u0629 \u0642\u064A\u0645\u0629 \u0645\u0636\u0627\u0641\u0629", isDefault: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "cat-other", name: "\u0623\u062E\u0631\u0649", isDefault: true, createdAt: "2026-01-01T00:00:00.000Z" }
];
var DEFAULT_FOUNDER = {
  founderName: "\u0627\u0644\u0645\u0633\u062A\u0634\u0627\u0631 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A \u0623. \u0645\u062D\u0645\u062F \u0646\u0627\u0635\u0631 \u062E\u0644\u064A\u0644",
  founderTitle: "\u0645\u0633\u062A\u0634\u0627\u0631 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629",
  founderBio: "\u062E\u0628\u064A\u0631 \u0648\u0645\u0633\u062A\u0634\u0627\u0631 \u0642\u0627\u0646\u0648\u0646\u064A \u0648\u062A\u0634\u0631\u064A\u0639\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0627\u0644\u0646\u0638\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 \u0648\u0642\u0648\u0627\u0646\u064A\u0646 \u062A\u0634\u062C\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631. \u0623\u0633\u0647\u0645 \u0641\u064A \u0635\u064A\u0627\u063A\u0629 \u0648\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u062F\u064A\u062F \u0645\u0646 \u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0628\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0644\u0648\u0627\u0626\u062D \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A\u0629 \u0648\u0645\u0630\u0643\u0631\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u0644\u062F\u0649 \u0627\u0644\u0645\u062D\u0627\u0643\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629. \u0628\u0627\u062F\u0631 \u0628\u062A\u0623\u0633\u064A\u0633 \u0648\u062A\u0637\u0648\u064A\u0631 \u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0635\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u0627\u0644\u0630\u0643\u064A\u0629 \u0644\u062A\u0643\u0648\u0646 \u0645\u0631\u062C\u0639\u0627\u064B \u0645\u0648\u062B\u0642\u0627\u064B \u0648\u062D\u0635\u0646\u0627\u064B \u0642\u0627\u0646\u0648\u0646\u064A\u0627\u064B \u064A\u064F\u0645\u0643\u0651\u0646 \u0627\u0644\u062A\u062C\u0627\u0631 \u0648\u0627\u0644\u0645\u0643\u0644\u0641\u064A\u0646 \u0648\u0627\u0644\u0645\u0633\u062A\u0648\u0631\u062F\u064A\u0646 \u0648\u0627\u0644\u0645\u0648\u0627\u0637\u0646\u064A\u0646 \u0645\u0646 \u0627\u0644\u0625\u0644\u0645\u0627\u0645 \u0628\u062D\u0642\u0648\u0642\u0647\u0645 \u0648\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A\u0647\u0645 \u0648\u062D\u0648\u0627\u0641\u0632\u0647\u0645 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A\u0629 \u0628\u0648\u0636\u0648\u062D \u0648\u0634\u0641\u0627\u0641\u064A\u0629 \u0648\u062F\u0642\u0629 \u0645\u062A\u0646\u0627\u0647\u064A\u0629.",
  founderPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
  founderQuote: "\xAB\u0627\u0644\u0648\u0639\u064A \u0628\u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639 \u0627\u0644\u0636\u0631\u064A\u0628\u064A \u0648\u0627\u0644\u062C\u0645\u0631\u0643\u064A \u0647\u0648 \u0623\u0648\u0644\u0649 \u0631\u0643\u0627\u0626\u0632 \u0627\u0644\u0639\u062F\u0627\u0644\u0629 \u0627\u0644\u0627\u0642\u062A\u0635\u0627\u062F\u064A\u0629 \u0648\u0628\u0646\u0627\u0621 \u062F\u0648\u0644\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A \u0648\u0633\u064A\u0627\u062F\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646.\xBB",
  siteOverview: "\u0645\u0646\u0635\u0629 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062C\u0645\u0631\u0643\u064A \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u064A \u0647\u064A \u0623\u0648\u0644 \u0645\u0646\u0638\u0648\u0645\u0629 \u0648\u0637\u0646\u064A\u0629 \u0630\u0643\u064A\u0629 \u0645\u062A\u062E\u0635\u0635\u0629 \u062A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0627\u0644\u0645\u0639\u0632\u0632 \u0628\u0627\u0644\u0646\u0635\u0648\u0635 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0628\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627 \u0641\u064A \u062F\u0648\u0644\u0629 \u0641\u0644\u0633\u0637\u064A\u0646 (\u0645\u062B\u0644 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0645\u0643\u0648\u0633 \u0631\u0642\u0645 (1) \u0644\u0633\u0646\u0629 1962\u0645 \u0648\u062A\u0639\u062F\u064A\u0644\u0627\u062A\u0647\u060C \u0648\u0642\u0631\u0627\u0631 \u0628\u0642\u0627\u0646\u0648\u0646 \u0631\u0642\u0645 (8) \u0644\u0633\u0646\u0629 2011\u0645 \u0628\u0634\u0623\u0646 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644 \u0648\u062A\u0639\u062F\u064A\u0644\u0627\u062A\u0647\u060C \u0648\u0642\u0627\u0646\u0648\u0646 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629)\u060C \u0644\u062A\u0642\u062F\u064A\u0645 \u0625\u062C\u0627\u0628\u0627\u062A \u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0648\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0645\u0648\u062B\u0642\u0629 \u0648\u062F\u0642\u064A\u0642\u0629 \u0644\u0644\u0645\u0643\u0644\u0641\u064A\u0646\u060C \u0627\u0644\u062A\u062C\u0627\u0631\u060C \u0627\u0644\u0645\u0633\u062A\u0648\u0631\u062F\u064A\u0646\u060C \u0648\u0627\u0644\u0645\u0648\u0627\u0637\u0646\u064A\u0646 \u0639\u0644\u0649 \u0645\u062F\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629."
};
var DEFAULT_BRANDING = {
  systemName: "\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0636\u0631\u0627\u0626\u0628",
  systemSubtitle: "\u062F\u0648\u0644\u0629 \u0641\u0644\u0633\u0637\u064A\u0646 \u2022 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u2022 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644",
  systemBadge: "\u0641\u0644\u0633\u0637\u064A\u0646",
  logoType: "preset",
  logoPreset: "scale",
  logoUrl: "",
  logoAccentColor: "#d4af37",
  ...DEFAULT_FOUNDER
};
var DEFAULT_SUPERVISORS = [
  {
    id: "sup-1",
    name: "\u062F. \u062E\u0644\u064A\u0644 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0634\u062D\u0627\u062F\u0629",
    title: "\u0631\u0626\u064A\u0633 \u0647\u064A\u0626\u0629 \u0627\u0644\u0625\u0634\u0631\u0627\u0641 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u064A",
    bio: "\u062F\u0643\u062A\u0648\u0631\u0627\u0647 \u0641\u064A \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629. \u0623\u0633\u062A\u0627\u0630 \u062C\u0627\u0645\u0639\u064A \u0648\u0645\u0633\u062A\u0634\u0627\u0631 \u0642\u0627\u0646\u0648\u0646\u064A \u0645\u0639\u062A\u0645\u062F\u060C \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0635\u064A\u0627\u063A\u0629 \u0627\u0644\u0644\u0648\u0627\u0626\u062D \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0648\u0627\u0644\u0637\u0639\u0648\u0646 \u0627\u0644\u0627\u0633\u062A\u0626\u0646\u0627\u0641\u064A\u0629 \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0639\u0627\u0645\u0629.",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    email: "k.shehada@pal-tax.ps",
    phone: "+970 59 911 2233",
    department: "\u0627\u0644\u0647\u064A\u0626\u0629 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A\u0629 \u0648\u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629",
    order: 1,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sup-2",
    name: "\u0623. \u0633\u0645\u0631 \u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0645\u064A\u0645\u064A",
    title: "\u0645\u0634\u0631\u0641\u0629 \u0627\u0644\u0645\u0646\u0627\u0632\u0639\u0627\u062A \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0627\u0644\u062A\u0639\u0631\u064A\u0641\u0629 \u0627\u0644\u0645\u0648\u062D\u062F\u0629",
    bio: "\u0645\u0627\u062C\u0633\u062A\u064A\u0631 \u0641\u064A \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u062F\u0648\u0644\u064A\u0629. \u0645\u062A\u062E\u0635\u0635\u0629 \u0641\u064A \u062C\u062F\u0627\u0648\u0644 \u0627\u0644\u062A\u0639\u0631\u064A\u0641\u0629 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0627\u0644\u0645\u0646\u0633\u0642\u0629\u060C \u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0645\u0646\u0634\u0623\u060C \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u062A\u062E\u0644\u064A\u0635 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u060C \u0648\u062D\u0644 \u0645\u0646\u0627\u0632\u0639\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u0646\u0626 \u0648\u0627\u0644\u0645\u0639\u0627\u0628\u0631.",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
    email: "s.tamimi@pal-tax.ps",
    phone: "+970 59 922 3344",
    department: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0648\u0627\u0644\u062A\u0639\u0631\u064A\u0641\u0629 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629",
    order: 2,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sup-3",
    name: "\u0623. \u0631\u0645\u0632\u064A \u0639\u0628\u062F \u0627\u0644\u0647\u0627\u062F\u064A \u0639\u0633\u0627\u0641",
    title: "\u0645\u0634\u0631\u0641 \u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u064A \u0648\u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629",
    bio: "\u0645\u062D\u0627\u0633\u0628 \u0642\u0627\u0646\u0648\u0646\u064A \u0648\u0645\u0633\u062A\u0634\u0627\u0631 \u0636\u0631\u0627\u0626\u0628 \u0645\u0639\u062A\u0645\u062F. \u062E\u0628\u064A\u0631 \u0641\u064A \u0627\u0644\u0641\u062D\u0635 \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0645\u064A\u062F\u0627\u0646\u064A\u060C \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u062F\u0641\u0627\u062A\u0631 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629\u060C \u0648\u0625\u0642\u0631\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0642\u0627\u0635\u0629 \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0648\u062E\u0635\u0645 \u0627\u0644\u0645\u0635\u062F\u0631.",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    email: "r.assaf@pal-tax.ps",
    phone: "+970 59 933 4455",
    department: "\u0644\u062C\u0646\u0629 \u0627\u0644\u0641\u062D\u0635 \u0648\u0627\u0644\u0627\u0645\u062A\u062B\u0627\u0644 \u0627\u0644\u0636\u0631\u064A\u0628\u064A",
    order: 3,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
var DEFAULT_RELATED_SITES = [
  {
    id: "site-1",
    title: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629",
    description: "\u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0644\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0648\u0627\u0632\u0646\u0629 \u0627\u0644\u0639\u0627\u0645\u0629\u060C \u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0627\u0644\u0648\u0632\u0627\u0631\u064A\u0629\u060C \u0627\u0644\u0646\u0634\u0631\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629\u060C \u0648\u0625\u0635\u062F\u0627\u0631\u0627\u062A \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629.",
    url: "https://www.pmof.ps",
    category: "\u0648\u0632\u0627\u0631\u0627\u062A \u0648\u0645\u0624\u0633\u0633\u0627\u062A \u062D\u0643\u0648\u0645\u064A\u0629",
    iconType: "landmark",
    isOfficial: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "site-2",
    title: "\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629",
    description: "\u0627\u0644\u0645\u0646\u0635\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0645\u0643\u0648\u0633 \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 - \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0645\u0642\u0627\u0635\u0629 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629.",
    url: "https://customs.pmof.ps",
    category: "\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0633\u062A\u064A\u0631\u0627\u062F",
    iconType: "scale",
    isOfficial: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "site-3",
    title: "\u062F\u064A\u0648\u0627\u0646 \u0627\u0644\u0641\u062A\u0648\u0649 \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639 (\u0627\u0644\u062C\u0631\u064A\u062F\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 - \u0627\u0644\u0648\u0642\u0627\u0626\u0639 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629)",
    description: "\u0627\u0644\u0645\u0631\u062C\u0639 \u0627\u0644\u062F\u0633\u062A\u0648\u0631\u064A \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0643\u0627\u0641\u0629 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646\u060C \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0628\u0642\u0627\u0646\u0648\u0646\u060C \u0648\u0627\u0644\u0645\u0631\u0627\u0633\u064A\u0645 \u0627\u0644\u0631\u0626\u0627\u0633\u064A\u0629\u060C \u0648\u0627\u0644\u0644\u0648\u0627\u0626\u062D \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A\u0629 \u0627\u0644\u0635\u0627\u062F\u0631\u0629 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646.",
    url: "http://www.diwan.ps",
    category: "\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0648\u0642\u0648\u0627\u0646\u064A\u0646",
    iconType: "file-text",
    isOfficial: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "site-4",
    title: "\u0645\u062C\u0644\u0633 \u0627\u0644\u0642\u0636\u0627\u0621 \u0627\u0644\u0623\u0639\u0644\u0649 \u0648\u0627\u0644\u0645\u062D\u0627\u0643\u0645 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629",
    description: "\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0644\u0645\u062D\u0627\u0643\u0645 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 \u0644\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u0642\u0631\u0627\u0631\u0627\u062A \u0645\u062D\u0643\u0645\u0629 \u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u0642\u0636\u0627\u064A\u0627 \u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0637\u0639\u0648\u0646 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0648\u0623\u062D\u0643\u0627\u0645 \u0645\u062D\u0643\u0645\u0629 \u0627\u0644\u0646\u0642\u0636.",
    url: "https://courts.gov.ps",
    category: "\u0642\u0636\u0627\u0621 \u0648\u0639\u062F\u0627\u0644\u0629",
    iconType: "shield",
    isOfficial: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "site-5",
    title: "\u0633\u0644\u0637\u0629 \u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629",
    description: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0645\u0631\u0643\u0632\u064A \u0648\u0627\u0644\u0645\u0634\u0631\u0641 \u0639\u0644\u0649 \u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u062C\u0647\u0627\u0632 \u0627\u0644\u0645\u0635\u0631\u0641\u064A \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u060C \u0646\u0634\u0631\u0627\u062A \u0623\u0633\u0639\u0627\u0631 \u0635\u0631\u0641 \u0627\u0644\u0639\u0645\u0644\u0627\u062A\u060C \u0648\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0641\u062A\u062D \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u064A\u0629 \u0644\u0644\u062A\u062C\u0627\u0631\u0629.",
    url: "https://www.pma.ps",
    category: "\u062E\u062F\u0645\u0627\u062A \u0645\u0627\u0644\u064A\u0629 \u0648\u0645\u0635\u0631\u0641\u064A\u0629",
    iconType: "landmark",
    isOfficial: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "site-6",
    title: "\u0647\u064A\u0626\u0629 \u062A\u0634\u062C\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0648\u0627\u0644\u0645\u062F\u0646 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629 (IPIPA)",
    description: "\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062D\u0648\u0627\u0641\u0632 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0625\u0639\u0641\u0627\u0621\u0627\u062A \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0648\u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0627\u0644\u0645\u0646\u0635\u0648\u0635 \u0639\u0644\u064A\u0647\u0627 \u0628\u0645\u0648\u062C\u0628 \u0642\u0627\u0646\u0648\u0646 \u062A\u0634\u062C\u064A\u0639 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0644\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0631\u064A\u0627\u062F\u064A\u0629 \u0648\u0627\u0644\u0645\u0635\u0627\u0646\u0639.",
    url: "https://www.pipa.ps",
    category: "\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0648\u062A\u0646\u0645\u064A\u0629",
    iconType: "globe",
    isOfficial: true,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
var INITIAL_LAWS = [
  {
    id: "law-1",
    title: "\u0642\u0631\u0627\u0631 \u0628\u0642\u0627\u0646\u0648\u0646 \u0631\u0642\u0645 (8) \u0644\u0633\u0646\u0629 2011\u0645 \u0628\u0634\u0623\u0646 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644 \u0648\u062A\u0639\u062F\u064A\u0644\u0627\u062A\u0647",
    category: "\u0636\u0631\u064A\u0628\u0629 \u062F\u062E\u0644",
    content: `\u0627\u0644\u0645\u0627\u062F\u0629 (13) - \u0627\u0644\u0625\u0639\u0641\u0627\u0621\u0627\u062A \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u0644\u0644\u0634\u062E\u0635 \u0627\u0644\u0637\u0628\u064A\u0639\u064A:
1. \u064A\u064F\u0645\u0646\u062D \u0627\u0644\u0634\u062E\u0635 \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0627\u0644\u0645\u0642\u064A\u0645 \u0625\u0639\u0641\u0627\u0621\u064B \u0633\u0646\u0648\u064A\u0627\u064B \u0623\u0633\u0627\u0633\u064A\u0627\u064B \u0642\u062F\u0631\u0647 (36,000) \u0633\u062A\u0629 \u0648\u062B\u0644\u0627\u062B\u0648\u0646 \u0623\u0644\u0641 \u0634\u064A\u0643\u0644 \u0645\u0646 \u062F\u062E\u0644\u0647 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062E\u0627\u0636\u0639 \u0644\u0644\u0636\u0631\u064A\u0628\u0629.
2. \u064A\u064F\u0645\u0646\u062D \u0625\u0639\u0641\u0627\u0621 \u0625\u0636\u0627\u0641\u064A \u0628\u0645\u0642\u062F\u0627\u0631 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 \u0641\u064A \u0635\u0646\u0627\u062F\u064A\u0642 \u0627\u0644\u062A\u0642\u0627\u0639\u062F \u0623\u0648 \u0627\u0644\u062A\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u062D\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0648\u0641\u0642\u0627\u064B \u0644\u0644\u062D\u062F\u0648\u062F \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629.

\u0627\u0644\u0645\u0627\u062F\u0629 (18) - \u0627\u0644\u0634\u0631\u0627\u0626\u062D \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u0644\u0644\u0623\u0641\u0631\u0627\u062F (\u062A\u064F\u0637\u0628\u0642 \u0639\u0644\u0649 \u0627\u0644\u062F\u062E\u0644 \u0627\u0644\u0635\u0627\u0641\u064A \u0628\u0639\u062F \u062E\u0635\u0645 \u0627\u0644\u0625\u0639\u0641\u0627\u0621\u0627\u062A \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629):
\u062A\u064F\u0641\u0631\u0636 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644 \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u0639\u0644\u0649 \u062F\u062E\u0648\u0644 \u0627\u0644\u0623\u0641\u0631\u0627\u062F \u0627\u0644\u062E\u0627\u0636\u0639\u0629 \u0644\u0644\u0636\u0631\u064A\u0628\u0629 \u0648\u0641\u0642 \u0627\u0644\u0646\u0633\u0628 \u0627\u0644\u062A\u0635\u0627\u0639\u062F\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629:
- \u0627\u0644\u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u0623\u0648\u0644\u0649: \u0645\u0646 1 \u0634\u064A\u0643\u0644 \u0625\u0644\u0649 75,000 \u0634\u064A\u0643\u0644 \u0633\u0646\u0648\u064A\u0627\u064B \u062A\u064F\u0641\u0631\u0636 \u0628\u0646\u0633\u0628\u0629 5%.
- \u0627\u0644\u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629: \u0645\u0646 75,001 \u0634\u064A\u0643\u0644 \u0625\u0644\u0649 150,000 \u0634\u064A\u0643\u0644 \u0633\u0646\u0648\u064A\u0627\u064B \u062A\u064F\u0641\u0631\u0636 \u0628\u0646\u0633\u0628\u0629 10%.
- \u0627\u0644\u0634\u0631\u064A\u062D\u0629 \u0627\u0644\u062B\u0627\u0644\u062B\u0629: \u0645\u0627 \u0632\u0627\u062F \u0639\u0646 150,000 \u0634\u064A\u0643\u0644 \u0633\u0646\u0648\u064A\u0627\u064B \u062A\u064F\u0641\u0631\u0636 \u0628\u0646\u0633\u0628\u0629 15%.

\u0627\u0644\u0645\u0627\u062F\u0629 (21) - \u0636\u0631\u064A\u0628\u0629 \u062F\u062E\u0644 \u0627\u0644\u0634\u0631\u0643\u0627\u062A:
\u062A\u064F\u0641\u0631\u0636 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644 \u0639\u0644\u0649 \u0635\u0627\u0641\u064A \u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0629 \u0648\u0627\u0644\u0645\u062D\u062F\u0648\u062F\u0629 \u0627\u0644\u062E\u0627\u0636\u0639\u0629 \u0644\u0644\u0636\u0631\u064A\u0628\u0629 \u0628\u0646\u0633\u0628\u0629 \u062B\u0627\u0628\u062A\u0629 \u0642\u062F\u0631\u0647\u0627 15%.`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "law-2",
    title: "\u0642\u0627\u0646\u0648\u0646 \u0648\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646",
    category: "\u0636\u0631\u064A\u0628\u0629 \u0642\u064A\u0645\u0629 \u0645\u0636\u0627\u0641\u0629",
    content: `\u0627\u0644\u0645\u0627\u062F\u0629 (4) - \u0627\u0644\u0646\u0633\u0628\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u0636\u0631\u064A\u0628\u0629:
\u062A\u064F\u0641\u0631\u0636 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0641\u064A \u0641\u0644\u0633\u0637\u064A\u0646 \u0628\u0646\u0633\u0628\u0629 \u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0645\u0648\u062D\u062F\u0629 \u0642\u062F\u0631\u0647\u0627 16% \u0639\u0644\u0649 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0648\u0628\u064A\u0639 \u0643\u0627\u0641\u0629 \u0627\u0644\u0633\u0644\u0639 \u0648\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0641\u064A \u0627\u0644\u0623\u0631\u0627\u0636\u064A \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629.

\u0627\u0644\u0645\u0627\u062F\u0629 (7) - \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0645\u0639\u0641\u0627\u0629 \u0648\u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u062E\u0627\u0636\u0639\u0629 \u0644\u0646\u0633\u0628\u0629 \u0627\u0644\u0635\u0641\u0631:
1. \u062A\u064F\u0639\u0641\u0649 \u062A\u0645\u0627\u0645\u0627\u064B \u0645\u0646 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0633\u0644\u0639 \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0632\u0631\u0627\u0639\u064A\u0629 \u0627\u0644\u0637\u0627\u0632\u062C\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u0635\u0646\u0639\u0629 (\u0627\u0644\u062E\u0636\u0631\u0648\u0627\u062A \u0627\u0644\u0637\u0627\u0632\u062C\u0629\u060C \u0627\u0644\u0641\u0648\u0627\u0643\u0647\u060C \u0628\u064A\u0636 \u0627\u0644\u0645\u0627\u0626\u062F\u0629\u060C \u0648\u0627\u0644\u062D\u0644\u064A\u0628 \u0627\u0644\u0637\u0627\u0632\u062C \u063A\u064A\u0631 \u0627\u0644\u0645\u0628\u0633\u062A\u0631).
2. \u064A\u062E\u0636\u0639 \u0637\u062D\u064A\u0646 \u0627\u0644\u0642\u0645\u062D \u0648\u0627\u0644\u062E\u0628\u0632 \u0627\u0644\u062A\u0645\u0648\u064A\u0646\u064A \u0627\u0644\u0645\u062F\u0639\u0648\u0645 \u0644\u0646\u0633\u0628\u0629 \u0627\u0644\u0635\u0641\u0631 \u0628\u0627\u0644\u0645\u0627\u0626\u0629 (0%) \u0644\u062A\u062E\u0641\u064A\u0641 \u0627\u0644\u0623\u0639\u0628\u0627\u0621 \u0627\u0644\u0645\u0639\u064A\u0634\u064A\u0629.
3. \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u0635\u0631\u0641\u064A\u0629 \u0648\u0627\u0644\u062A\u0623\u0645\u064A\u0646\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0645\u0639\u0641\u0627\u0629 \u0645\u0646 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0645\u0639 \u062E\u0636\u0648\u0639\u0647\u0627 \u0644\u0623\u062D\u0643\u0627\u0645 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062E\u0627\u0635\u0629.

\u0627\u0644\u0645\u0627\u062F\u0629 (14) - \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0642\u0627\u0635\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629:
\u064A\u062A\u0639\u064A\u0646 \u0639\u0644\u0649 \u0643\u0644 \u0645\u0634\u062A\u063A\u0644 \u0645\u0631\u062E\u0635 \u062A\u0633\u062C\u064A\u0644 \u062C\u0645\u064A\u0639 \u0635\u0641\u0642\u0627\u062A\u0647 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0645\u0639 \u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u0622\u062E\u0631 \u0639\u0628\u0631 \u0625\u0635\u062F\u0627\u0631 \u0641\u0648\u0627\u062A\u064A\u0631 \u0636\u0631\u064A\u0628\u064A\u0629 \u0646\u0638\u0627\u0645\u064A\u0629 \u0648\u0641\u0648\u0627\u062A\u064A\u0631 \u0645\u0642\u0627\u0635\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0645\u0647\u0644\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A.`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "law-3",
    title: "\u0644\u0627\u0626\u062D\u0629 \u0627\u0644\u062A\u0639\u0631\u0641\u0629 \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 \u0644\u0644\u0637\u0631\u0648\u062F \u0627\u0644\u0628\u0631\u064A\u062F\u064A\u0629 \u0648\u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A",
    category: "\u062C\u0645\u0627\u0631\u0643",
    content: `\u0627\u0644\u0645\u0627\u062F\u0629 (2) - \u0627\u0644\u0625\u0639\u0641\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u0639\u0644\u0649 \u0627\u0644\u0637\u0631\u0648\u062F \u0627\u0644\u0628\u0631\u064A\u062F\u064A\u0629 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 (\u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629):
1. \u0627\u0644\u0637\u0631\u0648\u062F \u0627\u0644\u0628\u0631\u064A\u062F\u064A\u0629 \u0627\u0644\u0634\u062E\u0635\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0642\u0644 \u0642\u064A\u0645\u062A\u0647\u0627 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0633\u064A\u0641 (CIF - \u062A\u0634\u0645\u0644 \u062B\u0645\u0646 \u0627\u0644\u0633\u0644\u0639\u0629 \u0648\u0627\u0644\u0634\u062D\u0646 \u0648\u0627\u0644\u062A\u0623\u0645\u064A\u0646) \u0639\u0646 75 \u062F\u0648\u0644\u0627\u0631\u0627\u064B \u0623\u0645\u0631\u064A\u0643\u064A\u0627\u064B (\u0623\u0648 \u0645\u0627 \u064A\u0639\u0627\u062F\u0644\u0647\u0627 \u0628\u0627\u0644\u0634\u064A\u0643\u0644 \u0628\u0633\u0639\u0631 \u0627\u0644\u0635\u0631\u0641 \u0627\u0644\u0631\u0633\u0645\u064A) \u0645\u0639\u0641\u0627\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0645\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629\u060C \u0634\u0631\u064A\u0637\u0629 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0634\u062E\u0635\u064A \u063A\u064A\u0631 \u0627\u0644\u062A\u062C\u0627\u0631\u064A.
2. \u0627\u0644\u0637\u0631\u0648\u062F \u0627\u0644\u0628\u0631\u064A\u062F\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0632\u064A\u062F \u0642\u064A\u0645\u062A\u0647\u0627 \u0639\u0646 75 \u062F\u0648\u0644\u0627\u0631\u0627\u064B \u0648\u0644\u0627 \u062A\u062A\u062C\u0627\u0648\u0632 500 \u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A\u060C \u062A\u064F\u0639\u0641\u0649 \u0645\u0646 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0644\u0643\u0646 \u062A\u062E\u0636\u0639 \u0644\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0628\u0646\u0633\u0628\u0629 16% \u0645\u0639 \u0631\u0633\u0645 \u062A\u062E\u0644\u064A\u0635 \u0628\u0631\u064A\u062F\u064A \u0645\u0642\u0637\u0648\u0639.
3. \u0627\u0644\u0637\u0631\u0648\u062F \u0648\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u062A\u064A \u062A\u062A\u062C\u0627\u0648\u0632 \u0642\u064A\u0645\u062A\u0647\u0627 500 \u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A\u060C \u062A\u062E\u0636\u0639 \u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0648\u062A\u064F\u0641\u0631\u0636 \u0639\u0644\u064A\u0647\u0627 \u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0641\u064A \u062C\u062F\u0648\u0644 \u0627\u0644\u062A\u0639\u0631\u0641\u0629 (\u0628\u064A\u0646 5% \u064815% \u062D\u0633\u0628 \u0635\u0646\u0641 \u0627\u0644\u0645\u0627\u062F\u0629) \u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0644\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 16%.

\u0627\u0644\u0645\u0627\u062F\u0629 (9) - \u0627\u0644\u0631\u0633\u0648\u0645 \u0648\u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0639\u0644\u0649 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A:
1. \u0633\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0631\u0643\u0648\u0628 \u0627\u0644\u0639\u0627\u062F\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0639\u0645\u0644 \u0628\u0627\u0644\u0648\u0642\u0648\u062F \u0627\u0644\u062A\u0642\u0644\u064A\u062F\u064A (\u0628\u0646\u0632\u064A\u0646 \u0623\u0648 \u062F\u064A\u0632\u0644) \u062D\u062A\u0649 \u0633\u0639\u0629 2000 \u0633\u064A \u0633\u064A: \u062A\u062E\u0636\u0639 \u0644\u0631\u0633\u0645 \u062C\u0645\u0631\u0643\u064A \u0628\u0646\u0633\u0628\u0629 50% \u0648\u0636\u0631\u064A\u0628\u0629 \u0634\u0631\u0627\u0621 \u0628\u0646\u0633\u0628\u0629 25%\u060C \u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0644\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 16%.
2. \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644: \u062A\u064F\u0634\u062C\u0651\u0639 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 \u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0646\u0638\u064A\u0641\u0629 \u0628\u062A\u062E\u0641\u064A\u0636 \u0627\u0644\u0631\u0633\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A \u0625\u0644\u0649 10% \u0641\u0642\u0637\u060C \u0645\u0639 \u0636\u0631\u064A\u0628\u0629 \u0634\u0631\u0627\u0621 10% \u0648\u0636\u0631\u064A\u0628\u0629 \u0642\u064A\u0645\u0629 \u0645\u0636\u0627\u0641\u0629 16%.`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function initDB() {
  try {
    if (!fs2.existsSync(DATA_DIR)) {
      fs2.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
  }
  if (fs2.existsSync(DB_FILE)) {
    try {
      const content = fs2.readFileSync(DB_FILE, "utf-8");
      const data = JSON.parse(content);
      if (!data.settings) {
        data.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true, ...DEFAULT_BRANDING };
      } else {
        if (typeof data.settings.defaultTrialDays !== "number" || data.settings.defaultTrialDays < 1) {
          data.settings.defaultTrialDays = 7;
        }
        if (typeof data.settings.trialPolicyEnabled !== "boolean") {
          data.settings.trialPolicyEnabled = true;
        }
        if (!data.settings.systemName) data.settings.systemName = DEFAULT_BRANDING.systemName;
        if (!data.settings.systemSubtitle) data.settings.systemSubtitle = DEFAULT_BRANDING.systemSubtitle;
        if (!data.settings.systemBadge) data.settings.systemBadge = DEFAULT_BRANDING.systemBadge;
        if (!data.settings.logoType) data.settings.logoType = DEFAULT_BRANDING.logoType;
        if (!data.settings.logoPreset) data.settings.logoPreset = DEFAULT_BRANDING.logoPreset;
        if (!data.settings.logoAccentColor) data.settings.logoAccentColor = DEFAULT_BRANDING.logoAccentColor;
        if (!data.settings.founderName) data.settings.founderName = DEFAULT_FOUNDER.founderName;
        if (!data.settings.founderTitle) data.settings.founderTitle = DEFAULT_FOUNDER.founderTitle;
        if (!data.settings.founderBio) data.settings.founderBio = DEFAULT_FOUNDER.founderBio;
        if (!data.settings.founderPhotoUrl) data.settings.founderPhotoUrl = DEFAULT_FOUNDER.founderPhotoUrl;
        if (!data.settings.founderQuote) data.settings.founderQuote = DEFAULT_FOUNDER.founderQuote;
        if (!data.settings.siteOverview) data.settings.siteOverview = DEFAULT_FOUNDER.siteOverview;
      }
      if (!data.categories || data.categories.length === 0) {
        data.categories = [...DEFAULT_CATEGORIES];
      }
      if (!data.supervisors || data.supervisors.length === 0) {
        data.supervisors = [...DEFAULT_SUPERVISORS];
      }
      if (!data.relatedSites || data.relatedSites.length === 0) {
        data.relatedSites = [...DEFAULT_RELATED_SITES];
      }
      if (!data.platformAbout) {
        data.platformAbout = { ...DEFAULT_PLATFORM_ABOUT };
      }
      if (!data.contactInfo) {
        data.contactInfo = { ...DEFAULT_CONTACT_INFO };
      }
      return data;
    } catch {
    }
  }
  const initialData = {
    settings: {
      autoApproveNewUsers: true,
      defaultTrialDays: 7,
      trialPolicyEnabled: true,
      ...DEFAULT_BRANDING
    },
    categories: [...DEFAULT_CATEGORIES],
    supervisors: [...DEFAULT_SUPERVISORS],
    relatedSites: [...DEFAULT_RELATED_SITES],
    partners: [...DEFAULT_PARTNERS],
    platformAbout: { ...DEFAULT_PLATFORM_ABOUT },
    contactInfo: { ...DEFAULT_CONTACT_INFO },
    users: [],
    laws: INITIAL_LAWS
  };
  fs2.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  return initialData;
}
var db = initDB();
function saveDB() {
  try {
    fs2.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving DB:", err);
  }
}
function checkAndUpdateUserTrialStatus(user, persist = true) {
  if (user.role === "admin") {
    return {
      isFrozen: false,
      subscriptionStatus: "active",
      remainingDays: 999,
      remainingHours: 999,
      message: "\u062D\u0633\u0627\u0628 \u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0646\u0638\u0627\u0645"
    };
  }
  if (user.status === "pending" || user.status === "rejected") {
    return {
      isFrozen: false,
      subscriptionStatus: user.subscriptionStatus || "trial",
      remainingDays: 0,
      remainingHours: 0,
      trialEndsAt: user.trialEndsAt,
      message: user.status === "pending" ? "\u0627\u0644\u062D\u0633\u0627\u0628 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629" : "\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0631\u0641\u0648\u0636"
    };
  }
  if (user.isSubscribed) {
    user.subscriptionStatus = "active";
    user.status = "approved";
    return {
      isFrozen: false,
      subscriptionStatus: "active",
      remainingDays: 999,
      remainingHours: 999,
      message: "\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u0639\u062A\u0645\u062F \u0648\u0646\u0634\u0637"
    };
  }
  if (user.status === "frozen" || user.subscriptionStatus === "frozen") {
    return {
      isFrozen: true,
      subscriptionStatus: "frozen",
      remainingDays: 0,
      remainingHours: 0,
      trialEndsAt: user.trialEndsAt,
      message: user.freezeReason || "\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062C\u0645\u062F \u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u062F\u0648\u0646 \u0627\u0634\u062A\u0631\u0627\u0643"
    };
  }
  const defaultDays = db.settings?.defaultTrialDays || 7;
  if (!user.trialEndsAt) {
    const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    const trialDays = typeof user.trialDays === "number" && user.trialDays > 0 ? user.trialDays : defaultDays;
    user.trialDays = trialDays;
    user.trialStartedAt = user.createdAt || (/* @__PURE__ */ new Date()).toISOString();
    user.trialEndsAt = new Date(createdTime + trialDays * 24 * 60 * 60 * 1e3).toISOString();
  }
  const now = Date.now();
  const trialEndTime = new Date(user.trialEndsAt).getTime();
  if (now >= trialEndTime) {
    user.status = "frozen";
    user.subscriptionStatus = "frozen";
    user.frozenAt = user.frozenAt || (/* @__PURE__ */ new Date()).toISOString();
    user.freezeReason = "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0644\u0644\u062D\u0633\u0627\u0628 \u062F\u0648\u0646 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643";
    if (persist) {
      saveDB();
      updateUserInFirestore(user.id, {
        status: "frozen",
        subscriptionStatus: "frozen",
        frozenAt: user.frozenAt,
        freezeReason: user.freezeReason
      }).catch((e) => console.error(`Failed to sync auto-freeze to Firestore for ${user.id}:`, e));
    }
    return {
      isFrozen: true,
      subscriptionStatus: "frozen",
      remainingDays: 0,
      remainingHours: 0,
      trialEndsAt: user.trialEndsAt,
      message: "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0644\u062D\u0633\u0627\u0628\u0643. \u062A\u0645 \u062A\u062C\u0645\u064A\u062F \u0627\u0644\u062D\u0633\u0627\u0628 \u0644\u062D\u064A\u0646 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643."
    };
  }
  const diffMs = trialEndTime - now;
  const remainingDays = Math.floor(diffMs / (24 * 60 * 60 * 1e3));
  const remainingHours = Math.floor(diffMs % (24 * 60 * 60 * 1e3) / (60 * 60 * 1e3));
  user.subscriptionStatus = "trial";
  user.status = "approved";
  user.remainingTrialDays = remainingDays;
  user.remainingTrialHours = remainingHours;
  return {
    isFrozen: false,
    subscriptionStatus: "trial",
    remainingDays,
    remainingHours,
    trialEndsAt: user.trialEndsAt,
    message: `\u0641\u062A\u0631\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0633\u0627\u0631\u064A\u0629: \u0645\u062A\u0628\u0642\u064A ${remainingDays} \u064A\u0648\u0645 \u0648 ${remainingHours} \u0633\u0627\u0639\u0629`
  };
}
function toAdminUser(user) {
  const trialInfo = checkAndUpdateUserTrialStatus(user, false);
  return {
    ...user,
    status: user.status,
    subscriptionStatus: trialInfo.subscriptionStatus,
    remainingTrialDays: trialInfo.remainingDays,
    remainingTrialHours: trialInfo.remainingHours,
    isFrozen: trialInfo.isFrozen,
    trialEndsAt: user.trialEndsAt,
    isSubscribed: Boolean(user.isSubscribed)
  };
}
function toSafeUser(user) {
  const trialInfo = checkAndUpdateUserTrialStatus(user, false);
  const { password, recoveryCode, ...rest } = user;
  return {
    ...rest,
    status: user.status,
    subscriptionStatus: trialInfo.subscriptionStatus,
    remainingTrialDays: trialInfo.remainingDays,
    remainingTrialHours: trialInfo.remainingHours,
    isFrozen: trialInfo.isFrozen,
    trialEndsAt: user.trialEndsAt,
    isSubscribed: Boolean(user.isSubscribed)
  };
}
async function syncWithFirestore() {
  try {
    console.log("\u{1F504} Initializing Cloud Firestore sync in background...");
    initFirestore();
    if (!db.categories || db.categories.length === 0) {
      db.categories = [...DEFAULT_CATEGORIES];
    }
    if (!db.supervisors || db.supervisors.length === 0) {
      db.supervisors = [...DEFAULT_SUPERVISORS];
    }
    if (!db.relatedSites || db.relatedSites.length === 0) {
      db.relatedSites = [...DEFAULT_RELATED_SITES];
    }
    if (!db.partners || db.partners.length === 0) {
      db.partners = [...DEFAULT_PARTNERS];
    }
    await seedFirestoreIfEmpty(db.users, db.laws, db.categories, db.supervisors, db.relatedSites, db.partners);
    const [cloudUsers, cloudLaws, cloudCategories, cloudSettings, cloudSupervisors, cloudRelatedSites, cloudPartners, cloudAbout, cloudContact] = await Promise.all([
      fetchUsersFromFirestore(),
      fetchLawsFromFirestore(),
      fetchCategoriesFromFirestore(),
      fetchSettingsFromFirestore(),
      fetchSupervisorsFromFirestore(),
      fetchRelatedSitesFromFirestore(),
      fetchPartnersFromFirestore(),
      fetchPlatformAboutFromFirestore(),
      fetchContactInfoFromFirestore()
    ]);
    let changed = false;
    if (cloudContact) {
      db.contactInfo = cloudContact;
      changed = true;
      console.log("\u2705 Loaded contact info from Cloud Firestore.");
    } else if (db.contactInfo) {
      saveContactInfoToFirestore(db.contactInfo).catch((e) => console.error("Error saving initial contact info to Firestore:", e));
    }
    if (cloudAbout) {
      if (cloudAbout.customSections) {
        cloudAbout.customSections = cloudAbout.customSections.filter(
          (sec) => sec.id !== "sec-goals" && sec.id !== "sec-values"
        );
      }
      db.platformAbout = cloudAbout;
      changed = true;
      console.log("\u2705 Loaded platform about content from Cloud Firestore.");
    } else if (db.platformAbout) {
      savePlatformAboutToFirestore(db.platformAbout).catch((e) => console.error("Error saving initial platform about to Firestore:", e));
    }
    if (cloudSettings) {
      db.settings = {
        autoApproveNewUsers: cloudSettings.autoApproveNewUsers !== false,
        defaultTrialDays: typeof cloudSettings.defaultTrialDays === "number" ? cloudSettings.defaultTrialDays : 7,
        trialPolicyEnabled: cloudSettings.trialPolicyEnabled !== false,
        systemName: cloudSettings.systemName || db.settings?.systemName || DEFAULT_BRANDING.systemName,
        systemSubtitle: cloudSettings.systemSubtitle || db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
        systemBadge: cloudSettings.systemBadge || db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
        logoType: cloudSettings.logoType || db.settings?.logoType || DEFAULT_BRANDING.logoType,
        logoPreset: cloudSettings.logoPreset || db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
        logoUrl: cloudSettings.logoUrl !== void 0 ? cloudSettings.logoUrl : db.settings?.logoUrl || "",
        logoAccentColor: cloudSettings.logoAccentColor || db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,
        founderName: cloudSettings.founderName || db.settings?.founderName || DEFAULT_FOUNDER.founderName,
        founderTitle: cloudSettings.founderTitle || db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
        founderBio: cloudSettings.founderBio || db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
        founderPhotoUrl: cloudSettings.founderPhotoUrl !== void 0 ? cloudSettings.founderPhotoUrl : db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
        founderQuote: cloudSettings.founderQuote || db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
        siteOverview: cloudSettings.siteOverview || db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview
      };
      changed = true;
      console.log(`\u2705 Loaded settings from Cloud Firestore (Default trial: ${db.settings.defaultTrialDays} days, System: "${db.settings.systemName}").`);
    } else if (db.settings) {
      saveSettingsToFirestore({
        autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
        defaultTrialDays: db.settings.defaultTrialDays || 7,
        trialPolicyEnabled: true,
        systemName: db.settings.systemName || DEFAULT_BRANDING.systemName,
        systemSubtitle: db.settings.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
        systemBadge: db.settings.systemBadge || DEFAULT_BRANDING.systemBadge,
        logoType: db.settings.logoType || DEFAULT_BRANDING.logoType,
        logoPreset: db.settings.logoPreset || DEFAULT_BRANDING.logoPreset,
        logoUrl: db.settings.logoUrl || "",
        logoAccentColor: db.settings.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,
        founderName: db.settings.founderName || DEFAULT_FOUNDER.founderName,
        founderTitle: db.settings.founderTitle || DEFAULT_FOUNDER.founderTitle,
        founderBio: db.settings.founderBio || DEFAULT_FOUNDER.founderBio,
        founderPhotoUrl: db.settings.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
        founderQuote: db.settings.founderQuote || DEFAULT_FOUNDER.founderQuote,
        siteOverview: db.settings.siteOverview || DEFAULT_FOUNDER.siteOverview
      }).catch((e) => console.error("Error saving initial settings to Firestore:", e));
    }
    if (cloudUsers) {
      db.users = cloudUsers;
      changed = true;
      console.log(`\u2705 Loaded ${cloudUsers.length} users from Cloud Firestore.`);
    }
    for (const u of db.users) {
      checkAndUpdateUserTrialStatus(u, false);
    }
    if (cloudLaws && cloudLaws.length > 0) {
      db.laws = cloudLaws;
      changed = true;
      console.log(`\u2705 Loaded ${cloudLaws.length} laws from Cloud Firestore.`);
    }
    if (cloudCategories && cloudCategories.length > 0) {
      db.categories = cloudCategories;
      changed = true;
      console.log(`\u2705 Loaded ${cloudCategories.length} categories from Cloud Firestore.`);
    }
    if (cloudSupervisors && cloudSupervisors.length > 0) {
      db.supervisors = cloudSupervisors;
      changed = true;
      console.log(`\u2705 Loaded ${cloudSupervisors.length} supervisors from Cloud Firestore.`);
    }
    if (cloudRelatedSites && cloudRelatedSites.length > 0) {
      db.relatedSites = cloudRelatedSites;
      changed = true;
      console.log(`\u2705 Loaded ${cloudRelatedSites.length} related sites from Cloud Firestore.`);
    }
    if (cloudPartners && cloudPartners.length > 0) {
      db.partners = cloudPartners;
      changed = true;
      console.log(`\u2705 Loaded ${cloudPartners.length} partners from Cloud Firestore.`);
    }
    if (changed) {
      saveDB();
    }
    console.log("\u26A1 Cloud Firestore synchronization complete.");
  } catch (err) {
    console.error("\u274C Error during Cloud Firestore synchronization:", err);
  }
}
var ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123"
};
var geminiClient = null;
function getGemini() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, fullName, phone, recoveryCode } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
    }
    const trimmedUsername = String(username).trim();
    const trimmedFullName = fullName ? String(fullName).trim() : "";
    const trimmedPhone = phone ? String(phone).trim() : "";
    const trimmedRecoveryCode = recoveryCode ? String(recoveryCode).trim() : "";
    if (!trimmedFullName) {
      return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644" });
    }
    if (!trimmedPhone) {
      return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644" });
    }
    if (!trimmedRecoveryCode) {
      return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0631\u0645\u0632 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0641\u064A \u062D\u0627\u0644 \u0646\u0633\u064A\u0627\u0646\u0647\u0627" });
    }
    if (trimmedUsername.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) {
      return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0647\u0630\u0627 \u0645\u062D\u062C\u0648\u0632 \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645" });
    }
    const existingUser = db.users.find(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (existingUser) {
      return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0633\u0645 \u0622\u062E\u0631" });
    }
    if (trimmedPhone) {
      const existingPhone = db.users.find((u) => u.phone && u.phone.trim() === trimmedPhone);
      if (existingPhone) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0647\u0630\u0627 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0628\u062D\u0633\u0627\u0628 \u0622\u062E\u0631" });
      }
    }
    const defaultTrialDays = typeof db.settings?.defaultTrialDays === "number" ? db.settings.defaultTrialDays : 7;
    const now = /* @__PURE__ */ new Date();
    const trialStartedAt = now.toISOString();
    const trialEndsAt = new Date(now.getTime() + defaultTrialDays * 24 * 60 * 60 * 1e3).toISOString();
    const isAutoApprove = db.settings?.autoApproveNewUsers !== false;
    const newUser = {
      id: "user-" + Date.now(),
      username: trimmedUsername,
      fullName: trimmedFullName,
      phone: trimmedPhone,
      recoveryCode: trimmedRecoveryCode,
      password: String(password),
      role: "user",
      status: isAutoApprove ? "approved" : "pending",
      createdAt: now.toISOString(),
      ...isAutoApprove ? { reviewedAt: now.toISOString() } : {},
      // Trial and Subscription policy
      subscriptionStatus: "trial",
      trialDays: defaultTrialDays,
      trialStartedAt,
      trialEndsAt,
      isSubscribed: false
    };
    db.users.push(newUser);
    saveDB();
    try {
      await saveUserToFirestore(newUser);
    } catch (saveErr) {
      console.error("Failed to sync new user to Firestore cloud:", saveErr);
    }
    return res.status(201).json({
      message: isAutoApprove ? `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u0627\u0639\u062A\u0645\u0627\u062F\u0647 \u0628\u0646\u062C\u0627\u062D! \u062A\u0645 \u0645\u0646\u062D\u0643 \u0641\u062A\u0631\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0645\u062C\u0627\u0646\u064A\u0629 \u0644\u0645\u062F\u0629 ${defaultTrialDays} \u0623\u064A\u0627\u0645 \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0636\u0631\u0627\u0626\u0628.` : `\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0637\u0644\u0628 \u0627\u0644\u062D\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D\u060C \u0648\u0647\u0648 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629. \u062A\u0645 \u062A\u062E\u0635\u064A\u0635 \u0641\u062A\u0631\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0645\u062F\u062A\u0647\u0627 ${defaultTrialDays} \u0623\u064A\u0627\u0645 \u062A\u0628\u062F\u0623 \u0641\u0648\u0631 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F.`,
      isAutoApproved: isAutoApprove,
      defaultTrialDays,
      trialEndsAt,
      user: toSafeUser(newUser)
    });
  } catch (err) {
    console.error("Registration internal error:", err);
    return res.status(500).json({ error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628" });
  }
});
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" });
  }
  const trimmed = String(username).trim();
  const user = db.users.find(
    (u) => (u.username.toLowerCase() === trimmed.toLowerCase() || u.phone && u.phone.trim() === trimmed) && u.password === String(password)
  );
  if (!user) {
    return res.status(401).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
  }
  if (user.status === "pending") {
    return res.status(403).json({
      error: "\u062D\u0633\u0627\u0628\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u062D\u0627\u0644\u064A\u0627\u064B\u060C \u0648\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0628\u0648\u062A \u0625\u0644\u0627 \u0628\u0639\u062F \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0633\u0624\u0648\u0644.",
      status: "pending",
      username: user.username,
      fullName: user.fullName
    });
  }
  if (user.status === "rejected") {
    return res.status(403).json({
      error: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u062D\u0633\u0627\u0628\u0643 \u0645\u0646 \u0642\u0650\u0628\u0644 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645. \u064A\u062A\u0639\u0630\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644.",
      status: "rejected",
      username: user.username,
      fullName: user.fullName
    });
  }
  const trialCheck = checkAndUpdateUserTrialStatus(user, true);
  if (trialCheck.isFrozen) {
    return res.status(403).json({
      error: "\u062A\u0645 \u062A\u062C\u0645\u064A\u062F \u062D\u0633\u0627\u0628\u0643 \u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u062F\u0648\u0646 \u0627\u0634\u062A\u0631\u0627\u0643. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645.",
      status: "frozen",
      isFrozen: true,
      subscriptionStatus: "frozen",
      trialEndsAt: user.trialEndsAt,
      username: user.username,
      fullName: user.fullName,
      freezeReason: user.freezeReason || "\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629",
      user: toSafeUser(user)
    });
  }
  return res.json({
    message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0646\u062C\u0627\u062D",
    user: toSafeUser(user)
  });
});
app.post("/api/auth/reset-password", async (req, res) => {
  const { identifier, recoveryCode, newPassword } = req.body;
  if (!identifier || !recoveryCode || !newPassword) {
    return res.status(400).json({
      error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644\u060C \u0648\u0631\u0645\u0632 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u060C \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629"
    });
  }
  if (String(newPassword).length < 4) {
    return res.status(400).json({ error: "\u064A\u062C\u0628 \u0623\u0644\u0627 \u062A\u0642\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0639\u0646 4 \u062E\u0627\u0646\u0627\u062A" });
  }
  const trimmedId = String(identifier).trim().toLowerCase();
  const trimmedCode = String(recoveryCode).trim().toLowerCase();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === trimmedId || u.phone && u.phone.trim().toLowerCase() === trimmedId
  );
  if (!user) {
    return res.status(404).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644" });
  }
  if (!user.recoveryCode || user.recoveryCode.trim().toLowerCase() !== trimmedCode) {
    return res.status(400).json({ error: "\u0631\u0645\u0632 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0644\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628" });
  }
  user.password = String(newPassword);
  saveDB();
  await updateUserInFirestore(user.id, { password: user.password });
  return res.json({
    message: "\u062A\u0645 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0628\u0646\u062C\u0627\u062D! \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0628\u0647\u0627."
  });
});
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" });
  }
  if (username.trim() === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return res.json({
      message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0628\u0646\u062C\u0627\u062D",
      admin: {
        username: ADMIN_CREDENTIALS.username,
        role: "admin"
      }
    });
  }
  return res.status(401).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
});
app.get("/api/system/branding", (req, res) => {
  res.json({
    systemName: db.settings?.systemName || DEFAULT_BRANDING.systemName,
    systemSubtitle: db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
    systemBadge: db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
    logoType: db.settings?.logoType || DEFAULT_BRANDING.logoType,
    logoPreset: db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
    logoUrl: db.settings?.logoUrl || "",
    logoAccentColor: db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,
    founderName: db.settings?.founderName || DEFAULT_FOUNDER.founderName,
    founderTitle: db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
    founderBio: db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
    founderPhotoUrl: db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
    founderQuote: db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
    siteOverview: db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview
  });
});
app.get("/api/system/about", (req, res) => {
  const about = db.platformAbout || DEFAULT_PLATFORM_ABOUT;
  if (about && about.customSections) {
    about.customSections = about.customSections.filter(
      (sec) => sec.id !== "sec-goals" && sec.id !== "sec-values"
    );
  }
  res.json(about);
});
app.get("/api/system/contact", (req, res) => {
  res.json({ contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO });
});
app.get("/api/admin/init", (req, res) => {
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    users: safeUsers,
    laws: db.laws,
    categories: db.categories || [],
    supervisors: (db.supervisors || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
    relatedSites: db.relatedSites || [],
    platformAbout: db.platformAbout || DEFAULT_PLATFORM_ABOUT,
    contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO,
    autoApprove: db.settings?.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings?.defaultTrialDays || 7,
    trialPolicyEnabled: db.settings?.trialPolicyEnabled !== false,
    branding: {
      systemName: db.settings?.systemName || DEFAULT_BRANDING.systemName,
      systemSubtitle: db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
      systemBadge: db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
      logoType: db.settings?.logoType || DEFAULT_BRANDING.logoType,
      logoPreset: db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
      logoUrl: db.settings?.logoUrl || "",
      logoAccentColor: db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,
      founderName: db.settings?.founderName || DEFAULT_FOUNDER.founderName,
      founderTitle: db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
      founderBio: db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
      founderPhotoUrl: db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
      founderQuote: db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
      siteOverview: db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview
    },
    systemStatus: {
      status: "online",
      database: "Google Cloud Firestore (Enterprise NoSQL)",
      provider: "Cloud Firestore",
      projectId: "pos1-d562e",
      databaseId: "ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605",
      usersCount: db.users.length,
      lawsCount: db.laws.length,
      categoriesCount: (db.categories || []).length,
      supervisorsCount: (db.supervisors || []).length,
      relatedSitesCount: (db.relatedSites || []).length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
});
app.get("/api/admin/settings", (req, res) => {
  res.json({
    autoApprove: db.settings?.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings?.defaultTrialDays || 7,
    trialPolicyEnabled: db.settings?.trialPolicyEnabled !== false,
    platformAbout: db.platformAbout || DEFAULT_PLATFORM_ABOUT,
    contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO,
    branding: {
      systemName: db.settings?.systemName || DEFAULT_BRANDING.systemName,
      systemSubtitle: db.settings?.systemSubtitle || DEFAULT_BRANDING.systemSubtitle,
      systemBadge: db.settings?.systemBadge || DEFAULT_BRANDING.systemBadge,
      logoType: db.settings?.logoType || DEFAULT_BRANDING.logoType,
      logoPreset: db.settings?.logoPreset || DEFAULT_BRANDING.logoPreset,
      logoUrl: db.settings?.logoUrl || "",
      logoAccentColor: db.settings?.logoAccentColor || DEFAULT_BRANDING.logoAccentColor,
      founderName: db.settings?.founderName || DEFAULT_FOUNDER.founderName,
      founderTitle: db.settings?.founderTitle || DEFAULT_FOUNDER.founderTitle,
      founderBio: db.settings?.founderBio || DEFAULT_FOUNDER.founderBio,
      founderPhotoUrl: db.settings?.founderPhotoUrl || DEFAULT_FOUNDER.founderPhotoUrl,
      founderQuote: db.settings?.founderQuote || DEFAULT_FOUNDER.founderQuote,
      siteOverview: db.settings?.siteOverview || DEFAULT_FOUNDER.siteOverview
    }
  });
});
app.post("/api/admin/settings/branding", async (req, res) => {
  const {
    systemName,
    systemSubtitle,
    systemBadge,
    logoType,
    logoPreset,
    logoUrl,
    logoAccentColor,
    founderName,
    founderTitle,
    founderBio,
    founderPhotoUrl,
    founderQuote,
    siteOverview
  } = req.body;
  if (!systemName || !String(systemName).trim()) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0635\u062D\u064A\u062D \u0644\u0644\u0646\u0638\u0627\u0645" });
  }
  if (!db.settings) {
    db.settings = {
      autoApproveNewUsers: true,
      defaultTrialDays: 7,
      trialPolicyEnabled: true,
      ...DEFAULT_BRANDING
    };
  }
  db.settings.systemName = String(systemName).trim();
  if (systemSubtitle !== void 0) {
    db.settings.systemSubtitle = String(systemSubtitle).trim();
  }
  if (systemBadge !== void 0) {
    db.settings.systemBadge = String(systemBadge).trim();
  }
  db.settings.logoType = logoType === "url" || logoType === "upload" ? logoType : "preset";
  if (logoPreset) {
    db.settings.logoPreset = String(logoPreset).trim();
  }
  if (logoUrl !== void 0) {
    db.settings.logoUrl = String(logoUrl);
  }
  if (logoAccentColor) {
    db.settings.logoAccentColor = String(logoAccentColor).trim();
  }
  if (founderName !== void 0) db.settings.founderName = String(founderName).trim();
  if (founderTitle !== void 0) db.settings.founderTitle = String(founderTitle).trim();
  if (founderBio !== void 0) db.settings.founderBio = String(founderBio).trim();
  if (founderPhotoUrl !== void 0) db.settings.founderPhotoUrl = String(founderPhotoUrl);
  if (founderQuote !== void 0) db.settings.founderQuote = String(founderQuote).trim();
  if (siteOverview !== void 0) db.settings.siteOverview = String(siteOverview).trim();
  saveDB();
  await saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings.defaultTrialDays || 7,
    trialPolicyEnabled: true,
    systemName: db.settings.systemName,
    systemSubtitle: db.settings.systemSubtitle,
    systemBadge: db.settings.systemBadge,
    logoType: db.settings.logoType,
    logoPreset: db.settings.logoPreset,
    logoUrl: db.settings.logoUrl,
    logoAccentColor: db.settings.logoAccentColor,
    founderName: db.settings.founderName,
    founderTitle: db.settings.founderTitle,
    founderBio: db.settings.founderBio,
    founderPhotoUrl: db.settings.founderPhotoUrl,
    founderQuote: db.settings.founderQuote,
    siteOverview: db.settings.siteOverview
  });
  res.json({
    success: true,
    message: "\u062A\u0645 \u062D\u0641\u0638 \u0648\u062A\u0637\u0628\u064A\u0642 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0633\u064A\u0633\u062A\u0645 \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0624\u0633\u0633 \u0628\u0646\u062C\u0627\u062D \u0648\u062D\u0641\u0638\u0647\u0627 \u0633\u062D\u0627\u0628\u064A\u0627\u064B.",
    branding: {
      systemName: db.settings.systemName,
      systemSubtitle: db.settings.systemSubtitle,
      systemBadge: db.settings.systemBadge,
      logoType: db.settings.logoType,
      logoPreset: db.settings.logoPreset,
      logoUrl: db.settings.logoUrl,
      logoAccentColor: db.settings.logoAccentColor,
      founderName: db.settings.founderName,
      founderTitle: db.settings.founderTitle,
      founderBio: db.settings.founderBio,
      founderPhotoUrl: db.settings.founderPhotoUrl,
      founderQuote: db.settings.founderQuote,
      siteOverview: db.settings.siteOverview
    }
  });
});
app.get("/api/supervisors", (req, res) => {
  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  const sorted = [...db.supervisors].sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ supervisors: sorted });
});
app.post("/api/admin/supervisors", async (req, res) => {
  const { name, title, bio, photoUrl, email, phone, department, order } = req.body;
  if (!name || !String(name).trim() || !title || !String(title).trim()) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0634\u0631\u0641 \u0648\u0635\u0641\u062A\u0647 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  const newSupervisor = {
    id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: String(name).trim(),
    title: String(title).trim(),
    bio: String(bio || "").trim(),
    photoUrl: String(photoUrl || "").trim(),
    email: String(email || "").trim(),
    phone: String(phone || "").trim(),
    department: String(department || "").trim(),
    order: Number(order) || db.supervisors.length + 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.supervisors.push(newSupervisor);
  saveDB();
  await saveSupervisorToFirestore(newSupervisor);
  res.status(201).json({
    success: true,
    message: `\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0634\u0631\u0641 "${newSupervisor.name}" \u0628\u0646\u062C\u0627\u062D`,
    supervisor: newSupervisor,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0))
  });
});
app.put("/api/admin/supervisors/:id", async (req, res) => {
  const { id } = req.params;
  const { name, title, bio, photoUrl, email, phone, department, order } = req.body;
  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  const index = db.supervisors.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0634\u0631\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const existing = db.supervisors[index];
  const updated = {
    ...existing,
    name: name !== void 0 ? String(name).trim() : existing.name,
    title: title !== void 0 ? String(title).trim() : existing.title,
    bio: bio !== void 0 ? String(bio).trim() : existing.bio,
    photoUrl: photoUrl !== void 0 ? String(photoUrl).trim() : existing.photoUrl,
    email: email !== void 0 ? String(email).trim() : existing.email,
    phone: phone !== void 0 ? String(phone).trim() : existing.phone,
    department: department !== void 0 ? String(department).trim() : existing.department,
    order: order !== void 0 ? Number(order) : existing.order
  };
  db.supervisors[index] = updated;
  saveDB();
  await saveSupervisorToFirestore(updated);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0641 "${updated.name}" \u0628\u0646\u062C\u0627\u062D`,
    supervisor: updated,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0))
  });
});
app.delete("/api/admin/supervisors/:id", async (req, res) => {
  const { id } = req.params;
  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  const index = db.supervisors.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0634\u0631\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0630\u0641\u0647 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const removed = db.supervisors[index];
  db.supervisors.splice(index, 1);
  saveDB();
  await deleteSupervisorFromFirestore(id);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0634\u0631\u0641 "${removed.name}" \u0628\u0646\u062C\u0627\u062D`,
    deletedId: id,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0))
  });
});
app.get("/api/related-sites", (req, res) => {
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  res.json({ relatedSites: db.relatedSites });
});
app.post("/api/admin/related-sites", async (req, res) => {
  const { title, description, url, category, iconType, isOfficial } = req.body;
  if (!title || !String(title).trim() || !url || !String(url).trim()) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0631\u0627\u0628\u0637\u0647 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  const newSite = {
    id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: String(title).trim(),
    description: String(description || "").trim(),
    url: String(url).trim(),
    category: String(category || "\u062E\u062F\u0645\u0627\u062A \u062D\u0643\u0648\u0645\u064A\u0629").trim(),
    iconType: String(iconType || "globe").trim(),
    isOfficial: isOfficial !== false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.relatedSites.push(newSite);
  saveDB();
  await saveRelatedSiteToFirestore(newSite);
  res.status(201).json({
    success: true,
    message: `\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0642\u0639 "${newSite.title}" \u0628\u0646\u062C\u0627\u062D`,
    site: newSite,
    relatedSites: db.relatedSites
  });
});
app.put("/api/admin/related-sites/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, url, category, iconType, isOfficial } = req.body;
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  const index = db.relatedSites.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0642\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const existing = db.relatedSites[index];
  const updated = {
    ...existing,
    title: title !== void 0 ? String(title).trim() : existing.title,
    description: description !== void 0 ? String(description).trim() : existing.description,
    url: url !== void 0 ? String(url).trim() : existing.url,
    category: category !== void 0 ? String(category).trim() : existing.category,
    iconType: iconType !== void 0 ? String(iconType).trim() : existing.iconType,
    isOfficial: isOfficial !== void 0 ? Boolean(isOfficial) : existing.isOfficial
  };
  db.relatedSites[index] = updated;
  saveDB();
  await saveRelatedSiteToFirestore(updated);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0639 "${updated.title}" \u0628\u0646\u062C\u0627\u062D`,
    site: updated,
    relatedSites: db.relatedSites
  });
});
app.delete("/api/admin/related-sites/:id", async (req, res) => {
  const { id } = req.params;
  if (!db.relatedSites) {
    db.relatedSites = [...DEFAULT_RELATED_SITES];
  }
  const index = db.relatedSites.findIndex((s) => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0630\u0641\u0647 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const removed = db.relatedSites[index];
  db.relatedSites.splice(index, 1);
  saveDB();
  await deleteRelatedSiteFromFirestore(id);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0642\u0639 "${removed.title}" \u0628\u0646\u062C\u0627\u062D`,
    deletedId: id,
    relatedSites: db.relatedSites
  });
});
app.get("/api/partners", (req, res) => {
  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }
  res.json({ partners: db.partners });
});
app.post("/api/admin/partners", async (req, res) => {
  const { name, description, category, partnershipType, logoUrl, websiteUrl, order, isActive } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0623\u0648 \u0627\u0644\u0634\u0631\u064A\u0643 \u0645\u0637\u0644\u0648\u0628" });
  }
  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }
  const newPartner = {
    id: `partner-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: String(name).trim(),
    description: String(description || "").trim(),
    category: String(category || "\u0645\u0624\u0633\u0633\u0627\u062A \u0634\u0631\u064A\u0643\u0629").trim(),
    partnershipType: String(partnershipType || "\u0634\u0631\u064A\u0643 \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A").trim(),
    logoUrl: String(logoUrl || "").trim(),
    websiteUrl: String(websiteUrl || "").trim(),
    order: typeof order === "number" ? order : db.partners.length + 1,
    isActive: isActive !== false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.partners.push(newPartner);
  saveDB();
  await savePartnerToFirestore(newPartner);
  res.status(201).json({
    success: true,
    message: `\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0634\u0631\u064A\u0643\u0629 "${newPartner.name}" \u0628\u0646\u062C\u0627\u062D`,
    partner: newPartner,
    partners: db.partners
  });
});
app.put("/api/admin/partners/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, category, partnershipType, logoUrl, websiteUrl, order, isActive } = req.body;
  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }
  const index = db.partners.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0634\u0631\u064A\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  }
  const existing = db.partners[index];
  const updated = {
    ...existing,
    name: name !== void 0 ? String(name).trim() : existing.name,
    description: description !== void 0 ? String(description).trim() : existing.description,
    category: category !== void 0 ? String(category).trim() : existing.category,
    partnershipType: partnershipType !== void 0 ? String(partnershipType).trim() : existing.partnershipType,
    logoUrl: logoUrl !== void 0 ? String(logoUrl).trim() : existing.logoUrl,
    websiteUrl: websiteUrl !== void 0 ? String(websiteUrl).trim() : existing.websiteUrl,
    order: order !== void 0 ? Number(order) : existing.order,
    isActive: isActive !== void 0 ? Boolean(isActive) : existing.isActive
  };
  db.partners[index] = updated;
  saveDB();
  await savePartnerToFirestore(updated);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0634\u0631\u064A\u0643\u0629 "${updated.name}" \u0628\u0646\u062C\u0627\u062D`,
    partner: updated,
    partners: db.partners
  });
});
app.delete("/api/admin/partners/:id", async (req, res) => {
  const { id } = req.params;
  if (!db.partners) {
    db.partners = [...DEFAULT_PARTNERS];
  }
  const index = db.partners.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0634\u0631\u064A\u0643\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  }
  const removed = db.partners[index];
  db.partners.splice(index, 1);
  saveDB();
  await deletePartnerFromFirestore(id);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0634\u0631\u064A\u0643\u0629 "${removed.name}" \u0628\u0646\u062C\u0627\u062D`,
    deletedId: id,
    partners: db.partners
  });
});
app.post("/api/admin/settings/branding/reset", async (req, res) => {
  if (!db.settings) {
    db.settings = {
      autoApproveNewUsers: true,
      defaultTrialDays: 7,
      trialPolicyEnabled: true,
      ...DEFAULT_BRANDING
    };
  }
  Object.assign(db.settings, DEFAULT_BRANDING);
  saveDB();
  await saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
    defaultTrialDays: db.settings.defaultTrialDays || 7,
    trialPolicyEnabled: true,
    ...DEFAULT_BRANDING
  });
  res.json({
    success: true,
    message: "\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0634\u0639\u0627\u0631 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0644\u0644\u0633\u064A\u0633\u062A\u0645 \u0628\u0646\u062C\u0627\u062D.",
    branding: DEFAULT_BRANDING
  });
});
app.post("/api/admin/settings/about", async (req, res) => {
  const {
    overviewTitle,
    overviewContent,
    visionTitle,
    visionContent,
    missionTitle,
    missionContent,
    customSections
  } = req.body;
  if (!overviewContent || !String(overviewContent).trim()) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0646\u0628\u0630\u0629 \u062A\u0639\u0631\u064A\u0641\u064A\u0629 \u0635\u062D\u064A\u062D\u0629 \u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629" });
  }
  const updatedAbout = {
    overviewTitle: overviewTitle && String(overviewTitle).trim() || DEFAULT_PLATFORM_ABOUT.overviewTitle,
    overviewContent: String(overviewContent).trim(),
    visionTitle: visionTitle && String(visionTitle).trim() || DEFAULT_PLATFORM_ABOUT.visionTitle,
    visionContent: visionContent && String(visionContent).trim() || DEFAULT_PLATFORM_ABOUT.visionContent,
    missionTitle: missionTitle && String(missionTitle).trim() || DEFAULT_PLATFORM_ABOUT.missionTitle,
    missionContent: missionContent && String(missionContent).trim() || DEFAULT_PLATFORM_ABOUT.missionContent,
    customSections: Array.isArray(customSections) ? customSections : db.platformAbout?.customSections || [],
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.platformAbout = updatedAbout;
  saveDB();
  await savePlatformAboutToFirestore(updatedAbout);
  res.json({
    success: true,
    message: "\u062A\u0645 \u062D\u0641\u0638 \u0648\u062A\u062D\u062F\u064A\u062B \u0645\u062D\u062A\u0648\u0649 \xAB\u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0627\u0644\u0631\u0624\u064A\u0629 \u0648\u0627\u0644\u0631\u0633\u0627\u0644\u0629\xBB \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629.",
    platformAbout: updatedAbout
  });
});
app.post("/api/admin/settings/about/reset", async (req, res) => {
  db.platformAbout = { ...DEFAULT_PLATFORM_ABOUT, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  saveDB();
  await savePlatformAboutToFirestore(db.platformAbout);
  res.json({
    success: true,
    message: "\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0644\u0640 \xAB\u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0627\u0644\u0631\u0624\u064A\u0629 \u0648\u0627\u0644\u0631\u0633\u0627\u0644\u0629\xBB \u0628\u0646\u062C\u0627\u062D.",
    platformAbout: db.platformAbout
  });
});
app.post("/api/admin/settings/contact", async (req, res) => {
  const {
    whatsappNumbers,
    email,
    secondaryEmail,
    phoneNumbers,
    workHours,
    address,
    notes
  } = req.body;
  const current = db.contactInfo || DEFAULT_CONTACT_INFO;
  const updatedContact = {
    whatsappNumbers: Array.isArray(whatsappNumbers) ? whatsappNumbers.map((item, index) => ({
      id: item.id || `wa-${Date.now()}-${index}`,
      name: String(item.name || "").trim(),
      number: String(item.number || "").trim(),
      description: item.description ? String(item.description).trim() : ""
    })) : current.whatsappNumbers,
    email: email !== void 0 ? String(email).trim() : current.email,
    secondaryEmail: secondaryEmail !== void 0 ? String(secondaryEmail).trim() : current.secondaryEmail || "",
    phoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers.map((p, index) => ({
      id: p.id || `ph-${Date.now()}-${index}`,
      name: String(p.name || "").trim(),
      number: String(p.number || "").trim()
    })) : current.phoneNumbers || [],
    workHours: workHours !== void 0 ? String(workHours).trim() : current.workHours,
    address: address !== void 0 ? String(address).trim() : current.address,
    notes: notes !== void 0 ? String(notes).trim() : current.notes,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.contactInfo = updatedContact;
  saveDB();
  await saveContactInfoToFirestore(updatedContact);
  res.json({
    success: true,
    message: "\u062A\u0645 \u062D\u0641\u0638 \u0648\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0648\u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629.",
    contactInfo: updatedContact
  });
});
app.post("/api/admin/settings/contact/reset", async (req, res) => {
  db.contactInfo = { ...DEFAULT_CONTACT_INFO, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  saveDB();
  await saveContactInfoToFirestore(db.contactInfo);
  res.json({
    success: true,
    message: "\u062A\u0645\u062A \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0628\u0646\u062C\u0627\u062D.",
    contactInfo: db.contactInfo
  });
});
app.post("/api/admin/settings/trial", async (req, res) => {
  const { defaultTrialDays } = req.body;
  const days = parseInt(String(defaultTrialDays), 10);
  if (isNaN(days) || days < 1) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0639\u062F\u062F \u0623\u064A\u0627\u0645 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0635\u0627\u0644\u062D (\u064A\u0648\u0645 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644)" });
  }
  if (!db.settings) {
    db.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true };
  }
  db.settings.defaultTrialDays = days;
  saveDB();
  await saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers !== false,
    defaultTrialDays: days,
    trialPolicyEnabled: true
  });
  res.json({
    success: true,
    defaultTrialDays: days,
    message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0625\u0644\u0649 ${days} \u0623\u064A\u0627\u0645 \u0628\u0646\u062C\u0627\u062D \u0648\u062D\u0641\u0638\u0647\u0627 \u0633\u062D\u0627\u0628\u064A\u0627\u064B.`
  });
});
app.post("/api/admin/settings/auto-approve", (req, res) => {
  const { enabled } = req.body;
  if (!db.settings) {
    db.settings = { autoApproveNewUsers: true, defaultTrialDays: 7, trialPolicyEnabled: true };
  }
  db.settings.autoApproveNewUsers = Boolean(enabled);
  saveDB();
  saveSettingsToFirestore({
    autoApproveNewUsers: db.settings.autoApproveNewUsers,
    defaultTrialDays: db.settings.defaultTrialDays || 7,
    trialPolicyEnabled: true
  }).catch((e) => console.error("Error saving settings to Firestore:", e));
  res.json({
    success: true,
    autoApprove: db.settings.autoApproveNewUsers,
    message: db.settings.autoApproveNewUsers ? "\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0646\u0638\u0627\u0645 \u0627\u0644\u0642\u0628\u0648\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0628\u0646\u062C\u0627\u062D" : "\u062A\u0645 \u0625\u064A\u0642\u0627\u0641 \u0646\u0638\u0627\u0645 \u0627\u0644\u0642\u0628\u0648\u0644 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A (\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u064A\u062F\u0648\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629)"
  });
});
app.post("/api/admin/users/auto-approve-all", async (req, res) => {
  const pendingUsers = db.users.filter((u) => u.status === "pending");
  const now = /* @__PURE__ */ new Date();
  const defaultDays = db.settings?.defaultTrialDays || 7;
  for (const user of pendingUsers) {
    user.status = "approved";
    user.reviewedAt = now.toISOString();
    user.subscriptionStatus = "trial";
    user.trialDays = defaultDays;
    user.trialStartedAt = now.toISOString();
    user.trialEndsAt = new Date(now.getTime() + defaultDays * 24 * 60 * 60 * 1e3).toISOString();
    updateUserInFirestore(user.id, {
      status: "approved",
      reviewedAt: user.reviewedAt,
      subscriptionStatus: "trial",
      trialDays: defaultDays,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt
    }).catch((err) => {
      console.error("Firestore bulk update error:", err);
    });
  }
  saveDB();
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    count: pendingUsers.length,
    message: `\u062A\u0645 \u0642\u0628\u0648\u0644 \u0648\u0627\u0639\u062A\u0645\u0627\u062F \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0639\u0644\u0642\u0629 (${pendingUsers.length}) \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 (${defaultDays} \u0623\u064A\u0627\u0645)!`,
    users: safeUsers
  });
});
app.get("/api/admin/users", (req, res) => {
  const adminUsers = db.users.map(toAdminUser);
  res.json({ users: adminUsers });
});
app.get("/api/users/by-username/:username", (req, res) => {
  const username = req.params.username;
  const user = db.users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  res.json({ user: toSafeUser(user) });
});
app.post("/api/admin/users/:id/status", async (req, res) => {
  const id = String(req.params.id).trim();
  const { status } = req.body;
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return res.status(400).json({ error: "\u0627\u0644\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
  }
  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const now = /* @__PURE__ */ new Date();
  user.status = status;
  user.reviewedAt = now.toISOString();
  if (status === "approved") {
    if (!user.isSubscribed) {
      user.subscriptionStatus = "trial";
      const days = user.trialDays || db.settings?.defaultTrialDays || 7;
      user.trialDays = days;
      user.trialStartedAt = user.trialStartedAt || now.toISOString();
      if (!user.trialEndsAt || new Date(user.trialEndsAt).getTime() <= now.getTime()) {
        user.trialEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1e3).toISOString();
      }
    }
  }
  saveDB();
  updateUserInFirestore(user.id, {
    status: user.status,
    reviewedAt: user.reviewedAt,
    subscriptionStatus: user.subscriptionStatus,
    trialDays: user.trialDays,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt
  }).catch((err) => {
    console.error(`Firestore update error for ${user.id}:`, err);
  });
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 "${user.fullName || user.username}" \u0625\u0644\u0649: ${status === "approved" ? "\u0645\u0642\u0628\u0648\u0644 \u0648\u0645\u0635\u0631\u0651\u062D \u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0628\u0648\u062A" : status === "rejected" ? "\u0645\u0631\u0641\u0648\u0636 (\u0645\u0645\u0646\u0648\u0639 \u0645\u0646 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645)" : "\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629"}`,
    user: toSafeUser(user),
    users: safeUsers
  });
});
app.post("/api/admin/users/:id/subscription", async (req, res) => {
  const id = String(req.params.id).trim();
  const { isSubscribed, plan } = req.body;
  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const subscribeActive = Boolean(isSubscribed);
  user.isSubscribed = subscribeActive;
  if (subscribeActive) {
    user.status = "approved";
    user.subscriptionStatus = "active";
    user.subscribedAt = (/* @__PURE__ */ new Date()).toISOString();
    user.subscriptionPlan = plan || "\u0627\u0634\u062A\u0631\u0627\u0643 \u0643\u0627\u0645\u0644 \u0645\u0639\u062A\u0645\u062F";
    user.frozenAt = void 0;
    user.freezeReason = void 0;
  } else {
    user.subscribedAt = void 0;
    user.subscriptionPlan = void 0;
    const check = checkAndUpdateUserTrialStatus(user, false);
    user.subscriptionStatus = check.subscriptionStatus;
    user.status = check.isFrozen ? "frozen" : "approved";
  }
  saveDB();
  await updateUserInFirestore(user.id, {
    isSubscribed: user.isSubscribed,
    subscriptionStatus: user.subscriptionStatus,
    status: user.status,
    subscribedAt: user.subscribedAt || "",
    subscriptionPlan: user.subscriptionPlan || "",
    frozenAt: user.frozenAt || "",
    freezeReason: user.freezeReason || ""
  });
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: subscribeActive ? `\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 "${user.fullName || user.username}" \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u0635\u0631\u064A\u062D\u0647 \u0628\u0627\u0644\u0643\u0627\u0645\u0644!` : `\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 "${user.fullName || user.username}".`,
    user: toSafeUser(user),
    users: safeUsers
  });
});
app.post("/api/admin/users/:id/trial", async (req, res) => {
  const id = String(req.params.id).trim();
  const { trialDays, extendDays, customEndDate } = req.body;
  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const now = Date.now();
  let newEndDate;
  if (customEndDate) {
    newEndDate = new Date(customEndDate);
  } else if (extendDays && !isNaN(Number(extendDays))) {
    const baseTime = user.trialEndsAt && new Date(user.trialEndsAt).getTime() > now ? new Date(user.trialEndsAt).getTime() : now;
    newEndDate = new Date(baseTime + Number(extendDays) * 24 * 60 * 60 * 1e3);
  } else if (trialDays && !isNaN(Number(trialDays))) {
    newEndDate = new Date(now + Number(trialDays) * 24 * 60 * 60 * 1e3);
  } else {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u062A\u062D\u062F\u064A\u062F \u0639\u062F\u062F \u0627\u0644\u0623\u064A\u0627\u0645 \u0623\u0648 \u062A\u0627\u0631\u064A\u062E \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629" });
  }
  user.trialEndsAt = newEndDate.toISOString();
  user.trialDays = Math.max(1, Math.round((newEndDate.getTime() - now) / (24 * 60 * 60 * 1e3)));
  user.subscriptionStatus = "trial";
  user.status = "approved";
  user.frozenAt = void 0;
  user.freezeReason = void 0;
  saveDB();
  await updateUserInFirestore(user.id, {
    trialEndsAt: user.trialEndsAt,
    trialDays: user.trialDays,
    subscriptionStatus: "trial",
    status: "approved",
    frozenAt: "",
    freezeReason: ""
  });
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0648\u062A\u0645\u062F\u064A\u062F \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645 "${user.fullName || user.username}" \u062D\u062A\u0649 ${newEndDate.toLocaleDateString("ar-EG")} \u0648\u062A\u0646\u0634\u064A\u0637 \u062D\u0633\u0627\u0628\u0647 \u0628\u0646\u062C\u0627\u062D.`,
    user: toSafeUser(user),
    users: safeUsers
  });
});
app.post("/api/admin/users/:id/freeze", async (req, res) => {
  const id = String(req.params.id).trim();
  const { reason } = req.body;
  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  user.status = "frozen";
  user.subscriptionStatus = "frozen";
  user.frozenAt = (/* @__PURE__ */ new Date()).toISOString();
  user.freezeReason = reason || "\u062A\u0645 \u062A\u062C\u0645\u064A\u062F \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0646 \u0642\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u0643\u0632\u064A\u0629 \u0644\u062D\u064A\u0646 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643";
  saveDB();
  await updateUserInFirestore(user.id, {
    status: "frozen",
    subscriptionStatus: "frozen",
    frozenAt: user.frozenAt,
    freezeReason: user.freezeReason
  });
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062A\u062C\u0645\u064A\u062F \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 "${user.fullName || user.username}" \u0628\u0646\u062C\u0627\u062D.`,
    user: toSafeUser(user),
    users: safeUsers
  });
});
app.post("/api/admin/users/:id/unfreeze", async (req, res) => {
  const id = String(req.params.id).trim();
  const { grantTrialDays, activateSubscription } = req.body;
  const user = db.users.find(
    (u) => u.id === id || u.username.toLowerCase() === id.toLowerCase()
  );
  if (!user) {
    return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  if (activateSubscription) {
    user.isSubscribed = true;
    user.subscriptionStatus = "active";
    user.status = "approved";
    user.subscribedAt = (/* @__PURE__ */ new Date()).toISOString();
    user.subscriptionPlan = "\u0627\u0634\u062A\u0631\u0627\u0643 \u0645\u0639\u062A\u0645\u062F";
  } else {
    const days = grantTrialDays && !isNaN(Number(grantTrialDays)) ? Number(grantTrialDays) : db.settings?.defaultTrialDays || 7;
    user.trialDays = days;
    user.trialStartedAt = (/* @__PURE__ */ new Date()).toISOString();
    user.trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1e3).toISOString();
    user.subscriptionStatus = "trial";
    user.status = "approved";
  }
  user.frozenAt = void 0;
  user.freezeReason = void 0;
  saveDB();
  await updateUserInFirestore(user.id, {
    isSubscribed: Boolean(user.isSubscribed),
    subscriptionStatus: user.subscriptionStatus,
    status: user.status,
    trialDays: user.trialDays,
    trialStartedAt: user.trialStartedAt || "",
    trialEndsAt: user.trialEndsAt || "",
    frozenAt: "",
    freezeReason: ""
  });
  const safeUsers = db.users.map(toSafeUser);
  res.json({
    success: true,
    message: `\u062A\u0645 \u0641\u0643 \u062A\u062C\u0645\u064A\u062F \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 "${user.fullName || user.username}" \u0648\u062A\u0646\u0634\u064A\u0637\u0647 \u0628\u0646\u062C\u0627\u062D.`,
    user: toSafeUser(user),
    users: safeUsers
  });
});
app.delete("/api/admin/users/:id", async (req, res) => {
  const { id } = req.params;
  const initialLen = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  if (db.users.length < initialLen) {
    saveDB();
    await deleteUserFromFirestore(id);
    return res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0646\u062C\u0627\u062D" });
  }
  return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
});
app.post("/api/admin/parse-pdf", async (req, res) => {
  try {
    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0644\u0641 \u0627\u0644\u0640 PDF" });
    }
    const cleanTitle = (fileName || "\u062A\u0634\u0631\u064A\u0639 \u0641\u0644\u0633\u0637\u064A\u0646\u064A").replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
    let estimatedPages = 1;
    try {
      const buffer = Buffer.from(base64Data, "base64");
      const matches = buffer.toString("binary").match(/\/Type\s*\/Page[^s]/g);
      if (matches && matches.length > 0) {
        estimatedPages = matches.length;
      }
    } catch {
    }
    const prompt = `\u0642\u0645 \u0628\u0642\u0631\u0627\u0621\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0627\u0644\u0648\u0627\u0631\u062F\u0629 \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u0645\u0627\u062F\u0629 \u0628\u0645\u0627\u062F\u0629 \u0648\u0628\u0646\u062F\u0627\u064B \u0628\u0628\u0646\u062F\u060C \u0648\u062A\u062C\u0627\u0647\u0644 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u0648\u0627\u0644\u062A\u0631\u0648\u064A\u0633\u0627\u062A \u0627\u0644\u0645\u062A\u0643\u0631\u0631\u0629\u060C \u0648\u0646\u0638\u0645 \u0627\u0644\u0646\u0635\u0648\u0635 \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0628\u0634\u0643\u0644 \u0631\u0633\u0645\u064A \u0648\u0648\u0627\u0636\u062D.

\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062F\u0642\u0629 \u0641\u064A \u0627\u0644\u0646\u062A\u064A\u062C\u0629:
1. \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0623\u0648 \u0627\u0644\u062A\u0634\u0631\u064A\u0639 (title): \u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0631\u0633\u0645\u064A \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0644\u062A\u0634\u0631\u064A\u0639 \u0623\u0648 \u0627\u0644\u0642\u0631\u0627\u0631 (\u0645\u062B\u0627\u0644: "\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A \u0631\u0642\u0645 ... \u0644\u0633\u0646\u0629 ...").
2. \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0623\u0646\u0633\u0628 (category): \u0627\u062E\u062A\u0631 \u0623\u0648 \u062D\u062F\u062F \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A \u0627\u0644\u0623\u0646\u0633\u0628 \u0645\u0646 \u0628\u064A\u0646:
   - "\u062C\u0645\u0627\u0631\u0643" (\u0644\u0643\u0644 \u0645\u0627 \u064A\u062A\u0639\u0644\u0642 \u0628\u0627\u0644\u062A\u0639\u0631\u0641\u0629 \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u062C\u0645\u0631\u0643\u064A\u0629 \u0648\u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0648\u0627\u0644\u062A\u0635\u062F\u064A\u0631 \u0648\u0627\u0644\u0645\u0646\u0627\u0641\u0630)
   - "\u0636\u0631\u064A\u0628\u0629 \u062F\u062E\u0644" (\u0644\u0643\u0644 \u0645\u0627 \u064A\u062A\u0639\u0644\u0642 \u0628\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644 \u0648\u0627\u0644\u0634\u0631\u0627\u0626\u062D \u0648\u0627\u0644\u0625\u0639\u0641\u0627\u0621\u0627\u062A \u0648\u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A)
   - "\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629" (\u0644\u0643\u0644 \u0645\u0627 \u064A\u062A\u0639\u0644\u0642 \u0628\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0648\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629)
   - "\u0631\u0633\u0648\u0645 \u0648\u0645\u0643\u0648\u0633" (\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0648\u0627\u0644\u0637\u0648\u0627\u0628\u0639 \u0648\u0627\u0644\u0631\u0633\u0648\u0645 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0643\u0648\u0633)
   - \u0623\u0648 \u0623\u064A \u062A\u0635\u0646\u064A\u0641 \u0642\u0627\u0646\u0648\u0646\u064A \u0631\u0626\u064A\u0633\u064A \u0648\u0627\u0636\u062D \u064A\u0646\u0637\u0628\u0642 \u0639\u0644\u0649 \u0627\u0644\u0648\u062B\u064A\u0642\u0629.
3. \u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 (content):
   - \u0627\u0643\u062A\u0628 \u0646\u0635 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0627\u0644\u0641\u0642\u0631\u0627\u062A \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u062F\u0642\u0629 \u0648\u0623\u0645\u0627\u0646\u0629 \u062A\u0634\u0631\u064A\u0639\u064A\u0629.
   - \u0645\u0627\u062F\u0629 \u0628\u0645\u0627\u062F\u0629 \u0648\u0628\u0646\u062F\u0627\u064B \u0628\u0628\u0646\u062F (\u0645\u062B\u0627\u0644: "\u0627\u0644\u0645\u0627\u062F\u0629 (1): ... \\n\u0627\u0644\u0645\u0627\u062F\u0629 (2): ...").
   - \u062A\u062C\u0627\u0647\u0644 \u062A\u0645\u0627\u0645\u0627\u064B \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0635\u0641\u062D\u0627\u062A\u060C \u0627\u0644\u062A\u0631\u0648\u064A\u0633\u0627\u062A \u0648\u0627\u0644\u0647\u0648\u0627\u0645\u0634 \u0627\u0644\u0645\u0643\u0631\u0631\u0629\u060C \u0648\u0627\u0644\u0623\u062E\u062A\u0627\u0645 \u0627\u0644\u062A\u064A \u0644\u0627 \u062A\u0634\u0643\u0644 \u0646\u0635\u0627\u064B \u062A\u0634\u0631\u064A\u0639\u064A\u0627\u064B.
   - \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0645\u0645\u0633\u0648\u062D\u0627\u064B \u0636\u0648\u0626\u064A\u0627\u064B (\u0633\u0643\u0627\u0646\u0631) \u0623\u0648 \u0635\u0648\u0631\u0629\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0642\u062F\u0631\u0627\u062A\u0643 \u0627\u0644\u0628\u0635\u0631\u064A\u0629 \u0648\u0627\u0644\u0644\u063A\u0648\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0643\u0644\u0645\u0627\u062A \u0628\u062F\u0642\u0629 \u0628\u0627\u0644\u063A\u0629.
   - \u0631\u062A\u0628 \u0648\u0646\u0638\u0645 \u0627\u0644\u0646\u0635\u0648\u0635 \u0628\u0634\u0643\u0644 \u0631\u0633\u0645\u064A \u0648\u0645\u0646\u0633\u0642 \u0648\u0648\u0627\u0636\u062D \u0648\u0645\u0631\u064A\u062D \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0627\u0644\u0645\u0637\u0627\u0644\u0639\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629.
4. \u0645\u0644\u062E\u0635 \u0645\u0648\u062C\u0632 (summary): \u0646\u0628\u0630\u0629 \u0645\u0648\u062C\u0632\u0629 \u0648\u0634\u0627\u0645\u0644\u0629 \u062A\u0648\u0636\u062D \u0627\u0644\u063A\u0631\u0636 \u0648\u0646\u0637\u0627\u0642 \u062A\u0637\u0628\u064A\u0642 \u0647\u0630\u0627 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0623\u0648 \u0627\u0644\u0642\u0631\u0627\u0631.`;
    const ai = getGemini();
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite"
    ];
    let extractedData = null;
    let usedModel = "";
    let lastError = null;
    for (const model of modelsToTry) {
      try {
        console.log(`[AI-PDF] Extracting legal document via Gemini model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            },
            {
              text: prompt
            }
          ],
          config: {
            systemInstruction: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0642\u0627\u0646\u0648\u0646\u064A \u0648\u062A\u0634\u0631\u064A\u0639\u064A \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0648\u0647\u064A\u0643\u0644\u0629 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 \u0645\u0646 \u0648\u062B\u0627\u0626\u0642 PDF \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0648\u0627\u0644\u0645\u0645\u0633\u0648\u062D\u0629 \u0636\u0648\u0626\u064A\u0627\u064B.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0623\u0648 \u0627\u0644\u062A\u0634\u0631\u064A\u0639 \u0627\u0644\u0631\u0633\u0645\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C \u0628\u0627\u0644\u0643\u0627\u0645\u0644."
                },
                category: {
                  type: Type.STRING,
                  description: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A \u0627\u0644\u0623\u0646\u0633\u0628 (\u062C\u0645\u0627\u0631\u0643\u060C \u0636\u0631\u064A\u0628\u0629 \u062F\u062E\u0644\u060C \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629\u060C \u0631\u0633\u0648\u0645 \u0648\u0645\u0643\u0648\u0633\u060C \u0625\u0644\u062E)."
                },
                content: {
                  type: Type.STRING,
                  description: "\u0627\u0644\u0646\u0635 \u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u0627\u0644\u0634\u0627\u0645\u0644 \u0644\u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0628\u0646\u0648\u062F \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0645\u0627\u062F\u0629 \u0628\u0645\u0627\u062F\u0629 \u0648\u0628\u0646\u062F\u0627\u064B \u0628\u0628\u0646\u062F."
                },
                summary: {
                  type: Type.STRING,
                  description: "\u0645\u0644\u062E\u0635 \u0645\u0648\u062C\u0632 \u0644\u0646\u0637\u0627\u0642 \u0648\u0623\u0647\u062F\u0627\u0641 \u0627\u0644\u062A\u0634\u0631\u064A\u0639."
                }
              },
              required: ["title", "category", "content"]
            }
          }
        });
        if (response?.text) {
          try {
            const parsed = JSON.parse(response.text);
            if (parsed && typeof parsed === "object") {
              extractedData = {
                title: (parsed.title || cleanTitle).trim(),
                category: (parsed.category || "\u062C\u0645\u0627\u0631\u0643").trim(),
                content: (parsed.content || "").trim(),
                summary: (parsed.summary || "").trim()
              };
              usedModel = model;
              console.log(`[AI-PDF] Successfully extracted using ${model}: ${extractedData.title}`);
              break;
            }
          } catch (jsonErr) {
            console.warn(`[AI-PDF] JSON parse issue with model ${model}:`, jsonErr);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`[AI-PDF] Gemini call failed with model ${model}:`, err?.message || err);
      }
    }
    if (!extractedData || !extractedData.content) {
      console.warn("[AI-PDF] Gemini models unavailable or quota exceeded, attempting text stream fallback...");
      try {
        const buffer = Buffer.from(base64Data, "base64");
        const binaryStr = buffer.toString("latin1");
        const textBlocks = [];
        const textRegex = /BT\s*([\s\S]*?)\s*ET/g;
        let m;
        while ((m = textRegex.exec(binaryStr)) !== null) {
          const rawBlock = m[1];
          const strMatches = rawBlock.match(/\(([^)]+)\)/g);
          if (strMatches) {
            const cleanStr = strMatches.map((s) => s.slice(1, -1)).join(" ");
            if (cleanStr.trim()) textBlocks.push(cleanStr);
          }
        }
        if (textBlocks.length > 0) {
          const rawText = textBlocks.join("\n");
          extractedData = {
            title: cleanTitle,
            category: "\u062C\u0645\u0627\u0631\u0643",
            content: rawText.slice(0, 5e4).trim(),
            summary: "\u062A\u0645 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0646\u0635\u0648\u0635 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u064A\u0629 \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0645\u0646 \u0627\u0644\u0645\u0644\u0641."
          };
        }
      } catch (fallbackErr) {
        console.error("[AI-PDF] Fallback extractor error:", fallbackErr);
      }
    }
    if (!extractedData || !extractedData.content && !extractedData.title) {
      return res.status(422).json({
        error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0645\u0646 \u0627\u0644\u0645\u0644\u0641. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0648\u0627\u0636\u062D \u0623\u0648 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0645\u0648\u0627\u062F \u064A\u062F\u0648\u064A\u0627\u064B."
      });
    }
    return res.json({
      title: extractedData.title || cleanTitle,
      category: extractedData.category || "\u062C\u0645\u0627\u0631\u0643",
      content: extractedData.content || "",
      summary: extractedData.summary || "",
      numPages: estimatedPages,
      suggestedTitle: extractedData.title || cleanTitle,
      suggestedCategory: extractedData.category || "\u062C\u0645\u0627\u0631\u0643",
      text: extractedData.content || "",
      method: usedModel ? "gemini_ai" : "fallback_parser",
      model: usedModel
    });
  } catch (err) {
    console.error("Server PDF parsing error:", err);
    return res.status(500).json({
      error: "\u062A\u0639\u0630\u0631 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0646\u0635\u0648\u0635 \u0645\u0646 \u0645\u0644\u0641 \u0627\u0644\u0640 PDF: " + (err?.message || "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641")
    });
  }
});
app.get("/api/laws", (req, res) => {
  res.json({ laws: db.laws });
});
app.post("/api/laws", async (req, res) => {
  const { title, category, content, sourceFileName, sourceFileSize, pageCount } = req.body;
  if (!title || !category || !content) {
    return res.status(400).json({ error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629 (\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0641\u060C \u0646\u0635 \u0627\u0644\u0645\u0648\u0627\u062F)" });
  }
  const newLaw = {
    id: "law-" + Date.now(),
    title: String(title).trim(),
    category,
    content: String(content).trim(),
    sourceFileName: sourceFileName ? String(sourceFileName).trim() : void 0,
    sourceFileSize: sourceFileSize ? String(sourceFileSize).trim() : void 0,
    pageCount: pageCount ? Number(pageCount) : void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.laws.unshift(newLaw);
  saveDB();
  await saveLawToFirestore(newLaw);
  res.status(201).json({ message: "\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0628\u0646\u062C\u0627\u062D", law: newLaw });
});
app.put("/api/laws/:id", async (req, res) => {
  const { id } = req.params;
  const { title, category, content, sourceFileName, sourceFileSize, pageCount } = req.body;
  const law = db.laws.find((l) => l.id === id);
  if (!law) {
    return res.status(404).json({ error: "\u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  if (title) law.title = String(title).trim();
  if (category) law.category = category;
  if (content) law.content = String(content).trim();
  if (sourceFileName !== void 0) law.sourceFileName = sourceFileName;
  if (sourceFileSize !== void 0) law.sourceFileSize = sourceFileSize;
  if (pageCount !== void 0) law.pageCount = pageCount;
  law.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDB();
  await updateLawInFirestore(law.id, {
    title: law.title,
    category: law.category,
    content: law.content,
    sourceFileName: law.sourceFileName,
    sourceFileSize: law.sourceFileSize,
    pageCount: law.pageCount,
    updatedAt: law.updatedAt
  });
  res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0628\u0646\u062C\u0627\u062D", law });
});
app.delete("/api/laws/:id", async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id).trim();
    const initialLen = db.laws.length;
    db.laws = db.laws.filter((l) => l.id !== id);
    await deleteLawFromFirestore(id);
    saveDB();
    return res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0628\u0646\u062C\u0627\u062D \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0633\u062D\u0627\u0628\u0629" });
  } catch (err) {
    console.error("Error deleting law:", err);
    return res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0630\u0641 \u0627\u0644\u0642\u0627\u0646\u0648\u0646: " + (err?.message || "") });
  }
});
app.get("/api/categories", (req, res) => {
  if (!db.categories || db.categories.length === 0) {
    db.categories = [...DEFAULT_CATEGORIES];
  }
  res.json({ categories: db.categories });
});
app.post("/api/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0645\u0637\u0644\u0648\u0628" });
  }
  const trimmedName = name.trim();
  if (!db.categories) {
    db.categories = [...DEFAULT_CATEGORIES];
  }
  const isDuplicate = db.categories.some(
    (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
  }
  const newCategory = {
    id: `cat-${Date.now()}`,
    name: trimmedName,
    isDefault: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.categories.push(newCategory);
  saveDB();
  await saveCategoryToFirestore(newCategory);
  res.status(201).json({
    message: `\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 "${newCategory.name}" \u0628\u0646\u062C\u0627\u062D`,
    category: newCategory
  });
});
app.delete("/api/categories/:id", async (req, res) => {
  const { id } = req.params;
  if (!db.categories) {
    db.categories = [...DEFAULT_CATEGORIES];
  }
  const index = db.categories.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062D\u0630\u0641\u0647 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const catToDelete = db.categories[index];
  db.categories.splice(index, 1);
  saveDB();
  await deleteCategoryFromFirestore(id);
  res.json({
    message: `\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 "${catToDelete.name}" \u0628\u0646\u062C\u0627\u062D`,
    deletedId: id
  });
});
app.get("/api/system/status", (req, res) => {
  res.json({
    status: "online",
    database: "Google Cloud Firestore (Enterprise NoSQL)",
    provider: "Cloud Firestore",
    projectId: "pos1-d562e",
    databaseId: "ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605",
    usersCount: db.users.length,
    lawsCount: db.laws.length,
    categoriesCount: (db.categories || []).length,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/chat", async (req, res) => {
  const { message, username } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "\u0646\u0635 \u0627\u0644\u0633\u0624\u0627\u0644 \u0645\u0637\u0644\u0648\u0628" });
  }
  if (username) {
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      if (user.status === "pending") {
        return res.status(403).json({
          error: "\u062D\u0633\u0627\u0628\u0643 \u0645\u0627 \u0632\u0627\u0644 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0644\u062D\u064A\u0646 \u0627\u0639\u062A\u0645\u0627\u062F \u062D\u0633\u0627\u0628\u0643.",
          status: "pending"
        });
      }
      if (user.status === "rejected") {
        return res.status(403).json({
          error: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0627\u0644\u062D\u0633\u0627\u0628. \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0634\u0627\u062A.",
          status: "rejected"
        });
      }
      const trialCheck = checkAndUpdateUserTrialStatus(user, true);
      if (trialCheck.isFrozen) {
        return res.status(403).json({
          error: "\u0639\u0630\u0631\u0627\u064B\u060C \u062A\u0645 \u062A\u062C\u0645\u064A\u062F \u062D\u0633\u0627\u0628\u0643 \u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u062F\u0648\u0646 \u0627\u0634\u062A\u0631\u0627\u0643. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0648\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645.",
          status: "frozen",
          isFrozen: true,
          subscriptionStatus: "frozen",
          freezeReason: user.freezeReason,
          trialEndsAt: user.trialEndsAt
        });
      }
    }
  }
  const laws = db.laws;
  const { prioritizedContext, fullCatalog } = buildStructuredLegalContext(message, laws);
  const systemInstruction = `\u0623\u0646\u062A "\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0636\u0631\u0627\u0626\u0628"\u060C \u0645\u0633\u0627\u0639\u062F \u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0645\u062A\u062E\u0635\u0635 \u062D\u0635\u0631\u064A\u064B\u0627 \u0641\u064A \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0641\u0644\u0633\u0637\u064A\u0646\u064A\u0629 \u0627\u0644\u0645\u062A\u0639\u0644\u0642\u0629 \u0628\u0627\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0636\u0631\u0627\u0626\u0628.
\u0627\u0644\u062A\u0632\u0645 \u0628\u0645\u0627 \u064A\u0644\u064A \u0628\u062F\u0642\u0629:
\u0623\u062C\u0628 \u0641\u0642\u0637 \u0628\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0639\u0644\u0649 \u0646\u0635\u0648\u0635 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0629 \u0623\u062F\u0646\u0627\u0647 \u062A\u062D\u062A "\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629". \u0644\u0627 \u062A\u062E\u062A\u0631\u0639 \u0623\u0631\u0642\u0627\u0645\u064B\u0627 \u0623\u0648 \u0646\u0633\u0628\u064B\u0627 \u0645\u0646 \u0639\u0646\u062F\u0643.
\u0625\u0646 \u0644\u0645 \u062A\u062C\u062F \u0625\u062C\u0627\u0628\u0629 \u0641\u064A \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0645\u062A\u0627\u062D\u0629\u060C \u0642\u0644 \u0628\u0648\u0636\u0648\u062D \u0625\u0646 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629 \u062D\u0627\u0644\u064A\u064B\u0627 \u0648\u0623\u0646\u0635\u062D \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062C\u0647\u0629 \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0627\u0644\u0645\u062E\u062A\u0635\u0629.
\u0627\u0630\u0643\u0631 \u0645\u0635\u062F\u0631 \u0643\u0644 \u0625\u062C\u0627\u0628\u0629 \u0641\u064A \u0646\u0647\u0627\u064A\u062A\u0647\u0627 \u0628\u062F\u0642\u0629 (\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0623\u0648 \u0627\u0644\u0642\u0631\u0627\u0631 \u0648\u0631\u0642\u0645 \u0627\u0644\u0645\u0627\u062F\u0629 \u0623\u0648 \u0627\u0644\u0628\u0646\u062F \u0643\u0645\u0627 \u0648\u0631\u062F\u0627 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629).
\u0639\u0646\u062F \u062D\u0633\u0627\u0628 \u0636\u0631\u064A\u0628\u0629 \u0623\u0648 \u0631\u0633\u0645\u060C \u0627\u0639\u0631\u0636 \u062E\u0637\u0648\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628 \u0631\u0642\u0645\u064B\u0627 \u0628\u0631\u0642\u0645 \u0628\u0634\u0643\u0644 \u0645\u0646\u0633\u0642 \u0648\u0648\u0627\u0636\u062D\u060C \u062B\u0645 \u0627\u0630\u0643\u0631 \u0627\u0644\u0646\u0627\u062A\u062C \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0628\u0627\u0644\u0634\u064A\u0643\u0644 \u0628\u062E\u0637 \u0628\u0627\u0631\u0632.
\u0623\u0636\u0641 \u062F\u0627\u0626\u0645\u064B\u0627 \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0623\u064A \u0625\u062C\u0627\u0628\u0629 \u062D\u0633\u0627\u0628\u064A\u0629 \u0623\u0648 \u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0623\u0646 \u0647\u0630\u0647 \u0625\u062C\u0627\u0628\u0629 \u0627\u0633\u062A\u0631\u0634\u0627\u062F\u064A\u0629 \u0648\u0644\u064A\u0633\u062A \u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0631\u0633\u0645\u064A\u0629 \u0645\u0644\u0632\u0645\u0629.
\u0623\u062C\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0645\u0627 \u0644\u0645 \u064A\u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0630\u0644\u0643. \u0627\u0633\u062A\u062E\u062F\u0645 \u0639\u0646\u0627\u0648\u064A\u0646 \u0642\u0635\u064A\u0631\u0629 \u0648\u0642\u0648\u0627\u0626\u0645 \u0646\u0642\u0637\u064A\u0629\u060C \u0648\u062A\u062C\u0646\u0628 \u0627\u0644\u0641\u0642\u0631\u0627\u062A \u0627\u0644\u0637\u0648\u064A\u0644\u0629 \u0627\u0644\u0645\u062A\u0635\u0644\u0629.
\u0627\u0644\u062A\u0632\u0645 \u0627\u0644\u062D\u064A\u0627\u062F \u0627\u0644\u062A\u0627\u0645 \u0648\u0639\u062F\u0645 \u0625\u0628\u062F\u0627\u0621 \u0622\u0631\u0627\u0621 \u0633\u064A\u0627\u0633\u064A\u0629 \u0634\u062E\u0635\u064A\u0629.

${prioritizedContext}

\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629 (\u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0648\u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u064B\u0627):
${fullCatalog}`;
  try {
    const ai = getGemini();
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let response = null;
    let lastErr = null;
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.2
            // Low temperature for high factual accuracy against legal text
          }
        });
        if (response?.text) {
          break;
        }
      } catch (e) {
        lastErr = e;
        const isQuotaError = e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("quota") || e?.message?.includes("RESOURCE_EXHAUSTED");
        console.warn(`Model ${modelName} call failed (quota: ${isQuotaError}):`, e?.message || e);
        continue;
      }
    }
    if (response?.text) {
      return res.json({ reply: response.text });
    }
    console.warn("All Gemini models exhausted, using legal database knowledge retrieval fallback.");
    const fallbackAnswer = generateKnowledgeFallback(message, db.laws);
    return res.json({ reply: fallbackAnswer, isFallback: true });
  } catch (error) {
    console.error("Error generating AI response:", error);
    const fallbackAnswer = generateKnowledgeFallback(message, db.laws);
    return res.json({ reply: fallbackAnswer, isFallback: true });
  }
});
app.get("/api/conversations", async (req, res) => {
  const userId = req.query.userId;
  if (!db.conversations) {
    db.conversations = [];
  }
  let userConvs = db.conversations;
  if (userId) {
    userConvs = userConvs.filter((c) => c.userId === userId);
  }
  try {
    const cloudConvs = await fetchConversationsFromFirestore(userId);
    if (cloudConvs && cloudConvs.length > 0) {
      const map = /* @__PURE__ */ new Map();
      for (const c of cloudConvs) {
        map.set(c.id, c);
      }
      for (const c of userConvs) {
        if (!map.has(c.id)) {
          map.set(c.id, c);
        }
      }
      userConvs = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      );
    }
  } catch (e) {
    console.warn("Could not fetch cloud conversations, using local DB:", e);
  }
  res.json({ conversations: userConvs });
});
app.post("/api/conversations", async (req, res) => {
  const { id, userId, title, messages, createdAt, updatedAt } = req.body;
  if (!id || !userId) {
    return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u0648\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  if (!db.conversations) {
    db.conversations = [];
  }
  const existingIdx = db.conversations.findIndex((c) => c.id === id);
  const convObj = {
    id,
    userId,
    title: title || "\u0645\u062D\u0627\u062F\u062B\u0629 \u062C\u062F\u064A\u062F\u0629",
    messages: Array.isArray(messages) ? messages : [],
    createdAt: createdAt || (existingIdx !== -1 ? db.conversations[existingIdx].createdAt : (/* @__PURE__ */ new Date()).toISOString()),
    updatedAt: updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
  if (existingIdx !== -1) {
    db.conversations[existingIdx] = convObj;
  } else {
    db.conversations.unshift(convObj);
  }
  saveDB();
  saveConversationToFirestore(convObj).catch((e) => console.error("Failed to save conversation to Firestore:", e));
  res.status(200).json({ success: true, conversation: convObj });
});
app.put("/api/conversations/:id/title", async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062C\u062F\u064A\u062F \u0645\u0637\u0644\u0648\u0628" });
  }
  if (!db.conversations) {
    db.conversations = [];
  }
  const existing = db.conversations.find((c) => c.id === id);
  if (existing) {
    existing.title = title.trim();
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDB();
    saveConversationToFirestore(existing).catch((e) => console.error("Failed to update title in Firestore:", e));
    return res.json({ success: true, conversation: existing });
  }
  try {
    const cloudConvs = await fetchConversationsFromFirestore();
    const cloudConv = cloudConvs?.find((c) => c.id === id);
    if (cloudConv) {
      cloudConv.title = title.trim();
      cloudConv.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await saveConversationToFirestore(cloudConv);
      db.conversations.unshift(cloudConv);
      saveDB();
      return res.json({ success: true, conversation: cloudConv });
    }
  } catch (e) {
    console.error("Error updating cloud conversation:", e);
  }
  res.status(404).json({ error: "\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
});
app.delete("/api/conversations/:id", async (req, res) => {
  const { id } = req.params;
  if (!db.conversations) {
    db.conversations = [];
  }
  const idx = db.conversations.findIndex((c) => c.id === id);
  if (idx !== -1) {
    db.conversations.splice(idx, 1);
    saveDB();
  }
  deleteConversationFromFirestore(id).catch((e) => console.error("Failed to delete from Firestore:", e));
  res.json({ success: true, deletedId: id });
});
app.delete("/api/conversations", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628 \u0644\u062D\u0630\u0641 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A" });
  }
  if (db.conversations) {
    db.conversations = db.conversations.filter((c) => c.userId !== userId);
    saveDB();
  }
  clearUserConversationsFromFirestore(userId).catch((e) => console.error("Failed to clear cloud conversations:", e));
  res.json({ success: true, message: "\u062A\u0645 \u0645\u0633\u062D \u0633\u062C\u0644 \u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A \u0628\u0646\u062C\u0627\u062D" });
});
function chunkLawContent(law) {
  const lines = law.content.split("\n");
  const chunks = [];
  let currentHeader = "\u0645\u0642\u062F\u0645\u0629 / \u0623\u062D\u0643\u0627\u0645 \u0639\u0627\u0645\u0629";
  let currentLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isNewArticle = /^المادة\s*[\(0-9\:]/i.test(trimmed) || /^البند\s*[\(0-9\:]/i.test(trimmed) || /^الفصل\s*[\(0-9\:]/i.test(trimmed) || /^---\s*\[صفحة\s*[0-9]+\]/i.test(trimmed);
    if (isNewArticle && currentLines.length > 0) {
      chunks.push({
        lawTitle: law.title,
        category: law.category,
        sectionHeader: currentHeader,
        text: currentLines.join("\n").trim(),
        sourceFileName: law.sourceFileName
      });
      currentLines = [];
      currentHeader = trimmed.slice(0, 100);
    }
    currentLines.push(line);
  }
  if (currentLines.length > 0) {
    chunks.push({
      lawTitle: law.title,
      category: law.category,
      sectionHeader: currentHeader,
      text: currentLines.join("\n").trim(),
      sourceFileName: law.sourceFileName
    });
  }
  return chunks;
}
function buildStructuredLegalContext(query, laws) {
  if (laws.length === 0) {
    return {
      prioritizedContext: "",
      fullCatalog: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0642\u0648\u0627\u0646\u064A\u0646 \u0623\u0648 \u0645\u0644\u0641\u0627\u062A \u0645\u062F\u062E\u0644\u0629 \u062D\u0627\u0644\u064A\u0627\u064B \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629."
    };
  }
  const normalizedQuery = query.toLowerCase();
  const keywords = normalizedQuery.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2);
  const allChunks = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + " " + chunk.category + " " + chunk.sectionHeader + " " + chunk.text).toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (fullText.includes(word)) {
          score += 1;
          if (chunk.sectionHeader.toLowerCase().includes(word) || chunk.lawTitle.toLowerCase().includes(word)) {
            score += 2;
          }
        }
      }
      chunk.score = score;
      allChunks.push(chunk);
    }
  }
  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const topChunks = allChunks.filter((c) => (c.score || 0) > 0).slice(0, 5);
  let prioritizedContext = "";
  if (topChunks.length > 0) {
    prioritizedContext = `[\u0623\u0628\u0631\u0632 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0628\u0646\u0648\u062F \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u0630\u0627\u062A \u0627\u0644\u0635\u0644\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 (\u0627\u0639\u062A\u0645\u062F \u0639\u0644\u064A\u0647\u0627 \u0648\u0627\u0633\u062A\u0634\u0647\u062F \u0628\u0631\u0642\u0645 \u0645\u0627\u062F\u062A\u0647\u0627 \u0648\u0642\u0627\u0646\u0648\u0646\u0647\u0627)]:
` + topChunks.map(
      (c, idx) => `--- \u0628\u0646\u062F \u0630\u0648 \u0623\u0648\u0644\u0648\u064A\u0629 (${idx + 1}) ---
\u0627\u0644\u0642\u0627\u0646\u0648\u0646: ${c.lawTitle} (${c.category})
${c.sectionHeader}:
${c.text}`
    ).join("\n\n");
  }
  const fullCatalog = laws.map((l, index) => {
    const pdfNote = l.sourceFileName ? ` [\u0645\u0633\u062A\u0648\u0631\u062F \u0645\u0646 PDF: ${l.sourceFileName}, ${l.pageCount || 1} \u0635\u0641\u062D\u0629]` : "";
    return `[\u0642\u0627\u0646\u0648\u0646 ${index + 1}${pdfNote}]
\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062A\u0634\u0631\u064A\u0639: ${l.title}
\u0627\u0644\u062A\u0635\u0646\u064A\u0641: ${l.category}
\u0646\u0635 \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0628\u0646\u0648\u062F:
${l.content}`;
  }).join("\n\n-------------------------\n\n");
  return { prioritizedContext, fullCatalog };
}
function generateKnowledgeFallback(query, laws) {
  const normalizedQuery = query.toLowerCase();
  const keywords = normalizedQuery.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2);
  const allChunks = [];
  for (const law of laws) {
    const lawChunks = chunkLawContent(law);
    for (const chunk of lawChunks) {
      const fullText = (chunk.lawTitle + " " + chunk.category + " " + chunk.sectionHeader + " " + chunk.text).toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (fullText.includes(word)) score += 1;
      }
      chunk.score = score;
      if (score > 0) allChunks.push(chunk);
    }
  }
  allChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  const bestChunks = allChunks.slice(0, 3);
  if (bestChunks.length > 0) {
    let result = `### \u2696\uFE0F \u0625\u062C\u0627\u0628\u0629 \u0627\u0633\u062A\u0631\u0634\u0627\u062F\u064A\u0629 \u0645\u0633\u062A\u0646\u062F\u0629 \u0625\u0644\u0649 \u0646\u0635\u0648\u0635 \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629:

`;
    for (const chunk of bestChunks) {
      result += `#### \u{1F4DC} ${chunk.lawTitle} (${chunk.category})
`;
      result += `**${chunk.sectionHeader}**

`;
      result += `${chunk.text}

`;
      result += `**\u0627\u0644\u0645\u0635\u062F\u0631**: \u0646\u0635\u0648\u0635 \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0641\u064A ${chunk.lawTitle} - \u0627\u0644\u062A\u0634\u0631\u064A\u0639\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0641\u064A \u062F\u0648\u0644\u0629 \u0641\u0644\u0633\u0637\u064A\u0646.

`;
    }
    result += `
---
*\u0645\u0644\u0627\u062D\u0638\u0629: \u0647\u0630\u0647 \u0625\u062C\u0627\u0628\u0629 \u0627\u0633\u062A\u0631\u0634\u0627\u062F\u064A\u0629 \u0645\u0633\u062A\u062E\u0631\u062C\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629\u060C \u0648\u0644\u064A\u0633\u062A \u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0631\u0633\u0645\u064A\u0629 \u0645\u0644\u0632\u0645\u0629.*`;
    return result;
  }
  return `\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0645 \u0646\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0646\u0635 \u0635\u0631\u064A\u062D \u0648\u0645\u0628\u0627\u0634\u0631 \u0641\u064A \u0646\u0635\u0648\u0635 \u0627\u0644\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B \u064A\u063A\u0637\u064A \u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0628\u062F\u0642\u0629.

\u0646\u0646\u0635\u062D \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062F\u0627\u0626\u0631\u0629 \u0627\u0644\u0645\u062E\u062A\u0635\u0629 \u0641\u064A \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 (\u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u062C\u0645\u0627\u0631\u0643 \u0648\u0627\u0644\u0645\u0643\u0648\u0633 \u0623\u0648 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u062F\u062E\u0644) \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u0641\u0627\u062F\u0629 \u0631\u0633\u0645\u064A\u0629.`;
}
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.FUNCTION_NAME
  );
  if (!isServerless && process.env.NODE_ENV !== "test") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\u26A1 Server listening on port ${PORT} (immediate readiness)`);
      syncWithFirestore().catch((err) => {
        console.error("Background Firestore sync error:", err);
      });
    });
  }
}
startServer();
var server_default = app;

// api/index.ts
function handler(req, res) {
  const original = req.url || "";
  const matchedPath = req.headers["x-matched-path"] || "";
  if (matchedPath && matchedPath.startsWith("/api") && (original === "/api" || original === "/" || original === "")) {
    req.url = matchedPath;
  } else if (original && !original.startsWith("/api")) {
    req.url = "/api" + (original.startsWith("/") ? original : "/" + original);
  }
  return server_default(req, res);
}
export {
  handler as default
};
