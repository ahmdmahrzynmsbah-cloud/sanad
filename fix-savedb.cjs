const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetSaveDB = `function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}`;

const replacementSaveDB = `function saveDB() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Skip saving to local disk on Vercel to prevent OOM crashes and EROFS errors
    return;
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}`;

code = code.replace(targetSaveDB, replacementSaveDB);
fs.writeFileSync('server.ts', code);
console.log("Updated saveDB");
