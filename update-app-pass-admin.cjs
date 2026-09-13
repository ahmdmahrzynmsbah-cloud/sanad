const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<AdminPortal
                onLawsUpdated={fetchLawsCount}
                onBrandingUpdated={(newBranding) => {`;
const replacement = `<AdminPortal
                currentAdmin={currentAdmin}
                onLawsUpdated={fetchLawsCount}
                onBrandingUpdated={(newBranding) => {`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Passed currentAdmin to AdminPortal in App.tsx");
} else {
  console.log("Could not find AdminPortal usage in App.tsx");
}
