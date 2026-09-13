import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-6d29bd6f-50fc-4475-8e3b-86e0db64d605');

async function run() {
  const docRefGeneral = doc(db, 'system_settings', 'general');
  const snap = await getDoc(docRefGeneral);
  if (snap.exists()) {
    const data = snap.data();
    data.logoUrl = "";
    data.logoType = "preset";
    data.founderPhotoUrl = "";
    data.systemName = "سيبل";
    await setDoc(docRefGeneral, data);
    console.log("Wiped general");
  }

  const docRefSettings = doc(db, 'app', 'settings');
  const snap2 = await getDoc(docRefSettings);
  if (snap2.exists()) {
    const data2 = snap2.data();
    data2.logoUrl = "";
    data2.logoType = "preset";
    data2.founderPhotoUrl = "";
    data2.systemName = "سيبل";
    await setDoc(docRefSettings, data2);
    console.log("Wiped app/settings");
  }

  // Rewrite db.json to clear it from memory as well
  const dbData = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
  if (dbData.settings) {
    dbData.settings.logoUrl = "";
    dbData.settings.logoType = "preset";
    dbData.settings.founderPhotoUrl = "";
    dbData.settings.systemName = "سيبل";
    fs.writeFileSync('data/db.json', JSON.stringify(dbData, null, 2));
    console.log("Wiped db.json locally");
  }

}
run().catch(console.error);
