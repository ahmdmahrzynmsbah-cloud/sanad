const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `const { username, password, fullName, phone, recoveryCode } = req.body || {};`;
const replacement = `const { username, password, fullName, phone, recoveryCode, role } = req.body || {};`;
code = code.replace(target, replacement);

const targetUser = `const newUser: StoredUser = {
      id: \`usr-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
      username: trimmedUsername,
      password: String(password),
      fullName: trimmedFullName,
      phone: trimmedPhone,
      recoveryCode: trimmedRecoveryCode,
      role: 'user',
      status,`;

const replacementUser = `const newUser: StoredUser = {
      id: \`usr-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
      username: trimmedUsername,
      password: String(password),
      fullName: trimmedFullName,
      phone: trimmedPhone,
      recoveryCode: trimmedRecoveryCode,
      role: role === 'supervisor' ? 'supervisor' : 'user',
      status: role === 'supervisor' ? 'pending' : status, // Supervisors always require approval initially`;

code = code.replace(targetUser, replacementUser);

fs.writeFileSync('server.ts', code);
