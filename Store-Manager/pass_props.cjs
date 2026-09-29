const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<NextDeliveryHero onOpen=\{/g, '<NextDeliveryHero business={business} onOpen={');
code = code.replace(/<OutletIdentity \/>/g, '<OutletIdentity business={business} />');
code = code.replace(/<DeliveryCard \/>/g, '<DeliveryCard business={business} />');

// also replace inside NewOrderPage and OrderDetailPage if needed
code = code.replace(/<ReceiptReadOnlySummary \/>/g, '<ReceiptReadOnlySummary business={business} />');
code = code.replace(/<ReceiptGoodRows \/>/g, '<ReceiptGoodRows business={business} />');

// Wait, let's just make sure everywhere ormatOrderType(business || "fresh" is used, usiness is passed down correctly.
// Let's pass it to DeliveryCard in OrdersPage:
code = code.replace(/<DeliveryCard\r?\n\s*key=\{order.id\}/g, '<DeliveryCard business={business} key={order.id}');
code = code.replace(/<DeliveryCard key=\{order.id\}/g, '<DeliveryCard business={business} key={order.id}');
code = code.replace(/<UpcomingDeliveryRow\r?\n/g, '<UpcomingDeliveryRow business={business}\n');
code = code.replace(/<UpcomingDeliveryRow delivery/g, '<UpcomingDeliveryRow business={business} delivery');

// Fix the components that use ormatOrderType(business || "fresh"... by giving them a business prop if they don't have it, or passing it from parent.
// Let's check UpcomingDeliveryRow.
code = code.replace(/function UpcomingDeliveryRow\(\{\r?\n\s*delivery,/g, 'function UpcomingDeliveryRow({\n  business = "fresh",\n  delivery,');
code = code.replace(/function UpcomingDeliveryRow\(\{\r?\n/g, 'function UpcomingDeliveryRow({ business = "fresh",\n');

fs.writeFileSync('src/App.tsx', code);
