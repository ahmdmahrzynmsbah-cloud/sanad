const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  'contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO,\n    videos: db.videos || [],',
  'contactInfo: db.contactInfo || DEFAULT_CONTACT_INFO,'
);
fs.writeFileSync('server.ts', serverCode, 'utf8');

console.log('Fixed duplicate videos');
