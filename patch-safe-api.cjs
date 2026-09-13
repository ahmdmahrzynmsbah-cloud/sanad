const fs = require('fs');
let code = fs.readFileSync('src/utils/safeApi.ts', 'utf8');

code = code.replace(
  "error: 'تعذر تنفيذ الطلب على الخادم السحابي (FUNCTION_INVOCATION_FAILED).',",
  "error: 'تعذر تنفيذ الطلب (تفاصيل: ' + text.substring(0, 100) + ')',"
);

fs.writeFileSync('src/utils/safeApi.ts', code);
