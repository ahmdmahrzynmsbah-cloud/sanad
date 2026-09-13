import { fetchSettingsFromFirestore, saveSettingsToFirestore } from './server/firestore.js';

async function run() {
  const settings = await fetchSettingsFromFirestore();
  if (settings) {
    console.log("Wiping images from DB completely to break the cache loop...");
    settings.logoUrl = "";
    settings.logoType = "preset";
    settings.founderPhotoUrl = "";
    settings.systemName = "سيبل"; // From your screenshot
    await saveSettingsToFirestore(settings);
    console.log("Done wiping DB!");
  }
}
run().catch(console.error);
