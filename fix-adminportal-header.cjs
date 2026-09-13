const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

code = code.replace(
  `<h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            بوابة إدارة النظام المركزية
            <span className="bg-[#12281e] text-[#d4af37] text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ml-2 shadow-xs">
              النسخة السحابية المحدثة
            </span>
          </h2>`,
  `<h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            {isSupervisor ? 'بوابة المشرف' : 'بوابة إدارة النظام المركزية'}
            <span className="bg-[#12281e] text-[#d4af37] text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ml-2 shadow-xs">
              النسخة السحابية المحدثة
            </span>
          </h2>`
);

code = code.replace(
  `<p className="text-xs sm:text-sm text-gray-500 font-medium max-w-2xl mt-1">
            مرحباً بك في لوحة التحكم المركزية. يمكنك هنا إدارة طلبات التسجيل، تحديث الاشتراكات، مراجعة وتدقيق القوانين التشريعية، وتخصيص هوية النظام بالكامل من مكان واحد.
          </p>`,
  `<p className="text-xs sm:text-sm text-gray-500 font-medium max-w-2xl mt-1">
            {isSupervisor 
              ? \`مرحباً بك يا \${currentAdmin?.fullName || 'مشرف'}. يمكنك هنا إدارة طلبات التسجيل، تحديث الاشتراكات، ومراجعة وتدقيق القوانين التشريعية.\`
              : 'مرحباً بك في لوحة التحكم المركزية. يمكنك هنا إدارة طلبات التسجيل، تحديث الاشتراكات، مراجعة وتدقيق القوانين التشريعية، وتخصيص هوية النظام بالكامل من مكان واحد.'}
          </p>`
);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
console.log("Fixed AdminPortal headers for supervisors");
