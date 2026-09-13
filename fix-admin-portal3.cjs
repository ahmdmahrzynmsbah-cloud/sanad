const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target1 = `    if (payloadStr.length > 500000) { // STRICTER LIMIT FOR VERCEL
      setBrandingFeedback({
        type: 'error',
        message: 'حجم الصور المرفوعة يتجاوز الحد المسموح (نصف ميغا). يرجى مسح الصور ورفع حجم أصغر، أو استخدام رابط بدلاً من الرفع المباشر.',
      });
      setSavingBranding(false);
      return;
    }
    if (payloadStr.length > 900000) {`;

const replacement1 = `    // VERCEL STRICT PAYLOAD LIMIT CHECK
    // If the combined size of the images and text is too large, it will crash Vercel.
    // 500,000 bytes is a safe limit to prevent FUNCTION_INVOCATION_FAILED.
    if (payloadStr.length > 500000) {
      setBrandingFeedback({
        type: 'error',
        message: 'حجم الصورة المرفوعة ضخم جداً. يرجى مسح الصورة ورفع صورة بحجم أصغر، أو استخدم رابط للصورة (URL) بدلاً من ذلك.',
      });
      setSavingBranding(false);
      return;
    }`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Patched AdminPortal to reject large payloads on frontend - updated message again");
} else {
    console.log("Could not find target1 in AdminPortal.tsx");
}
