const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetUser = `    const newUser: StoredUser = {
      id: 'user-' + Date.now(),
      username: trimmedUsername,
      fullName: trimmedFullName,
      phone: trimmedPhone,
      recoveryCode: trimmedRecoveryCode,
      password: String(password),
      role: 'user',
      status: isAutoApprove ? 'approved' : 'pending',`;

const replacementUser = `    const newUser: StoredUser = {
      id: 'user-' + Date.now(),
      username: trimmedUsername,
      fullName: trimmedFullName,
      phone: trimmedPhone,
      recoveryCode: trimmedRecoveryCode,
      password: String(password),
      role: role === 'supervisor' ? 'supervisor' : 'user',
      status: role === 'supervisor' ? 'pending' : (isAutoApprove ? 'approved' : 'pending'),`;

code = code.replace(targetUser, replacementUser);
fs.writeFileSync('server.ts', code);
console.log("Updated server.ts register route");
