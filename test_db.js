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
    console.log("DB State Check:", snap.data().systemName, "- Logo length:", snap.data().logoUrl?.length);
  }
}
run().catch(console.error);
