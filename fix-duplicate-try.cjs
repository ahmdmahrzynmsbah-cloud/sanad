const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /async \(req, res, next\) => \{\n  try \{\n  try \{/g;
code = code.replace(regex, 'async (req, res, next) => {\n  try {');

fs.writeFileSync('server.ts', code);
console.log("Fixed duplicate try blocks");
