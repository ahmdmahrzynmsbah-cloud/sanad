const fs = require('fs');
let code = fs.readFileSync('src/components/ChatPortal.tsx', 'utf8');

code = code.replace(
  'className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1"',
  'className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1"'
);

code = code.replace(
  'className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"',
  'className="bg-amber-900/30 text-amber-300 border border-amber-800/50 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"'
);

fs.writeFileSync('src/components/ChatPortal.tsx', code);
console.log("Fixed topbar badges");
