import { fetchSettingsFromFirestore } from './server/firestore.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605');

async function run() {
  const docRef = doc(db, 'system_settings', 'general');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("DB STATE - Name:", data.systemName);
    console.log("DB STATE - Logo length:", data.logoUrl?.length || 0);
    console.log("DB STATE - Founder photo length:", data.founderPhotoUrl?.length || 0);
  } else {
    console.log("No general settings found in DB.");
  }
}
run().catch(console.error);
