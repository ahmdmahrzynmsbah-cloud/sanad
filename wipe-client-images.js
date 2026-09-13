import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605');

async function run() {
  const docRef = doc(db, 'system_settings', 'branding');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("Found branding settings in DB...");
    data.logoUrl = "";
    data.logoType = "preset";
    data.founderPhotoUrl = "";
    data.systemName = "سيبل";
    await setDoc(docRef, data);
    console.log("Wiped images from client DB connection.");
  } else {
    console.log("No branding settings found in client DB.");
  }
}
run().catch(console.error);
