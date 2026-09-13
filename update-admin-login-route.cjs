const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  if (
    username.trim() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    return res.json({
      message: 'تم تسجيل دخول المسؤول بنجاح',
      admin: {
        username: ADMIN_CREDENTIALS.username,
        role: 'admin',
      },
    });
  }

  return res.status(401).json({ error: 'بيانات اعتماد المسؤول غير صحيحة' });
});`;

const replacement = `app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  // Check main admin
  if (
    username.trim() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  ) {
    return res.json({
      message: 'تم تسجيل دخول المسؤول بنجاح',
      admin: {
        username: ADMIN_CREDENTIALS.username,
        role: 'admin',
      },
    });
  }

  // Check supervisors
  if (db.users) {
    const supervisor = db.users.find(u => 
      u.role === 'supervisor' && 
      u.username.toLowerCase() === username.trim().toLowerCase() && 
      u.password === password
    );
    if (supervisor) {
      return res.json({
        message: 'تم تسجيل دخول المشرف بنجاح',
        admin: {
          username: supervisor.username,
          role: 'supervisor',
          fullName: supervisor.fullName
        },
      });
    }
  }

  return res.status(401).json({ error: 'بيانات اعتماد المسؤول أو المشرف غير صحيحة' });
});`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
console.log("Updated /api/admin/login");
