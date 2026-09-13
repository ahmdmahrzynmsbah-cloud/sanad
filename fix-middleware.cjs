const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetMiddleware = `app.use(async (req, res, next) => {
  const p = req.path || '';
  if (
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

const replacementMiddleware = `app.use(async (req, res, next) => {
  const p = req.path || '';
  // Only trigger massive DB sync on GET requests, avoid doing this on POST/PUT/DELETE
  // which can cause Vercel OOM crashes or maxDuration timeouts during cold starts.
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
console.log("Updated ensureDbSynced middleware correctly");
