const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/function DeferredOrderPage\(\{[\s\S]*?function OrdersPage/m, 'function OrdersPage');

// Fix ORD-1065 in OrdersPage
code = code.replace(/view: "deferred-detail", state: "deferred"/g, 'view: "order-detail", state: "deferred"');

// Fix old links
code = code.replace(/setDeferredOrderState\("deferred"\)\r?\n\s*setView\("deferred-detail"\)/g, 'setOrderDetailState("deferred"); setView("order-detail")');

fs.writeFileSync('src/App.tsx', code);
