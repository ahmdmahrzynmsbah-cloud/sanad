const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("app.post('/api/admin/settings/branding', async (req, res) => {\n  try {", "app.post('/api/admin/settings/branding', async (req, res) => {");
fs.writeFileSync('server.ts', code);
