const fs = require('fs');
let code = fs.readFileSync('src/utils/imageCompressor.ts', 'utf8');

const target = `const dataUrl = canvas.toDataURL('image/jpeg', 0.4);`;
const replacement = `const dataUrl = canvas.toDataURL('image/jpeg', 0.1); // EXTREME COMPRESSION TO AVOID CRASHES`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/utils/imageCompressor.ts', code);
    console.log("Updated image compressor utility to 10% quality");
}
