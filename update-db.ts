import { fetchSettingsFromFirestore, saveSettingsToFirestore } from './server/firestore.js';

async function run() {
  const settings = await fetchSettingsFromFirestore();
  if (settings) {
    settings.systemName = "مساعد الجمارك والضرائب";
    // Wipe large images if any
    if (settings.logoUrl && settings.logoUrl.length > 50000) {
      settings.logoUrl = "";
      settings.logoType = "preset";
    }
    await saveSettingsToFirestore(settings);
    console.log("Database updated successfully");
  } else {
    console.log("No settings found");
  }
}
run().catch(console.error);
