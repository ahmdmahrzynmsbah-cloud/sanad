const fs = require('fs');

// Fix server.ts StoredUser
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(`  role: 'user' | 'admin';`, `  role: 'user' | 'admin' | 'supervisor';`);
serverCode = serverCode.replace(`err instanceof SyntaxError && err.status === 400`, `err instanceof SyntaxError && (err as any).status === 400`);
fs.writeFileSync('server.ts', serverCode);

// Fix server/firestore.ts StoredUser
let firestoreCode = fs.readFileSync('server/firestore.ts', 'utf8');
firestoreCode = firestoreCode.replace(`  role: 'user' | 'admin';`, `  role: 'user' | 'admin' | 'supervisor';`);
fs.writeFileSync('server/firestore.ts', firestoreCode);

console.log("Fixed TS errors");
