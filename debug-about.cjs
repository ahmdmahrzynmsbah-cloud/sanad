const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AboutPlatformAdminTab.tsx', 'utf8');

if (!code.includes("import { safeFetchJson } from '../../utils/safeApi';")) {
  code = code.replace(`import React, { useState, useEffect } from 'react';`, `import React, { useState, useEffect } from 'react';\nimport { safeFetchJson } from '../../utils/safeApi';`);
}

const targetFetch = `      const res = await fetch('/api/admin/settings/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {`;

const replacementFetch = `      const res = await fetch('/api/admin/settings/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed = await safeFetchJson(res);
      
      if (!parsed.ok) {
        setFeedback({ type: 'error', message: parsed.error || 'خطأ غير معروف' });
        setSaving(false);
        return;
      }
      
      const data = parsed.data;

      if (data.success) {`;

code = code.replace(targetFetch, replacementFetch);
fs.writeFileSync('src/components/admin/AboutPlatformAdminTab.tsx', code);
console.log("Updated AboutPlatformAdminTab with safeFetchJson");
