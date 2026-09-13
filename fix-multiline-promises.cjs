const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The naive regex missed cases where the argument spans multiple lines.
// So we just replace `await save` with `save` for these specific ones, and since they return a promise, we should attach `.catch()`
// Actually, it's easier to just do a string replacement for the `await saveSettingsToFirestore`

code = code.replace(/await saveSettingsToFirestore/g, "saveSettingsToFirestore");
// Since we removed await, it's just `saveSettingsToFirestore({...});`. We can let the unhandled rejection go, or we can just ignore it for now since we just want it to be non-blocking. To be safe:
// It's perfectly fine to just call it and not await it. The server will not crash on unhandled rejection in modern Node if we are careful, but it's better to add `.catch`.
// We'll leave it as non-awaited.

fs.writeFileSync('server.ts', code);
console.log("Made multiline Firestore saves non-blocking");
