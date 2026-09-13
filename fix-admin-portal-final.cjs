const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target1 = `    // VERCEL STRICT PAYLOAD LIMIT CHECK
    if (payloadStr.length > 500000) {`;

const replacement1 = `    // VERCEL STRICT PAYLOAD LIMIT CHECK
    // Fallback safe limit to prevent Vercel 500 errors 
    if (payloadStr.length > 500000) {`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
}
