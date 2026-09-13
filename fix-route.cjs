const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    if (payloadStr.length > 500000) { // STRICTER LIMIT FOR VERCEL`;
const replacement = `    // Server side safety check to strictly prevent crashes
    if (JSON.stringify(req.body).length > 500000) {
      return res.status(400).json({ error: 'حجم البيانات يتجاوز الحد المسموح (500KB) يرجى تقليل حجم الصور' });
    }
    if (payloadStr.length > 500000) { // STRICTER LIMIT FOR VERCEL`;

if (!code.includes('500000) {')) {
   console.log("Adding protection to server.ts");
   code = code.replace(`app.post('/api/admin/settings/branding', async (req, res) => {`, `app.post('/api/admin/settings/branding', async (req, res) => {
    if (JSON.stringify(req.body).length > 500000) {
      return res.status(400).json({ error: 'حجم البيانات يتجاوز الحد المسموح (500KB) يرجى تقليل حجم الصور' });
    }`);
   fs.writeFileSync('server.ts', code);
}
