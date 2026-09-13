const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("  });\n});\n\n// Auto-Approve ALL Pending Users at once\n  } catch (err: any) { next(err); }\napp.post('/api/admin/users/auto-approve-all'", "  });\n  } catch (err: any) { next(err); }\n});\n\n// Auto-Approve ALL Pending Users at once\napp.post('/api/admin/users/auto-approve-all'");

fs.writeFileSync('server.ts', code);
