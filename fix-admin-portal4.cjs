const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target1 = `const payloadStr = JSON.stringify(payload);
    // NGINX limit is usually 1MB (1,048,576 bytes). We check for ~900KB to be safe with headers.
    // ALSO check for 4.5MB Vercel limit just in case
    // VERCEL STRICT PAYLOAD LIMIT CHECK
    // If the combined size of the images and text is too large, it will crash Vercel.
    // 500,000 bytes is a safe limit to prevent FUNCTION_INVOCATION_FAILED.
    if (payloadStr.length > 500000) {`;

const replacement1 = `const payloadStr = JSON.stringify(payload);
    // VERCEL STRICT PAYLOAD LIMIT CHECK
    if (payloadStr.length > 500000) {`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Cleaned up AdminPortal.tsx");
}
