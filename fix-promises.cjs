const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace await savePlatformAboutToFirestore(updatedAbout)
// with savePlatformAboutToFirestore(updatedAbout).catch(console.error)
// This makes the operation non-blocking for Vercel, returning the response instantly.
code = code.replace(
  'await savePlatformAboutToFirestore(updatedAbout);',
  'savePlatformAboutToFirestore(updatedAbout).catch(e => console.error("Firestore about error:", e));'
);

code = code.replace(
  'await savePlatformAboutToFirestore(db.platformAbout);',
  'savePlatformAboutToFirestore(db.platformAbout).catch(e => console.error("Firestore about error:", e));'
);

// Do the same for contact info
code = code.replace(
  'await saveContactInfoToFirestore(updatedContact);',
  'saveContactInfoToFirestore(updatedContact).catch(e => console.error("Firestore contact error:", e));'
);

code = code.replace(
  'await saveContactInfoToFirestore(db.contactInfo);',
  'saveContactInfoToFirestore(db.contactInfo).catch(e => console.error("Firestore contact error:", e));'
);

// Do the same for branding
code = code.replace(
  'await saveSettingsToFirestore(db.settings);',
  'saveSettingsToFirestore(db.settings).catch(e => console.error("Firestore settings error:", e));'
);

fs.writeFileSync('server.ts', code);
console.log("Made Firestore saves non-blocking");
