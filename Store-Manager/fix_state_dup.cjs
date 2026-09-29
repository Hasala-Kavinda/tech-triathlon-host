const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/  const \[deferredOrderState, setOrderDetailState\] =\r?\n\s*useState<OrderDetailState>\(\r?\n\s*prototypeState === "rescheduled" \? "rescheduled" : "deferred",\r?\n\s*\)/, '');

fs.writeFileSync('src/App.tsx', code);
