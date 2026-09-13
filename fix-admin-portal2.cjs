const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target1 = `    if (payloadStr.length > 500000) { // STRICTER LIMIT FOR VERCEL
      setBrandingFeedback({
        type: 'error',
        message: 'تعذر الحفظ: حجم الصور يتجاوز الحد المسموح. يرجى مسح الصور الحالية ورفع صور أصغر أو استخدام رابط (URL).',
      });`;

const replacement1 = `    if (payloadStr.length > 500000) { // STRICTER LIMIT FOR VERCEL
      setBrandingFeedback({
        type: 'error',
        message: 'حجم الصور المرفوعة يتجاوز الحد المسموح (نصف ميغا). يرجى مسح الصور ورفع حجم أصغر، أو استخدام رابط بدلاً من الرفع المباشر.',
      });`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Patched AdminPortal to reject large payloads on frontend - updated message");
}
