const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetMiddleware = `// Completely disable massive database sync middleware on Vercel to prevent any risk of OOM / FUNCTION_INVOCATION_FAILED.
app.use(async (req, res, next) => {
  // Let local dev use ensureDbSynced if needed, but skip for Vercel
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const p = req.path || '';
    if (
      req.method === 'GET' &&
      p.startsWith('/api/') &&
      !p.startsWith('/api/auth/') &&
      p !== '/api/admin/login' &&
      p !== '/api/health'
    ) {
      try {
        await ensureDbSynced();
      } catch (err) {
        console.error('ensureDbSynced error:', err);
      }
    }
  }
  next();
});`;

const replacementMiddleware = `// 5. Ensure DB synced for heavy API queries, excluding auth endpoints for instant response
app.use(async (req, res, next) => {
  const p = req.path || '';
  if (
    req.method === 'GET' &&
    p.startsWith('/api/') &&
    !p.startsWith('/api/auth/') &&
    p !== '/api/admin/login' &&
    p !== '/api/health'
  ) {
    try {
      await ensureDbSynced();
    } catch (err) {
      console.error('ensureDbSynced error:', err);
    }
  }
  next();
});`;

code = code.replace(targetMiddleware, replacementMiddleware);
fs.writeFileSync('server.ts', code);
console.log("Enabled sync for Vercel");
