const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const endpointsToWrap = [
  "app.post('/api/admin/related-sites', async (req, res) => {",
  "app.post('/api/admin/partners', async (req, res) => {",
  "app.post('/api/admin/settings/branding', async (req, res, next) => {",
  "app.post('/api/admin/settings/trial', async (req, res) => {",
  "app.post('/api/admin/settings/auto-approve', (req, res) => {"
];

for (const ep of endpointsToWrap) {
  if (code.includes(ep)) {
    let replaced = ep.replace(" (req, res) => {", " (req, res, next) => {");
    replaced = replaced.replace(" (req, res, next) => {", " (req, res, next) => {\n  try {");
    code = code.replace(ep, replaced);
  }
}

// Now we need to close the try block for each of them.
// This is trickier because we need to find the end of the handler.
// Since these handlers end with `res.json({ ... });\n});`, let's just do a manual replace for their known endings.

// related-sites post
code = code.replace(
  `    message: 'تمت إضافة الموقع بنجاح',
    site: newSite,
  });
});

// Update Related Site`,
  `    message: 'تمت إضافة الموقع بنجاح',
    site: newSite,
  });
  } catch (err: any) { next(err); }
});

// Update Related Site`
);

// partners post
code = code.replace(
  `    message: 'تمت إضافة المؤسسة/الشريك بنجاح',
    partner: newPartner,
  });
});

// Update Partner`,
  `    message: 'تمت إضافة المؤسسة/الشريك بنجاح',
    partner: newPartner,
  });
  } catch (err: any) { next(err); }
});

// Update Partner`
);

// branding
code = code.replace(
  `    message: 'تم حفظ إعدادات الهوية والبناء بنجاح',
    branding: updatedBranding,
  });
});

// Reset Branding to Default`,
  `    message: 'تم حفظ إعدادات الهوية والبناء بنجاح',
    branding: updatedBranding,
  });
  } catch (err: any) { next(err); }
});

// Reset Branding to Default`
);

// trial
code = code.replace(
  `    message: 'تم تحديث سياسة التجربة المجانية بنجاح.',
    settings: db.settings,
  });
});

// Update Auto-Approve Policy`,
  `    message: 'تم تحديث سياسة التجربة المجانية بنجاح.',
    settings: db.settings,
  });
  } catch (err: any) { next(err); }
});

// Update Auto-Approve Policy`
);

// auto-approve
code = code.replace(
  `    message: 'تم تحديث سياسة قبول المستخدمين بنجاح.',
    settings: db.settings,
  });
});

// Approve ALL pending users`,
  `    message: 'تم تحديث سياسة قبول المستخدمين بنجاح.',
    settings: db.settings,
  });
  } catch (err: any) { next(err); }
});

// Approve ALL pending users`
);

fs.writeFileSync('server.ts', code);
console.log("Wrapped related-sites, partners, and settings endpoints in try-catch");
