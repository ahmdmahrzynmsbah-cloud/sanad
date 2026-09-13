const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("  });\n});\n  } catch (err: any) { next(err); }\napp.put('/api/admin/related-sites/:id", "  });\n  } catch (err: any) { next(err); }\n});\napp.put('/api/admin/related-sites/:id");

code = code.replace("  });\n});\n  } catch (err: any) { next(err); }\napp.put('/api/admin/partners/:id", "  });\n  } catch (err: any) { next(err); }\n});\napp.put('/api/admin/partners/:id");

code = code.replace("  });\n});\n\n// Approve ALL pending users\n  } catch (err: any) { next(err); }", "  });\n  } catch (err: any) { next(err); }\n});\n\n// Approve ALL pending users");

fs.writeFileSync('server.ts', code);
