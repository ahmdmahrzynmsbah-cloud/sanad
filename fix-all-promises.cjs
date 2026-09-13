const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Use regex to replace all instances of "await save<Something>ToFirestore(...);" 
// with "save<Something>ToFirestore(...).catch(e => console.error('Firestore save error:', e));"
// We need to be careful with things that capture the return value or are in an array map, etc.

code = code.replace(/await\s+(save[a-zA-Z0-9_]+ToFirestore\([^)]+\));/g, "$1.catch(e => console.error('Firestore save error:', e));");

fs.writeFileSync('server.ts', code);
console.log("Made ALL Firestore saves non-blocking");
