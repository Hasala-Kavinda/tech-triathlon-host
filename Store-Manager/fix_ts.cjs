const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix ConfirmationCard
code = code.replace(/<ConfirmationCard type=\{type\}/g, '<ConfirmationCard business={business} type={type}');

// Fix duplicate state declaration
code = code.replace(/const \[deferredOrderState, setOrderDetailState\] =[\s\S]*?\);\r?\n/m, '');

// Fix TopBar
code = code.replace(/<TopBar current=\{currentNav\} onNavigate=\{navigate\} afterCutoff=\{prototypeState === "after-cutoff" \|\| prototypeState === "full"\} \/>/g, '<TopBar business={business} current={currentNav} onNavigate={navigate} afterCutoff={prototypeState === "after-cutoff" || prototypeState === "full"} />');

// Fix types for OrderDetailState (my previous regex failed)
code = code.replace(/const orderActivitySteps: Record<OrderDetailState, string\[\]> = \{/, 'const orderActivitySteps: Record<OrderDetailState, string[]> = { deferred: ["Order confirmed"],');
code = code.replace(/const orderActivityActiveStep: Record<OrderDetailState, number> = \{/, 'const orderActivityActiveStep: Record<OrderDetailState, number> = { deferred: 0,');
code = code.replace(/const statusKind: Record<OrderDetailState, StatusKind> = \{/, 'const statusKind: Record<OrderDetailState, StatusKind> = { deferred: "deferred",');

fs.writeFileSync('src/App.tsx', code);
