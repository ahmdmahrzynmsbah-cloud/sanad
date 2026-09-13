const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const targetUserCard = `<h4 className="font-bold text-gray-900 text-sm">{user.fullName || user.username}</h4>`;
const replacementUserCard = `<h4 className="font-bold text-gray-900 text-sm">
  {user.fullName || user.username}
  {user.role === 'supervisor' && (
    <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded ml-2 font-bold">
      طلب إشراف
    </span>
  )}
</h4>`;

code = code.replace(targetUserCard, replacementUserCard);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
