const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const target = `    if (payloadStr.length > 500000) {
      setBrandingFeedback({
        type: 'error',
        message: 'حجم الصورة المرفوعة ضخم جداً. يرجى مسح الصورة ورفع صورة بحجم أصغر، أو استخدم رابط للصورة (URL) بدلاً من ذلك.',
      });
      setSavingBranding(false);
      return;
    }
      setBrandingFeedback({
        type: 'error',
        message: 'تعذر الحفظ: إجمالي حجم الصور والنصوص يتجاوز 1 ميغابايت. يرجى اختيار صور أصغر حجماً (أو مسح الصور الحالية ورفعها من جديد).',
      });
      setSavingBranding(false);
      return;
    }`;

const replacement = `    if (payloadStr.length > 500000) {
      setBrandingFeedback({
        type: 'error',
        message: 'حجم الصورة المرفوعة ضخم جداً. يرجى مسح الصورة ورفع صورة بحجم أصغر، أو استخدم رابط للصورة (URL) بدلاً من ذلك.',
      });
      setSavingBranding(false);
      return;
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/AdminPortal.tsx', code);
    console.log("Fixed the syntax error by removing the orphaned bracket block");
} else {
    console.log("Could not find target to fix");
}
