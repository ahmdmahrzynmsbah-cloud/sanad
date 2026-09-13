const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

function closeTry(beforeLine) {
  code = code.replace(`\n${beforeLine}`, `\n  } catch (err: any) { next(err); }\n${beforeLine}`);
}

closeTry(`app.put('/api/admin/related-sites/:id'`);
closeTry(`app.put('/api/admin/partners/:id'`);
closeTry(`app.post('/api/admin/settings/auto-approve'`);
closeTry(`app.post('/api/admin/users/auto-approve-all'`);

fs.writeFileSync('server.ts', code);
console.log("Closed try-catch blocks");
