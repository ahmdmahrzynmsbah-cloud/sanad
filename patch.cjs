const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(\`⚡ Server listening on port \${PORT} (immediate readiness)\`);
      // Non-blocking background sync with Firestore Cloud Database
      syncWithFirestore().catch((err) => {
        console.error('Background Firestore sync error:', err);
      });
    });
  }
}

startServer();

// Sync when exported (Vercel serverless environment)
if (process.env.VERCEL) {
  syncWithFirestore().catch(console.error);
}

export default app;
`;

const startIndex = code.indexOf('async function startServer() {');
if (startIndex !== -1) {
  code = code.substring(0, startIndex) + replacement;
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts successfully");
} else {
  console.log("Could not find startServer function");
}
