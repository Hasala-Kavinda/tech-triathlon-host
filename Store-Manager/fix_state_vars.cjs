const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const orderDetailTimestamps: Record<OrderDetailState, string\[\]> = \{/, 'const orderDetailTimestamps: Record<OrderDetailState, string[]> = {\n  deferred: ["Wed · 13:46", "-", "-", "-", "-", "-"],');
code = code.replace(/const orderDetailStep: Record<OrderDetailState, number> = \{/, 'const orderDetailStep: Record<OrderDetailState, number> = {\n  deferred: 0,');
code = code.replace(/const statusKind: Record<OrderDetailState, StatusKind> = \{ deferred: "deferred",\r?\n\s*deferred: "deferred",/, 'const statusKind: Record<OrderDetailState, StatusKind> = {\n    deferred: "deferred",');

fs.writeFileSync('src/App.tsx', code);
