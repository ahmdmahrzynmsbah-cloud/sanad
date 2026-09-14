const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

// Increase client side payload limit to 4MB (4000000 bytes)
// Vercel's payload limit is 4.5MB
code = code.replace(
  'if (payloadStr.length > 200000) {',
  'if (payloadStr.length > 4000000) {'
);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
