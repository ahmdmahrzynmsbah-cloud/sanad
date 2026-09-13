const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Reset About
code = code.replace(
  `app.post('/api/admin/settings/about/reset', async (req, res) => {
  db.platformAbout`,
  `app.post('/api/admin/settings/about/reset', async (req, res, next) => {
  try {
  db.platformAbout`
);
code = code.replace(
  `    message: 'تم استعادة المحتوى الافتراضي لـ «عن المنصة والرؤية والرسالة» بنجاح.',
    platformAbout: db.platformAbout,
  });
});`,
  `    message: 'تم استعادة المحتوى الافتراضي لـ «عن المنصة والرؤية والرسالة» بنجاح.',
    platformAbout: db.platformAbout,
  });
  } catch (err: any) {
    next(err);
  }
});`
);

// Contact
code = code.replace(
  `app.post('/api/admin/settings/contact', async (req, res) => {
  const {`,
  `app.post('/api/admin/settings/contact', async (req, res, next) => {
  try {
  const {`
);
code = code.replace(
  `    message: 'تم حفظ وتحديث بيانات التواصل بنجاح.',
    contactInfo: updatedContact,
  });
});`,
  `    message: 'تم حفظ وتحديث بيانات التواصل بنجاح.',
    contactInfo: updatedContact,
  });
  } catch (err: any) {
    next(err);
  }
});`
);

fs.writeFileSync('server.ts', code);
console.log("Wrapped reset and contact in try-catch");
