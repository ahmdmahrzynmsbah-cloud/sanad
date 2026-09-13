const fs = require('fs');
let code = fs.readFileSync('src/utils/imageCompressor.ts', 'utf8');

code = code.replace(
  "const dataUrl = canvas.toDataURL('image/jpeg', 0.6);",
  "const dataUrl = canvas.toDataURL('image/jpeg', 0.4);"
);

fs.writeFileSync('src/utils/imageCompressor.ts', code);
