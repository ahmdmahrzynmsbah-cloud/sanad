const fs = require('fs');
let code = fs.readFileSync('src/components/admin/SupervisorsAdminTab.tsx', 'utf8');

const target = `      setFeedback({
        type: 'success',
        message: editingSupervisor
          ? \`تم تحديث بيانات المشرف "\${name}" بنجاح.\`
          : \`تمت إضافة المشرف "\${name}" بنجاح.\`,
      });`;

const replacement = `      setFeedback({
        type: 'success',
        message: data.message || (editingSupervisor
          ? \`تم تحديث بيانات المشرف "\${name}" بنجاح.\`
          : \`تمت إضافة المشرف "\${name}" بنجاح.\`),
      });`;

code = code.replace(target, replacement);

// And we shouldn't ask for email manually since the system auto-generates it now, but we can leave it as optional or read-only, or just remove it from the form.
// Actually, let's just make it clear in the UI that the email is generated automatically and they use it to login.
const targetForm = `<label className="block text-xs font-bold text-gray-700 mb-1.5">
                    البريد الإلكتروني المهني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder="supervisor@sanadtax.com"
                    />
                  </div>
                </div>`;

const replacementForm = `<label className="block text-xs font-bold text-gray-700 mb-1.5">
                    البريد الإلكتروني للمشرف (يولد تلقائياً لتسجيل الدخول)
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      disabled
                      className="w-full pr-9 pl-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                      placeholder="سيقوم النظام بإنشاء بريد @sanadtax.com تلقائياً"
                    />
                  </div>
                </div>`;

code = code.replace(targetForm, replacementForm);

fs.writeFileSync('src/components/admin/SupervisorsAdminTab.tsx', code);
console.log("Updated supervisor tab UI");
