const fs = require('fs');
let code = fs.readFileSync('src/components/ChatPortal.tsx', 'utf8');

// Blockquote
code = code.replace(
  'className="border-r-4 border-emerald-800 pr-3 my-2 text-zinc-600 italic bg-zinc-50 py-1 rounded-l"',
  'className="border-r-4 border-emerald-800 pr-3 my-2 text-zinc-400 italic bg-zinc-800 py-1 rounded-l"'
);

// Input Area
code = code.replace(
  'className="bg-white border border-zinc-200/80 rounded-2xl p-1.5 shadow-2xs shrink-0"',
  'className="bg-[#09090b] border border-zinc-800 rounded-2xl p-1.5 shadow-2xs shrink-0"'
);
code = code.replace(
  'className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 bg-transparent focus:outline-none placeholder-zinc-400"',
  'className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 bg-transparent focus:outline-none placeholder-zinc-600"'
);

// Top Status Bar
code = code.replace(
  'className="bg-white border border-zinc-200/80 rounded-2xl px-2.5 sm:px-3.5 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs shrink-0"',
  'className="bg-[#09090b] border border-zinc-800 rounded-2xl px-2.5 sm:px-3.5 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs shrink-0"'
);
code = code.replace(
  'className="flex items-center gap-1.5 sm:gap-2 text-zinc-700 flex-wrap"',
  'className="flex items-center gap-1.5 sm:gap-2 text-zinc-300 flex-wrap"'
);
code = code.replace(
  'className="font-semibold text-zinc-800"',
  'className="font-semibold text-zinc-300"'
);
code = code.replace(
  'className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg border border-zinc-200 font-medium text-[11px]"',
  'className="bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-700 font-medium text-[11px]"'
);
code = code.replace(
  'className="lg:hidden p-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs shrink-0 min-h-[36px]"',
  'className="lg:hidden p-1.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs shrink-0 min-h-[36px]"'
);

fs.writeFileSync('src/components/ChatPortal.tsx', code);
console.log("Made input and top bar dark.");
