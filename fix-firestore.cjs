const fs = require('fs');
let code = fs.readFileSync('server/firestore.ts', 'utf8');

const targetHelper = `export function onDatabaseChange(callback: ChangeCallback) {`;

const replacementHelper = `// Recursive helper to remove undefined values before saving to Firestore
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(v => v !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export function onDatabaseChange(callback: ChangeCallback) {`;

if (code.includes('cleanUndefined')) {
  console.log("Already has cleanUndefined");
} else {
  code = code.replace(targetHelper, replacementHelper);
  fs.writeFileSync('server/firestore.ts', code);
  console.log("Added cleanUndefined helper");
}
