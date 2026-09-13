import { fetchSettingsFromFirestore, saveSettingsToFirestore } from './server/firestore.js';

async function run() {
  console.log("Fetching settings...");
  const settings = await fetchSettingsFromFirestore();
  if (settings) {
    let changed = false;
    if (settings.logoUrl && settings.logoUrl.length > 50000) {
      console.log("Logo is too large, clearing...");
      settings.logoUrl = '';
      settings.logoType = 'preset';
      changed = true;
    }
    if (settings.founderPhotoUrl && settings.founderPhotoUrl.length > 50000) {
      console.log("Founder photo is too large, clearing...");
      settings.founderPhotoUrl = '';
      changed = true;
    }
    if (changed) {
      console.log("Saving back to firestore...");
      await saveSettingsToFirestore(settings);
      console.log("Done!");
    } else {
      console.log("No large images found.");
    }
  } else {
    console.log("No settings found in firestore.");
  }
}
run().catch(console.error);
