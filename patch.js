const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "app.post('/api/admin/settings/branding', async (req, res) => {",
  "app.post('/api/admin/settings/branding', async (req, res) => {\n  try {"
);

code = code.replace(
  "    branding: {\n      ...db.settings\n    }\n  });\n});",
  "    branding: {\n      ...db.settings\n    }\n  });\n  } catch (err: any) {\n    console.error('Branding route error:', err);\n    res.status(500).json({ error: 'Server crashed: ' + err?.message });\n  }\n});"
);

fs.writeFileSync('server.ts', code);
