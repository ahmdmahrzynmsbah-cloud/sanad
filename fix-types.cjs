const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(`  role: 'user' | 'admin';`, `  role: 'user' | 'admin' | 'supervisor';`);
fs.writeFileSync('src/types.ts', code);
