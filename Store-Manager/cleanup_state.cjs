const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \[deferredOrderState, setDeferredOrderState\] =[\s\S]*?\);\r?\n/m, '');
code = code.replace(/type DeferredOrderState = "deferred" \| "rescheduled"\r?\n/m, '');

fs.writeFileSync('src/App.tsx', code);
