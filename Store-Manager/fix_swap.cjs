const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix swap of warning block and OrderDetailHero
const warningBlockRegex = /\{state === "deferred" && \(\s*<motion\.div className="delivery-update-card"[\s\S]*?<\/motion\.div>\s*\)\}/;
const warningBlockMatch = code.match(warningBlockRegex);
if (warningBlockMatch) {
  const warningBlock = warningBlockMatch[0];
  code = code.replace(warningBlockRegex, '');
  code = code.replace(/<OrderDetailHero state=\{state\} onReviewDelivery=\{onReviewDelivery\} onConfirmArrived=\{\(\) => onStateChange\("awaiting-confirmation"\)\} \/>/, '<OrderDetailHero state={state} onReviewDelivery={onReviewDelivery} onConfirmArrived={() => onStateChange("awaiting-confirmation")} />\n\n' + warningBlock);
}

// Fix TS errors inside MobileShellPreview and FoundationsPage
code = code.replace(/function MobileShellPreview\(\) \{[\s\S]*?<DeliveryCard business=\{business\} \/>/m, (match) => {
  return match.replace(/business=\{business\}/, 'business="fresh"');
});
code = code.replace(/function FoundationsPage\(\) \{[\s\S]*?<DeliveryCard business=\{business\} \/>/m, (match) => {
  return match.replace(/business=\{business\}/, 'business="fresh"');
});

fs.writeFileSync('src/App.tsx', code);
