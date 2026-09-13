const fs = require('fs');
let code = fs.readFileSync('server/firestore.ts', 'utf8');

const targetSaveSettings = `  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    await setDoc(settingsRef, settings, { merge: true });
    return true;
  } catch (err) {`;

const replacementSaveSettings = `  try {
    const settingsRef = doc(db, 'system_settings', 'general');
    // Strip undefined values to prevent Firestore errors
    const cleanSettings = Object.fromEntries(Object.entries(settings).filter(([_, v]) => v !== undefined));
    await setDoc(settingsRef, cleanSettings, { merge: true });
    return true;
  } catch (err) {`;

code = code.replace(targetSaveSettings, replacementSaveSettings);
fs.writeFileSync('server/firestore.ts', code);
console.log("Updated saveSettingsToFirestore to strip undefined");
