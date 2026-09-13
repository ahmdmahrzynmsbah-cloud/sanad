const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

// Hide supervisors tab
code = code.replace(
  `<button
          id="admin-tab-supervisors"`,
  `{!isSupervisor && (
        <button
          id="admin-tab-supervisors"`
);
code = code.replace(
  `          هيئة المشرفين
        </button>`,
  `          هيئة المشرفين
        </button>
        )}`
);

// Hide related-sites tab
code = code.replace(
  `<button
          id="admin-tab-related-sites"`,
  `{!isSupervisor && (
        <button
          id="admin-tab-related-sites"`
);
code = code.replace(
  `          مواقع ذات صلة
        </button>`,
  `          مواقع ذات صلة
        </button>
        )}`
);

// Hide partners tab
code = code.replace(
  `<button
          id="admin-tab-partners"`,
  `{!isSupervisor && (
        <button
          id="admin-tab-partners"`
);
code = code.replace(
  `          شركاؤنا
        </button>`,
  `          شركاؤنا
        </button>
        )}`
);

// Hide about tab
code = code.replace(
  `<button
          id="admin-tab-about"`,
  `{!isSupervisor && (
        <button
          id="admin-tab-about"`
);
code = code.replace(
  `          عن المنصة (الرؤية والرسالة)
        </button>`,
  `          عن المنصة (الرؤية والرسالة)
        </button>
        )}`
);

// Hide contact tab
code = code.replace(
  `<button
          id="admin-tab-contact"`,
  `{!isSupervisor && (
        <button
          id="admin-tab-contact"`
);
code = code.replace(
  `          بيانات التواصل (اتصل بنا)
        </button>`,
  `          بيانات التواصل (اتصل بنا)
        </button>
        )}`
);

// Hide settings tab
code = code.replace(
  `<button
          id="admin-tab-settings"`,
  `{!isSupervisor && (
        <button
          id="admin-tab-settings"`
);
code = code.replace(
  `          إعدادات المنظومة
        </button>`,
  `          إعدادات المنظومة
        </button>
        )}`
);


fs.writeFileSync('src/components/AdminPortal.tsx', code);
console.log("Hid restricted tabs for supervisors");
