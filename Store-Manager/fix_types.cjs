const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const orderActivitySteps: Record<OrderDetailState, string\[\]> = \{/, 'const orderActivitySteps: Record<OrderDetailState, string[]> = {\n    deferred: ["Order confirmed"],');

code = code.replace(/const orderActivityActiveStep: Record<OrderDetailState, number> = \{/, 'const orderActivityActiveStep: Record<OrderDetailState, number> = {\n    deferred: 0,');

code = code.replace(/const statusKind: Record<OrderDetailState, StatusKind> = \{/, 'const statusKind: Record<OrderDetailState, StatusKind> = {\n    deferred: "deferred",');

code = code.replace(/state === "rescheduled"/g, 'state === "scheduled"');

code = code.replace(/DeferredOrderState/g, 'OrderDetailState');

fs.writeFileSync('src/App.tsx', code);
