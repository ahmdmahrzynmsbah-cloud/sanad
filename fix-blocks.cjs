const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/  \}\);\n\}\);\n  \} catch \(err: any\) \{ next\(err\); \}/g, "  });\n  } catch (err: any) { next(err); }\n});");

fs.writeFileSync('server.ts', code);
