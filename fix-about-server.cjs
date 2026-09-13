const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetPost = `app.post('/api/admin/settings/about', async (req, res) => {
  const {`;

const replacementPost = `app.post('/api/admin/settings/about', async (req, res, next) => {
  try {
  const {`;

const targetPostEnd = `  res.json({
    success: true,
    message: 'تم حفظ وتحديث محتوى «عن المنصة والرؤية والرسالة» بنجاح في قاعدة البيانات السحابية.',
    platformAbout: updatedAbout,
  });
});`;

const replacementPostEnd = `  res.json({
    success: true,
    message: 'تم حفظ وتحديث محتوى «عن المنصة والرؤية والرسالة» بنجاح في قاعدة البيانات السحابية.',
    platformAbout: updatedAbout,
  });
  } catch (err: any) {
    console.error('About update error:', err);
    res.status(500).json({ error: 'خطأ داخلي في الخادم أثناء حفظ بيانات عن المنصة: ' + err.message });
  }
});`;

code = code.replace(targetPost, replacementPost);
code = code.replace(targetPostEnd, replacementPostEnd);

fs.writeFileSync('server.ts', code);
console.log("Wrapped /api/admin/settings/about in try-catch");
