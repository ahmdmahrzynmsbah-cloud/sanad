const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const targetDesktop = `<div className="text-gray-900 font-bold">
                                  {user.fullName || user.username}
                                </div>`;

const replacementDesktop = `<div className="text-gray-900 font-bold flex items-center gap-2">
                                  {user.fullName || user.username}
                                  {user.role === 'supervisor' && (
                                    <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                      مشرف
                                    </span>
                                  )}
                                </div>`;

code = code.replace(targetDesktop, replacementDesktop);
fs.writeFileSync('src/components/AdminPortal.tsx', code);
