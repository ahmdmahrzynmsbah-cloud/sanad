import { fetchSettingsFromFirestore } from './server/firestore.js';

async function run() {
  const settings = await fetchSettingsFromFirestore();
  if (settings) {
    console.log("Logo length:", settings.logoUrl?.length || 0);
    console.log("Founder photo length:", settings.founderPhotoUrl?.length || 0);
  } else {
    console.log("No settings");
  }
}
run().catch(console.error);
