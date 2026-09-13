const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'data', 'db.json');
if (fs.existsSync(file)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  let changed = false;
  if (data.settings) {
    if (data.settings.logoUrl && data.settings.logoUrl.length > 50000) {
      data.settings.logoUrl = '';
      data.settings.logoType = 'preset';
      changed = true;
    }
    if (data.settings.founderPhotoUrl && data.settings.founderPhotoUrl.length > 50000) {
      data.settings.founderPhotoUrl = '';
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log("Fixed db.json");
  } else {
    console.log("db.json ok");
  }
}
