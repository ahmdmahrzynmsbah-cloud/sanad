const fs = require('fs');
let code = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

const targetUI = `            {/* ================= MODE 2: REGISTER FORM ================= */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Full Name */}`;

const replacementUI = `            {/* ================= MODE 2: REGISTER FORM ================= */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* Account Type (Role) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">نوع الحساب <span className="text-red-500">*</span></label>
                  <div className="flex gap-4 p-2 bg-slate-50/70 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input 
                        type="radio" 
                        className="text-emerald-600 focus:ring-emerald-500"
                        checked={requestedRole === 'user'} 
                        onChange={() => {
                          setRequestedRole('user');
                          setUsername('');
                        }} 
                      />
                      <span className="text-sm font-medium text-slate-700">مستفيد (باحث / مخلص)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input 
                        type="radio" 
                        className="text-emerald-600 focus:ring-emerald-500"
                        checked={requestedRole === 'supervisor'} 
                        onChange={() => {
                          setRequestedRole('supervisor');
                          setUsername(\`sup_\${Math.random().toString(36).substr(2, 4)}@sanadtax.com\`);
                        }} 
                      />
                      <span className="text-sm font-medium text-slate-700">مشرف نظام</span>
                    </label>
                  </div>
                </div>

                {/* Full Name */}`;

code = code.replace(targetUI, replacementUI);

const targetUsername = `                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المستخدم (للدخول) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\\s/g, ''))}
                      placeholder="مثال: ahmed123"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24] transition-all"
                      dir="ltr"
                      required
                    />`;

const replacementUsername = `                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {requestedRole === 'supervisor' ? 'البريد الإلكتروني المهني (للدخول)' : 'اسم المستخدم (للدخول)'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-username-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\\s/g, ''))}
                      placeholder={requestedRole === 'supervisor' ? 'سيتم توليد البريد تلقائياً' : 'مثال: ahmed123'}
                      className={\`w-full pl-3.5 pr-10 py-2.5 border rounded-xl text-sm transition-all \${requestedRole === 'supervisor' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2a24]/20 focus:border-[#0f2a24]'}\`}
                      dir="ltr"
                      readOnly={requestedRole === 'supervisor'}
                      disabled={requestedRole === 'supervisor'}
                      required
                    />`;

code = code.replace(targetUsername, replacementUsername);
fs.writeFileSync('src/components/AuthModal.tsx', code);
console.log("Updated UI!");
