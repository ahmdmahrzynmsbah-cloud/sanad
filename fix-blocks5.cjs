const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("  });\n});\n\n  } catch (err: any) { next(err); }\napp.put('/api/admin/related-sites/:id", "  });\n  } catch (err: any) { next(err); }\n});\napp.put('/api/admin/related-sites/:id");

code = code.replace("  });\n});\n\n  } catch (err: any) { next(err); }\napp.put('/api/admin/partners/:id", "  });\n  } catch (err: any) { next(err); }\n});\napp.put('/api/admin/partners/:id");

code = code.replace("  });\n});\n\n// Approve ALL pending users\n\n  } catch (err: any) { next(err); }\napp.post('/api/admin/users/auto-approve-all", "  });\n  } catch (err: any) { next(err); }\n});\n\n// Approve ALL pending users\napp.post('/api/admin/users/auto-approve-all");

fs.writeFileSync('server.ts', code);
