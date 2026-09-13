const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target2 = `  res.status(201).json({
    success: true,
    message: \`تمت إضافة المشرف "\${newSupervisor.name}" بنجاح\`,
    supervisor: newSupervisor,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0)),
  });`;

const replacement2 = `  res.status(201).json({
    success: true,
    message: \`تمت إضافة المشرف "\${newSupervisor.name}" بنجاح. كلمة المرور الافتراضية: \${generatedPassword}\`,
    supervisor: newSupervisor,
    generatedPassword: generatedPassword,
    supervisors: db.supervisors.sort((a, b) => (a.order || 0) - (b.order || 0)),
  });`;

if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  fs.writeFileSync('server.ts', code);
  console.log("Updated supervisor response");
} else {
  console.log("Could not find target2");
}
