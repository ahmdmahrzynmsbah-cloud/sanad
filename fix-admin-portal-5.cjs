const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target1 = `    // VERCEL STRICT PAYLOAD LIMIT CHECK
    // Fallback safe limit to prevent Vercel 500 errors 
    if (payloadStr.length > 500000) {`;

const replacement1 = `    // VERCEL STRICT PAYLOAD LIMIT CHECK
    // Fallback safe limit to prevent Vercel 500 errors 
    if (payloadStr.length > 200000) {`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Reduced payload limit even further to 200KB");
}

const target2 = `    compressImageClientSide(file, 400, 400)
      .then((result) => {`;

const replacement2 = `    // Force extremely aggressive compression to ensure it never crashes Vercel
    compressImageClientSide(file, 200, 200)
      .then((result) => {`;

if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Forced aggressive image compression in AdminPortal");
}
