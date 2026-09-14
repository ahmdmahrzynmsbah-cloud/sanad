const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Increase limit to 2MB (2000000 bytes) for base64 strings and make sure we don't crash
code = code.replace(
  'if (db.settings.logoUrl && db.settings.logoUrl.length > 500000) {',
  'if (db.settings.logoUrl && db.settings.logoUrl.length > 3000000) {'
);

code = code.replace(
  'if (String(founderPhotoUrl).length > 500000) {',
  'if (String(founderPhotoUrl).length > 3000000) {'
);

fs.writeFileSync('server.ts', code);
