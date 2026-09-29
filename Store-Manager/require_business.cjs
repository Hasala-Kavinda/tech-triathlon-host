const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const components = [
  'TopBar', 'HomePage', 'OrdersPage', 'DeliveriesPage', 'NewOrderPage', 'ReviewOrderPage', 'OrderConfirmationPage',
  'OrderDetailPage', 'ReceiptFlowPage', 'MobileOrderSummarySheet', 'DesktopOrderSummary', 'DeliveryCard', 'UpcomingCard', 'RecentReceiptCard'
];

components.forEach(c => {
  const regex = new RegExp(`function ${c}\\(\\{([^}]*?)business(?: = "fresh")?,([\\s\\S]*?)\\}: \\{([^}]*?)business\\?: "fresh" \\| "style" \\| "tech"`, 'g');
  code = code.replace(regex, (match, p1, p2, p3) => {
    return `function ${c}({${p1}business,${p2}}: {${p3}business: "fresh" | "style" | "tech"`;
  });
});

fs.writeFileSync('src/App.tsx', code);
