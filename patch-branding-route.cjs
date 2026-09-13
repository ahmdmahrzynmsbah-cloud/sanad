const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `  if (logoUrl !== undefined) {
    db.settings.logoUrl = String(logoUrl);
  }`;

const replacement = `  if (logoUrl !== undefined) {
    db.settings.logoUrl = String(logoUrl);
  }
  // SAFETY CHECK: If string is way too large, truncate it or reject it before saving
  if (db.settings.logoUrl && db.settings.logoUrl.length > 500000) {
     return res.status(400).json({ error: 'حجم الصورة ضخم جداً، يرجى رفع صورة أصغر أو استخدام رابط.' });
  }
  if (founderPhotoUrl !== undefined) {
      if (String(founderPhotoUrl).length > 500000) {
          return res.status(400).json({ error: 'حجم صورة المؤسس ضخم جداً.' });
      }
  }`;

if (code.includes(target) && !code.includes('500000')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server API to prevent large payload crash");
}
