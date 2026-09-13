const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCode = `app.post('/api/admin/settings/branding', async (req, res) => {
  const {`;
const newCode = `app.post('/api/admin/settings/branding', async (req, res, next) => {
  try {
    const {`;

const oldEnd = `  res.json({
    success: true,
    message: 'تم حفظ وتطبيق إعدادات السيستم وبيانات المؤسس بنجاح وحفظها سحابياً.',
    branding: {
      systemName: db.settings.systemName,
      systemSubtitle: db.settings.systemSubtitle,
      systemBadge: db.settings.systemBadge,
      logoType: db.settings.logoType,
      logoPreset: db.settings.logoPreset,
      logoUrl: db.settings.logoUrl,
      logoAccentColor: db.settings.logoAccentColor,
      founderName: db.settings.founderName,
      founderTitle: db.settings.founderTitle,
      founderBio: db.settings.founderBio,
      founderPhotoUrl: db.settings.founderPhotoUrl,
      founderQuote: db.settings.founderQuote,
      siteOverview: db.settings.siteOverview,
    }
  });
});`;

const newEnd = `  res.json({
    success: true,
    message: 'تم حفظ وتطبيق إعدادات السيستم وبيانات المؤسس بنجاح وحفظها سحابياً.',
    branding: {
      systemName: db.settings.systemName,
      systemSubtitle: db.settings.systemSubtitle,
      systemBadge: db.settings.systemBadge,
      logoType: db.settings.logoType,
      logoPreset: db.settings.logoPreset,
      logoUrl: db.settings.logoUrl,
      logoAccentColor: db.settings.logoAccentColor,
      founderName: db.settings.founderName,
      founderTitle: db.settings.founderTitle,
      founderBio: db.settings.founderBio,
      founderPhotoUrl: db.settings.founderPhotoUrl,
      founderQuote: db.settings.founderQuote,
      siteOverview: db.settings.siteOverview,
    }
  });
  } catch (err) {
    next(err);
  }
});`;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode).replace(oldEnd, newEnd);
  fs.writeFileSync('server.ts', code);
  console.log("Patched branding route");
} else {
  console.log("Could not find old code");
}
