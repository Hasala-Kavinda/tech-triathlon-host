const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/type OrderDetailState = "confirmed" \| "scheduled" \| "on-way" \| "arrived" \| "awaiting-confirmation" \| "receipt-confirmed" \| "receipt-issue"/, 'type OrderDetailState = "confirmed" | "deferred" | "scheduled" | "on-way" | "arrived" | "awaiting-confirmation" | "receipt-confirmed" | "receipt-issue"');

code = code.replace(/const statusKind: Record<OrderDetailState, StatusKind> = \{\n\s*confirmed: "confirmed",\n\s*scheduled: "scheduled",/, 'const statusKind: Record<OrderDetailState, StatusKind> = {\n    confirmed: "confirmed",\n    deferred: "deferred",\n    scheduled: "scheduled",');

fs.writeFileSync('src/App.tsx', code);
