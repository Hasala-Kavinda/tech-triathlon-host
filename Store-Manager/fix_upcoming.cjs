const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/function UpcomingDeliveryRow\(\{ business = "fresh",\r?\n\s*business = "fresh",\r?\n\s*delivery,\r?\n\s*onOpen,\r?\n\}\: \{\r?\n\s*delivery: UpcomingDelivery\r?\n\s*onOpen\?: \(\) => void\r?\n\}\) \{/, 'function UpcomingDeliveryRow({ business, delivery, onOpen }: { business: "fresh" | "style" | "tech", delivery: UpcomingDelivery, onOpen?: () => void }) {');

fs.writeFileSync('src/App.tsx', code);
