const fs = require('fs');
let code = fs.readFileSync('src/components/ChatPortal.tsx', 'utf8');

// 1. Container background
code = code.replace(
  'className="flex-1 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 touch-scroll"',
  'className="flex-1 bg-[#09090b] rounded-2xl border border-zinc-800 shadow-2xs overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 touch-scroll"'
);

// 2. Bot bubble background
code = code.replace(
  `'bg-[#fafcfb] text-zinc-900 border border-zinc-200/70 rounded-tl-xs'`,
  `'bg-[#18181b] text-zinc-200 border border-zinc-800 rounded-tl-xs'`
);

// 3. Bot Header
code = code.replace(
  'className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-100 text-[11px] text-emerald-900 font-bold"',
  'className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-800 text-[11px] text-emerald-400 font-bold"'
);
code = code.replace(
  'className="text-zinc-400 hover:text-zinc-800 p-1 rounded transition-colors"',
  'className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"'
);

// 4. Markdown classes
code = code.replace(
  'className="markdown-body space-y-2 text-zinc-800"',
  'className="markdown-body space-y-2 text-zinc-300"'
);
code = code.replace(
  'className="text-sm sm:text-base font-bold text-zinc-900 mt-2 mb-1 border-b border-zinc-100 pb-1"',
  'className="text-sm sm:text-base font-bold text-zinc-100 mt-2 mb-1 border-b border-zinc-800 pb-1"'
);
code = code.replace(
  'className="text-xs sm:text-sm font-bold text-zinc-800 mt-2 mb-1"',
  'className="text-xs sm:text-sm font-bold text-zinc-200 mt-2 mb-1"'
);
code = code.replace(
  'className="text-xs font-bold text-zinc-800 mt-1.5 mb-1"',
  'className="text-xs font-bold text-zinc-200 mt-1.5 mb-1"'
);
code = code.replace(
  'className="list-disc list-inside space-y-1 my-2 pr-1 text-zinc-700"',
  'className="list-disc list-inside space-y-1 my-2 pr-1 text-zinc-300"'
);
code = code.replace(
  'className="list-decimal list-inside space-y-1.5 my-2 pr-1 text-zinc-800 font-medium"',
  'className="list-decimal list-inside space-y-1.5 my-2 pr-1 text-zinc-300 font-medium"'
);
code = code.replace(
  'className="font-bold text-zinc-950 bg-amber-50/80 px-1 rounded"',
  'className="font-bold text-emerald-200 bg-emerald-900/30 px-1 rounded"'
);
code = code.replace(
  'className="font-bold text-emerald-800"',
  'className="font-bold text-emerald-400"'
);

fs.writeFileSync('src/components/ChatPortal.tsx', code);
console.log("Chat frame made dark!");
