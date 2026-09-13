const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `app.post('/api/admin/supervisors', async (req, res) => {
  const { name, title, bio, photoUrl, email, phone, department, order } = req.body;
  if (!name || !String(name).trim() || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'اسم المشرف وصفته الرسمية مطلوبان' });
  }

  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }

  const newSupervisor: StoredSupervisor = {
    id: \`sup-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
    name: String(name).trim(),
    title: String(title).trim(),
    bio: String(bio || '').trim(),
    photoUrl: String(photoUrl || '').trim(),
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    department: String(department || '').trim(),
    order: Number(order) || (db.supervisors.length + 1),
    createdAt: new Date().toISOString(),
  };

  db.supervisors.push(newSupervisor);
  saveDB();
  await saveSupervisorToFirestore(newSupervisor);`;

const replacement1 = `app.post('/api/admin/supervisors', async (req, res) => {
  const { name, title, bio, photoUrl, phone, department, order } = req.body;
  if (!name || !String(name).trim() || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'اسم المشرف وصفته الرسمية مطلوبان' });
  }

  if (!db.supervisors) {
    db.supervisors = [...DEFAULT_SUPERVISORS];
  }
  
  if (!db.users) {
    db.users = [];
  }

  // Auto generate system email containing "sanadtax" and a default password
  const uniqueSuffix = Math.random().toString(36).substr(2, 4);
  const generatedEmail = \`sup_\${uniqueSuffix}@sanadtax.com\`;
  const generatedPassword = 'sanadtax' + uniqueSuffix;

  const newSupervisor: StoredSupervisor = {
    id: \`sup-\${Date.now()}-\${uniqueSuffix}\`,
    name: String(name).trim(),
    title: String(title).trim(),
    bio: String(bio || '').trim(),
    photoUrl: String(photoUrl || '').trim(),
    email: generatedEmail, // assigned automatically
    phone: String(phone || '').trim(),
    department: String(department || '').trim(),
    order: Number(order) || (db.supervisors.length + 1),
    createdAt: new Date().toISOString(),
  };
  
  // Create an auth user for this supervisor
  const newSupervisorUser = {
    id: \`usr-\${Date.now()}-\${uniqueSuffix}\`,
    username: generatedEmail,
    password: generatedPassword,
    fullName: String(name).trim(),
    role: 'supervisor' as any, // Cast to any to bypass type check for new role
    status: 'approved' as any,
    createdAt: new Date().toISOString(),
    isSubscribed: true
  };

  db.supervisors.push(newSupervisor);
  db.users.push(newSupervisorUser);
  saveDB();
  
  await saveSupervisorToFirestore(newSupervisor);
  await saveUserToFirestore(newSupervisorUser);`;

code = code.replace(target1, replacement1);
fs.writeFileSync('server.ts', code);
console.log("Updated supervisor creation");
