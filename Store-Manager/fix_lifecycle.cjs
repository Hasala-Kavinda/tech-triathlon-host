const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/function OrderDetailLifecycle\(\{ state \}: \{ state: OrderDetailState \}\) \{/g, 'function OrderDetailLifecycle({ state, wasDeferred }: { state: OrderDetailState, wasDeferred: boolean }) {');

const logic = `
  const stages = wasDeferred ? [
    "Order confirmed",
    "Deferred",
    "Scheduled",
    "On the way",
    "Arrived",
    "Receipt confirmation",
  ] : [
    "Order confirmed",
    "Scheduled",
    "On the way",
    "Arrived",
    "Receipt confirmation",
  ];

  let currentStep = 0;
  if (state === "confirmed") currentStep = 0;
  else if (state === "deferred") currentStep = 1;
  else if (state === "scheduled") currentStep = wasDeferred ? 2 : 1;
  else if (state === "on-way") currentStep = wasDeferred ? 3 : 2;
  else if (state === "arrived") currentStep = wasDeferred ? 4 : 3;
  else currentStep = wasDeferred ? 5 : 4;

  const receiptComplete = state === "receipt-confirmed" || state === "receipt-issue";
  
  const timestamps = stages.map((s, i) => {
    if (i > currentStep && !receiptComplete) return "-";
    if (s === "Order confirmed") return "Wed · 13:46";
    if (s === "Deferred") return "Wed · 16:42";
    if (s === "Scheduled") return "Wed · 16:35";
    if (s === "On the way") return "Thu · 05:48";
    if (s === "Arrived") return "Thu · 06:43";
    if (s === "Receipt confirmation") {
      if (state === "receipt-confirmed") return "Thu · 06:57";
      if (state === "receipt-issue") return "Thu · 06:59";
      if (state === "awaiting-confirmation") return "Current";
      return "-";
    }
    return "-";
  });
`;

code = code.replace(/const currentStep = orderDetailStep\[state\]\r?\n\s*const timestamps = orderDetailTimestamps\[state\]\r?\n\s*const receiptComplete =\r?\n\s*state === "receipt-confirmed" \|\| state === "receipt-issue"/, logic);

code = code.replace(/orderDetailStages\.map/g, 'stages.map');

fs.writeFileSync('src/App.tsx', code);
