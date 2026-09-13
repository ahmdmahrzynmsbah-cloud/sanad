const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  const handleUserLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pal_tax_user', JSON.stringify(user));
    if (user.status === 'approved') {
      setActiveView('chat');
    } else {
      setActiveView('auth');
    }
  };`;

const replacement = `  const handleUserLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pal_tax_user', JSON.stringify(user));
    
    if (user.status === 'approved') {
      if (user.role === 'supervisor') {
        const adminData = { username: user.username, role: 'supervisor', fullName: user.fullName };
        setCurrentAdmin(adminData);
        localStorage.setItem('pal_tax_admin', JSON.stringify(adminData));
        setActiveView('admin-portal');
      } else {
        setActiveView('chat');
      }
    } else {
      setActiveView('auth');
    }
  };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
