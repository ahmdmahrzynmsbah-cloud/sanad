const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add global error handler at the end of API routes, before Vite middleware
const errorHandler = `
// Global error handler
app.use((err, req, res, next) => {
  console.error('Express Error:', err.message);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'حجم البيانات كبير جداً أو التنسيق غير صحيح. يرجى اختيار صورة أصغر حجماً.' });
  }
  res.status(500).json({ error: 'خطأ داخلي في الخادم: ' + err.message });
});
`;

if (!code.includes('Global error handler')) {
  code = code.replace('// Vite middleware', errorHandler + '\n  // Vite middleware');
  fs.writeFileSync('server.ts', code);
  console.log('Patched server.ts');
} else {
  console.log('Already patched');
}
