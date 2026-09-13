const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/\}\);\n  \} catch \(err: any\) \{ next\(err\); \}/g, "  } catch (err: any) { next(err); }\n});");
// and for cases where there's a comment between them
code = code.replace(/\}\);\n\n\/\/ Update auto-approve setting\n  \} catch \(err: any\) \{ next\(err\); \}/g, "  } catch (err: any) { next(err); }\n});\n\n// Update auto-approve setting");

code = code.replace(/\}\);\n\n\/\/ Approve ALL pending users\n  \} catch \(err: any\) \{ next\(err\); \}/g, "  } catch (err: any) { next(err); }\n});\n\n// Approve ALL pending users");


fs.writeFileSync('server.ts', code);
