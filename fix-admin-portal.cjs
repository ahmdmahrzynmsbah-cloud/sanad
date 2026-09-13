const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target1 = `const payloadStr = JSON.stringify(payload);
    // NGINX limit is usually 1MB (1,048,576 bytes). We check for ~900KB to be safe with headers.
    if (payloadStr.length > 900000) {`;

const replacement1 = `const payloadStr = JSON.stringify(payload);
    // NGINX limit is usually 1MB (1,048,576 bytes). We check for ~900KB to be safe with headers.
    // ALSO check for 4.5MB Vercel limit just in case
    if (payloadStr.length > 500000) { // STRICTER LIMIT FOR VERCEL
      setBrandingFeedback({
        type: 'error',
        message: 'تعذر الحفظ: حجم الصور يتجاوز الحد المسموح. يرجى مسح الصور الحالية ورفع صور أصغر أو استخدام رابط (URL).',
      });
      setSavingBranding(false);
      return;
    }
    if (payloadStr.length > 900000) {`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Patched AdminPortal to reject large payloads on frontend");
}
