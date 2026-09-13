const fs = require('fs');
let code = fs.readFileSync('src/utils/safeApi.ts', 'utf8');

code = code.replace(
  "    if (text.includes('FUNCTION_INVOCATION_FAILED') || text.includes('A server error')) {\n      return {\n        ok: false,\n        error: 'تعذر تنفيذ الطلب على الخادم السحابي (FUNCTION_INVOCATION_FAILED).',\n      };\n    }",
  "    if (text.includes('FUNCTION_INVOCATION_FAILED') || text.includes('A server error')) {\n      return {\n        ok: false,\n        error: 'خطأ من الخادم (التفاصيل: ' + text.substring(0, 150) + ')',\n      };\n    }"
);

fs.writeFileSync('src/utils/safeApi.ts', code);
